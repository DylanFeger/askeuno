import { Router } from 'express';
import crypto from 'crypto';
import { handleWebhookUpdate } from '../services/liveDataSync';
import { storage } from '../storage';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Verify webhook signature for security
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: string = 'sha256'
): boolean {
  const expectedSignature = crypto
    .createHmac(algorithm, secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Generic webhook endpoint for data sources
 * Format: /api/webhooks/:dataSourceId/:token
 */
router.post('/:dataSourceId/:token', async (req, res) => {
  try {
    const dataSourceId = parseInt(req.params.dataSourceId);
    const token = req.params.token;
    
    // Get data source
    const dataSource = await storage.getDataSource(dataSourceId);
    if (!dataSource) {
      logger.warn('Webhook received for non-existent data source', { dataSourceId });
      return res.status(404).json({ error: 'Data source not found' });
    }

    // Verify webhook token
    if (dataSource.connectionData?.webhookToken !== token) {
      logger.warn('Invalid webhook token', { dataSourceId });
      return res.status(401).json({ error: 'Invalid webhook token' });
    }

    // Verify signature if configured
    if (dataSource.connectionData?.webhookSecret) {
      const signature = req.headers['x-webhook-signature'] as string;
      if (!signature) {
        return res.status(401).json({ error: 'Missing webhook signature' });
      }

      const isValid = verifyWebhookSignature(
        JSON.stringify(req.body),
        signature,
        dataSource.connectionData.webhookSecret
      );

      if (!isValid) {
        logger.warn('Invalid webhook signature', { dataSourceId });
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    // Process webhook data
    await handleWebhookUpdate(dataSourceId, req.body);

    logger.info('Webhook processed', {
      dataSourceId,
      type: dataSource.type,
      userId: dataSource.userId,
    });

    res.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    logger.error('Webhook error', { 
      error, 
      dataSourceId: req.params.dataSourceId 
    });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Shopify webhook endpoint
 * Includes Shopify-specific verification
 */
router.post('/shopify/:dataSourceId', async (req, res) => {
  try {
    const dataSourceId = parseInt(req.params.dataSourceId);
    
    // Get data source
    const dataSource = await storage.getDataSource(dataSourceId);
    if (!dataSource || dataSource.type !== 'shopify') {
      return res.status(404).json({ error: 'Shopify data source not found' });
    }

    // Verify Shopify webhook
    const hmacHeader = req.headers['x-shopify-hmac-sha256'] as string;
    if (!hmacHeader) {
      return res.status(401).json({ error: 'Missing Shopify HMAC' });
    }

    const webhookSecret = dataSource.connectionData?.webhookSecret;
    if (!webhookSecret) {
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const rawBody = JSON.stringify(req.body);
    const hash = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody, 'utf8')
      .digest('base64');

    if (hash !== hmacHeader) {
      logger.warn('Invalid Shopify webhook signature', { dataSourceId });
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    // Add topic to webhook data
    const webhookData = {
      ...req.body,
      topic: req.headers['x-shopify-topic'],
    };

    // Process webhook
    await handleWebhookUpdate(dataSourceId, webhookData);

    res.json({ success: true });
  } catch (error) {
    logger.error('Shopify webhook error', { error });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Stripe webhook endpoint
 * Includes Stripe-specific verification
 */
router.post('/stripe/:dataSourceId', async (req, res) => {
  try {
    const dataSourceId = parseInt(req.params.dataSourceId);
    
    // Get data source
    const dataSource = await storage.getDataSource(dataSourceId);
    if (!dataSource || dataSource.type !== 'stripe') {
      return res.status(404).json({ error: 'Stripe data source not found' });
    }

    // Verify Stripe webhook signature
    const signature = req.headers['stripe-signature'] as string;
    if (!signature) {
      return res.status(401).json({ error: 'Missing Stripe signature' });
    }

    const endpointSecret = dataSource.connectionData?.webhookSecret;
    if (!endpointSecret) {
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // For Stripe, we need the raw body
    // This would require middleware to capture raw body
    // For now, we'll process as-is
    const event = req.body;

    // Process webhook
    await handleWebhookUpdate(dataSourceId, event);

    res.json({ received: true });
  } catch (error) {
    logger.error('Stripe webhook error', { error });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Test webhook endpoint for development
 */
router.post('/test/:dataSourceId', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    const dataSourceId = parseInt(req.params.dataSourceId);
    await handleWebhookUpdate(dataSourceId, req.body);
    res.json({ success: true, message: 'Test webhook processed' });
  } catch (error) {
    logger.error('Test webhook error', { error });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;