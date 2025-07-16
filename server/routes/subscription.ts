import { Router } from 'express';
import Stripe from 'stripe';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { storage } from '../storage';
import { logger, logPaymentEvent } from '../utils/logger';

const router = Router();

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Subscription pricing configuration
const SUBSCRIPTION_PRICES = {
  starter: {
    monthly: 2900, // $29.00 in cents
    annual: 29000, // $290.00 in cents
  },
  growth: {
    monthly: 7900, // $79.00 in cents
    annual: 79000, // $790.00 in cents
  },
  pro: {
    monthly: 14900, // $149.00 in cents
    annual: 149000, // $1490.00 in cents
  }
};

/**
 * Create or retrieve subscription for user
 */
router.post('/get-or-create-subscription', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { tier, billingCycle } = req.body;
    
    if (!tier || !['starter', 'growth', 'pro'].includes(tier)) {
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
    const priceAmount = SUBSCRIPTION_PRICES[tier as keyof typeof SUBSCRIPTION_PRICES][billingCycle as keyof typeof SUBSCRIPTION_PRICES.starter];

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
    });

    // Update user with subscription info
    await storage.updateUser(user.id, {
      stripeSubscriptionId: subscription.id,
      subscriptionTier: tier,
      billingCycle: billingCycle,
      subscriptionStatus: 'active',
      subscriptionStartDate: new Date(),
    });

    // Log payment event
    logPaymentEvent(user.id, 'subscription_created', priceAmount / 100, {
      tier,
      billingCycle,
      subscriptionId: subscription.id,
    });

    res.json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
      status: 'requires_payment'
    });
  } catch (error: any) {
    logger.error('Subscription creation error', { error, userId: req.user.id });
    res.status(500).json({ error: 'Failed to create subscription: ' + error.message });
  }
});

/**
 * Cancel subscription
 */
router.post('/cancel', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user;
    
    if (!user.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    // Cancel the subscription at period end
    const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Update user status
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
 * Update subscription tier
 */
router.post('/update-tier', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { tier, billingCycle } = req.body;
    const user = req.user;
    
    if (!tier || !['starter', 'growth', 'pro'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid subscription tier' });
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

export default router;