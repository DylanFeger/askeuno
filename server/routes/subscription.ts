import { Router, Request, Response } from 'express';
import express from 'express';
import Stripe from 'stripe';
import { requireAuth, requireMainUser, AuthenticatedRequest } from '../middleware/auth';
import { storage } from '../storage';
import { logger, logPaymentEvent } from '../utils/logger';

const router = Router();

// IMPORTANT: Webhook route needs raw body for signature verification
// This must be registered BEFORE express.json() middleware
router.post('/webhook', 
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    await handleStripeWebhook(req, res);
  }
);

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Subscription pricing configuration
const SUBSCRIPTION_PRICES = {
  professional: {
    monthly: 9900, // $99.00 in cents
    annual: 100900, // $1,009.00 in cents (15% off monthly)
  },
  enterprise: {
    monthly: 24900, // $249.00 in cents
    annual: 254000, // $2,540.00 in cents (15% off monthly)
  }
};

/**
 * Create or retrieve subscription for user (only for paid tiers)
 */
router.post('/get-or-create-subscription', requireAuth, requireMainUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { tier, billingCycle } = req.body;
    
    // Starter tier is free - no payment needed
    if (tier === 'starter') {
      await storage.updateUser(req.user.id, {
        subscriptionTier: 'starter',
        subscriptionStatus: 'active',
        stripeSubscriptionId: null,
        stripeCustomerId: null
      });
      return res.json({ success: true, message: 'Downgraded to free tier' });
    }
    
    if (!tier || !['professional', 'enterprise'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid subscription tier' });
    }
    
    if (!billingCycle || !['monthly', 'annual'].includes(billingCycle)) {
      return res.status(400).json({ error: 'Invalid billing cycle' });
    }

    let user = req.user;

    // Check if user already has an active subscription
    if (user.stripeSubscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      
      if (subscription.status === 'active') {
        return res.json({
          subscriptionId: subscription.id,
          clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
          status: 'active'
        });
      }
    }

    // Create or retrieve Stripe customer
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.username,
        metadata: {
          userId: user.id.toString(),
        }
      });
      
      stripeCustomerId = customer.id;
      user = await storage.updateUser(user.id, { stripeCustomerId }) || user;
    }

    // Get the price for the selected tier and billing cycle
    const priceAmount = SUBSCRIPTION_PRICES[tier as keyof typeof SUBSCRIPTION_PRICES][billingCycle as keyof typeof SUBSCRIPTION_PRICES.professional];

    // Create price object in Stripe
    const price = await stripe.prices.create({
      unit_amount: priceAmount,
      currency: 'usd',
      recurring: {
        interval: billingCycle === 'annual' ? 'year' : 'month',
      },
      product_data: {
        name: `Euno ${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan`,
      },
    });

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{
        price: price.id,
      }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: user.id.toString(),
        requestedTier: tier,
        requestedBillingCycle: billingCycle,
      }
    });

    // SECURITY: Store subscription ID but DO NOT upgrade tier until payment confirmed
    // Tier will be upgraded by webhook when payment_intent.succeeded event is received
    await storage.updateUser(user.id, {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: stripeCustomerId,
      // Keep current tier - will upgrade after payment confirmation
      subscriptionStatus: 'pending_payment',
      billingCycle: billingCycle,
    });

    // Log subscription creation (not payment - that happens in webhook)
    logPaymentEvent(user.id, 'subscription_initiated', priceAmount / 100, {
      requestedTier: tier,
      billingCycle,
      subscriptionId: subscription.id,
    });

    res.json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
      status: 'requires_payment',
      message: 'Complete payment to activate subscription'
    });
  } catch (error: any) {
    logger.error('Subscription creation error', { error, userId: req.user.id });
    res.status(500).json({ error: 'Failed to create subscription: ' + error.message });
  }
});

/**
 * Cancel subscription (downgrades to free tier)
 */
router.post('/cancel', requireAuth, requireMainUser, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user;
    
    // If already on starter tier, nothing to cancel
    if (user.subscriptionTier === 'starter') {
      return res.json({ success: true, message: 'Already on free tier' });
    }
    
    if (!user.stripeSubscriptionId) {
      // No Stripe subscription but not on starter - reset to starter
      await storage.updateUser(user.id, {
        subscriptionTier: 'starter',
        subscriptionStatus: 'active',
        stripeSubscriptionId: null
      });
      return res.json({ success: true, message: 'Downgraded to free tier' });
    }

    // Cancel the subscription at period end
    const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Update user status - will revert to starter after period ends
    await storage.updateUser(user.id, {
      subscriptionStatus: 'cancelled',
    });

    // Log cancellation
    logPaymentEvent(user.id, 'subscription_cancelled', 0, {
      subscriptionId: user.stripeSubscriptionId,
      tier: user.subscriptionTier,
    });

    res.json({
      success: true,
      message: 'Subscription will be cancelled at the end of the current period',
      periodEnd: new Date(subscription.current_period_end * 1000),
    });
  } catch (error: any) {
    logger.error('Subscription cancellation error', { error, userId: req.user.id });
    res.status(500).json({ error: 'Failed to cancel subscription: ' + error.message });
  }
});

/**
 * Get subscription status
 */
router.get('/status', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user;
    
    if (!user.stripeSubscriptionId) {
      return res.json({
        status: user.subscriptionStatus,
        tier: user.subscriptionTier,
        billingCycle: user.billingCycle,
        trialEndDate: user.trialEndDate,
      });
    }

    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    
    res.json({
      status: subscription.status,
      tier: user.subscriptionTier,
      billingCycle: user.billingCycle,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
  } catch (error: any) {
    logger.error('Subscription status error', { error, userId: req.user.id });
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

/**
 * Update subscription tier (upgrade or change between paid tiers)
 */
router.post('/update-tier', requireAuth, requireMainUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { tier, billingCycle } = req.body;
    const user = req.user;
    
    if (!tier || !['starter', 'professional', 'enterprise'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid subscription tier' });
    }
    
    // Downgrading to starter - cancel subscription
    if (tier === 'starter') {
      if (user.stripeSubscriptionId) {
        await stripe.subscriptions.cancel(user.stripeSubscriptionId);
      }
      await storage.updateUser(user.id, {
        subscriptionTier: 'starter',
        subscriptionStatus: 'active',
        stripeSubscriptionId: null
      });
      return res.json({ success: true, message: 'Downgraded to free tier' });
    }
    
    if (!billingCycle || !['monthly', 'annual'].includes(billingCycle)) {
      return res.status(400).json({ error: 'Invalid billing cycle' });
    }

    if (!user.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    
    // Get the price for the new tier and billing cycle
    const priceAmount = SUBSCRIPTION_PRICES[tier as keyof typeof SUBSCRIPTION_PRICES][billingCycle as keyof typeof SUBSCRIPTION_PRICES.starter];

    // Create new price object
    const price = await stripe.prices.create({
      unit_amount: priceAmount,
      currency: 'usd',
      recurring: {
        interval: billingCycle === 'annual' ? 'year' : 'month',
      },
      product_data: {
        name: `Euno ${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan`,
      },
    });

    // Update subscription
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: price.id,
      }],
      proration_behavior: 'always_invoice',
    });

    // Update user
    await storage.updateUser(user.id, {
      subscriptionTier: tier,
      billingCycle: billingCycle,
    });

    // Log tier change
    logPaymentEvent(user.id, 'subscription_updated', priceAmount / 100, {
      oldTier: user.subscriptionTier,
      newTier: tier,
      billingCycle,
    });

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      newTier: tier,
      billingCycle: billingCycle,
    });
  } catch (error: any) {
    logger.error('Subscription update error', { error, userId: req.user.id });
    res.status(500).json({ error: 'Failed to update subscription: ' + error.message });
  }
});

/**
 * Stripe webhook handler function
 * SECURITY: Verifies webhook signature to prevent fake payment events
 */
async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'];
  
  if (!sig) {
    logger.error('Missing Stripe signature');
    return res.status(400).send('Missing signature');
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature to ensure it's actually from Stripe
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Missing STRIPE_WEBHOOK_SECRET environment variable');
    }

    // Use raw body for signature verification
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );
  } catch (err: any) {
    logger.error('Webhook signature verification failed', { error: err.message });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      default:
        logger.info('Unhandled webhook event type', { type: event.type });
    }

    res.json({ received: true });
  } catch (error: any) {
    logger.error('Webhook handler error', { error, eventType: event.type });
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

/**
 * Handle successful payment - upgrade user's tier
 */
async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  logger.info('Payment succeeded', { paymentIntentId: paymentIntent.id });

  // Get the subscription from the payment intent
  const subscriptionId = paymentIntent.invoice 
    ? (typeof paymentIntent.invoice === 'string' 
        ? paymentIntent.invoice 
        : paymentIntent.invoice.subscription)
    : null;

  if (!subscriptionId) {
    logger.warn('Payment succeeded but no subscription found', { paymentIntentId: paymentIntent.id });
    return;
  }

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(
    typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.toString()
  );

  const userId = subscription.metadata.userId;
  const requestedTier = subscription.metadata.requestedTier;
  const requestedBillingCycle = subscription.metadata.requestedBillingCycle;

  if (!userId || !requestedTier) {
    logger.error('Missing metadata in subscription', { subscriptionId: subscription.id });
    return;
  }

  // SECURITY: Upgrade tier ONLY after payment confirmed
  await storage.updateUser(parseInt(userId), {
    subscriptionTier: requestedTier,
    subscriptionStatus: 'active',
    subscriptionStartDate: new Date(),
  });

  logger.info('User upgraded after payment confirmation', {
    userId,
    tier: requestedTier,
    subscriptionId: subscription.id
  });

  // Log successful payment
  logPaymentEvent(parseInt(userId), 'payment_succeeded', paymentIntent.amount / 100, {
    tier: requestedTier,
    billingCycle: requestedBillingCycle,
    subscriptionId: subscription.id,
    paymentIntentId: paymentIntent.id,
  });
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  logger.warn('Payment failed', { paymentIntentId: paymentIntent.id });

  // Try to find user by payment intent metadata or customer
  const customerId = paymentIntent.customer;
  if (!customerId) {
    logger.warn('Payment failed but no customer found');
    return;
  }

  // Find user by Stripe customer ID
  const user = await storage.getUserByStripeCustomerId(
    typeof customerId === 'string' ? customerId : customerId.id
  );

  if (!user) {
    logger.warn('Payment failed but user not found', { customerId });
    return;
  }

  // Mark subscription as failed
  await storage.updateUser(user.id, {
    subscriptionStatus: 'payment_failed',
  });

  logger.info('Marked subscription as failed', { userId: user.id });

  logPaymentEvent(user.id, 'payment_failed', paymentIntent.amount / 100, {
    paymentIntentId: paymentIntent.id,
    failureReason: paymentIntent.last_payment_error?.message || 'Unknown',
  });
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;
  
  if (!userId) {
    logger.warn('Subscription updated but no userId in metadata', { subscriptionId: subscription.id });
    return;
  }

  // If subscription was cancelled
  if (subscription.cancel_at_period_end) {
    await storage.updateUser(parseInt(userId), {
      subscriptionStatus: 'cancelled',
    });
    logger.info('Subscription marked as cancelled', { userId, subscriptionId: subscription.id });
  }

  // If subscription status changed to unpaid/past_due
  if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
    await storage.updateUser(parseInt(userId), {
      subscriptionStatus: 'payment_failed',
    });
    logger.info('Subscription payment issue', { userId, status: subscription.status });
  }
}

/**
 * Handle subscription deletion - downgrade to free tier
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;
  
  if (!userId) {
    logger.warn('Subscription deleted but no userId in metadata', { subscriptionId: subscription.id });
    return;
  }

  // Downgrade to free tier
  await storage.updateUser(parseInt(userId), {
    subscriptionTier: 'starter',
    subscriptionStatus: 'expired',
    stripeSubscriptionId: null,
  });

  logger.info('User downgraded to free tier', { userId, subscriptionId: subscription.id });

  logPaymentEvent(parseInt(userId), 'subscription_expired', 0, {
    subscriptionId: subscription.id,
  });
}

export default router;