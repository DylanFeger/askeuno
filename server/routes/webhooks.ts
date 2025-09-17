import { Router } from 'express';
import { logger } from '../utils/logger';
import { storage } from '../storage';
import crypto from 'crypto';

const router = Router();

/**
 * Stripe webhook handler
 */
router.post('/stripe', async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      logger.warn('Stripe webhook secret not configured');
      return res.status(400).json({ error: 'Webhook not configured' });
    }

    // Verify webhook signature
    const sigHeader = req.headers['stripe-signature'];
    if (!sigHeader || typeof sigHeader !== 'string') {
      logger.warn('Missing Stripe signature header');
      return res.status(400).json({ error: 'Missing signature' });
    }
    
    const timestamp = sigHeader.split(',')[0]?.split('=')[1];
    const signature = sigHeader.split(',')[1]?.split('=')[1];
    
    const payload = `${timestamp}.${JSON.stringify(req.body)}`;
    const expectedSignature = crypto
      .createHmac('sha256', endpointSecret)
      .update(payload, 'utf8')
      .digest('hex');

    if (signature !== expectedSignature) {
      logger.warn('Invalid Stripe webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    
    // Find data source by webhook token
    const webhookToken = req.query.token as string;
    const dataSources = await storage.getDataSourcesByType('stripe');
    const dataSource = dataSources.find((ds: any) => 
      ds.connectionData?.webhookToken === webhookToken
    );

    if (!dataSource) {
      logger.warn('No data source found for Stripe webhook');
      return res.status(404).json({ error: 'Data source not found' });
    }

    // Process based on event type
    let dataToInsert: any[] = [];
    
    switch (event.type) {
      case 'payment_intent.succeeded':
      case 'charge.succeeded':
        const charge = event.data.object;
        dataToInsert = [{
          id: charge.id,
          amount: charge.amount / 100,
          currency: charge.currency,
          status: charge.status,
          customer: charge.customer,
          description: charge.description,
          created_at: new Date(charge.created * 1000),
          paid: true,
          refunded: false,
          event_type: 'payment',
          webhook_received_at: new Date(),
        }];
        break;
        
      case 'charge.refunded':
        const refund = event.data.object;
        dataToInsert = [{
          id: refund.id,
          amount: refund.amount_refunded / 100,
          currency: refund.currency,
          status: 'refunded',
          customer: refund.customer,
          description: refund.description,
          created_at: new Date(refund.created * 1000),
          paid: true,
          refunded: true,
          event_type: 'refund',
          webhook_received_at: new Date(),
        }];
        break;
    }

    // Insert data if we have any
    if (dataToInsert.length > 0) {
      await storage.insertDataRows(dataSource.id, dataToInsert);
      await storage.updateDataSource(dataSource.id, {
        lastSyncAt: new Date(),
        rowCount: (dataSource.rowCount || 0) + dataToInsert.length,
      });
      
      logger.info('Stripe webhook data processed', {
        dataSourceId: dataSource.id,
        eventType: event.type,
        rowsAdded: dataToInsert.length,
      });
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Stripe webhook error', { error });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Square webhook handler
 */
router.post('/square', async (req, res) => {
  try {
    const signature = req.headers['x-square-signature'] as string;
    const webhookToken = req.query.token as string;
    
    // Find data source
    const dataSources = await storage.getDataSourcesByType('square');
    const dataSource = dataSources.find((ds: any) => 
      ds.connectionData?.webhookToken === webhookToken
    );

    if (!dataSource) {
      logger.warn('No data source found for Square webhook');
      return res.status(404).json({ error: 'Data source not found' });
    }

    // Verify signature if webhook signature key is configured
    const connectionData = dataSource.connectionData as any;
    if (connectionData?.webhookSignatureKey) {
      const body = JSON.stringify(req.body);
      const hmac = crypto
        .createHmac('sha256', connectionData.webhookSignatureKey)
        .update(body)
        .digest('base64');
      
      if (hmac !== signature) {
        logger.warn('Invalid Square webhook signature');
        return res.status(400).json({ error: 'Invalid signature' });
      }
    }

    const { type, data } = req.body;
    let dataToInsert: any[] = [];

    switch (type) {
      case 'payment.created':
      case 'payment.updated':
        const payment = data.object.payment;
        dataToInsert = [{
          id: payment.id,
          amount: payment.amount_money?.amount ? payment.amount_money.amount / 100 : 0,
          currency: payment.amount_money?.currency || 'USD',
          status: payment.status,
          source_type: payment.source_type,
          created_at: new Date(payment.created_at),
          customer_id: payment.customer_id,
          location_id: payment.location_id,
          reference_id: payment.reference_id,
          note: payment.note,
          event_type: 'payment',
          webhook_received_at: new Date(),
        }];
        break;
        
      case 'refund.created':
      case 'refund.updated':
        const refund = data.object.refund;
        dataToInsert = [{
          id: refund.id,
          amount: refund.amount_money?.amount ? refund.amount_money.amount / 100 : 0,
          currency: refund.amount_money?.currency || 'USD',
          status: refund.status,
          created_at: new Date(refund.created_at),
          payment_id: refund.payment_id,
          reason: refund.reason,
          event_type: 'refund',
          webhook_received_at: new Date(),
        }];
        break;
    }

    // Insert data if we have any
    if (dataToInsert.length > 0) {
      await storage.insertDataRows(dataSource.id, dataToInsert);
      await storage.updateDataSource(dataSource.id, {
        lastSyncAt: new Date(),
        rowCount: (dataSource.rowCount || 0) + dataToInsert.length,
      });
      
      logger.info('Square webhook data processed', {
        dataSourceId: dataSource.id,
        eventType: type,
        rowsAdded: dataToInsert.length,
      });
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Square webhook error', { error });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * PayPal webhook handler (IPN - Instant Payment Notification)
 */
router.post('/paypal', async (req, res) => {
  try {
    const webhookToken = req.query.token as string;
    
    // Find data source
    const dataSources = await storage.getDataSourcesByType('paypal');
    const dataSource = dataSources.find((ds: any) => 
      ds.connectionData?.webhookToken === webhookToken
    );

    if (!dataSource) {
      logger.warn('No data source found for PayPal webhook');
      return res.status(404).json({ error: 'Data source not found' });
    }

    // PayPal IPN data
    const ipnData = req.body;
    let dataToInsert: any[] = [];

    // Process based on transaction type
    if (ipnData.payment_status && ipnData.txn_id) {
      dataToInsert = [{
        transaction_id: ipnData.txn_id,
        amount: parseFloat(ipnData.mc_gross || 0),
        currency: ipnData.mc_currency || 'USD',
        status: ipnData.payment_status,
        transaction_date: ipnData.payment_date ? new Date(ipnData.payment_date) : new Date(),
        payer_email: ipnData.payer_email,
        payer_name: `${ipnData.first_name || ''} ${ipnData.last_name || ''}`.trim(),
        fee_amount: parseFloat(ipnData.mc_fee || 0),
        payment_type: ipnData.payment_type,
        item_name: ipnData.item_name,
        event_type: ipnData.payment_status === 'Refunded' ? 'refund' : 'payment',
        webhook_received_at: new Date(),
      }];
    }

    // Insert data if we have any
    if (dataToInsert.length > 0) {
      await storage.insertDataRows(dataSource.id, dataToInsert);
      await storage.updateDataSource(dataSource.id, {
        lastSyncAt: new Date(),
        rowCount: (dataSource.rowCount || 0) + dataToInsert.length,
      });
      
      logger.info('PayPal webhook data processed', {
        dataSourceId: dataSource.id,
        paymentStatus: ipnData.payment_status,
        rowsAdded: dataToInsert.length,
      });
    }

    // PayPal expects a 200 response
    res.sendStatus(200);
  } catch (error) {
    logger.error('PayPal webhook error', { error });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Generic webhook handler for custom integrations
 */
router.post('/generic/:dataSourceId', async (req, res) => {
  try {
    const dataSourceId = parseInt(req.params.dataSourceId);
    const webhookToken = req.query.token as string;
    
    // Verify data source and token
    const dataSource = await storage.getDataSource(dataSourceId);
    const connectionData = dataSource?.connectionData as any;
    if (!dataSource || connectionData?.webhookToken !== webhookToken) {
      return res.status(404).json({ error: 'Invalid webhook endpoint' });
    }

    // Process the webhook data based on the data source schema
    let dataToInsert: any[] = [];
    
    // Transform webhook data based on existing schema
    if (dataSource.schema && req.body) {
      const schemaKeys = Object.keys(dataSource.schema);
      const data = Array.isArray(req.body) ? req.body : [req.body];
      
      dataToInsert = data.map((item: any) => {
        const transformed: any = {};
        schemaKeys.forEach(key => {
          if (item[key] !== undefined) {
            transformed[key] = item[key];
          }
        });
        transformed.webhook_received_at = new Date();
        return transformed;
      });
    }
    
    if (dataToInsert.length > 0) {
      await storage.insertDataRows(dataSource.id, dataToInsert);
      await storage.updateDataSource(dataSource.id, {
        lastSyncAt: new Date(),
        rowCount: (dataSource.rowCount || 0) + dataToInsert.length,
      });
      
      logger.info('Generic webhook data processed', {
        dataSourceId: dataSource.id,
        rowsAdded: dataToInsert.length,
      });
    }

    res.json({ 
      received: true, 
      processed: dataToInsert.length 
    });
  } catch (error) {
    logger.error('Generic webhook error', { error });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Lightspeed webhook handler
 */
router.post('/lightspeed', async (req, res) => {
  try {
    const signature = req.headers['x-lightspeed-signature'] as string;
    const webhookToken = req.query.token as string;
    
    // Find data source by webhook token
    const dataSources = await storage.getDataSourcesByType('lightspeed');
    const dataSource = dataSources.find((ds: any) => 
      ds.connectionData?.webhookToken === webhookToken
    );

    if (!dataSource) {
      logger.warn('No data source found for Lightspeed webhook', { webhookToken });
      return res.status(404).json({ error: 'Data source not found' });
    }

    // Verify HMAC signature if webhook secret is configured
    const connectionData = dataSource.connectionData as any;
    if (connectionData?.webhookSecret) {
      const body = JSON.stringify(req.body);
      const hmac = crypto
        .createHmac('sha256', connectionData.webhookSecret)      
        .update(body)
        .digest('hex');
      
      if (hmac !== signature) {
        logger.warn('Invalid Lightspeed webhook signature', { 
          dataSourceId: dataSource.id,
          expected: hmac,
          received: signature 
        });
        return res.status(400).json({ error: 'Invalid signature' });
      }
    }

    const { event_type, data } = req.body;
    let dataToInsert: any[] = [];

    // Process webhook data based on event type
    switch (event_type) {
      case 'Sale.created':
      case 'Sale.updated':
        dataToInsert = [{
          data_type: 'sale',
          id: data.saleID,
          sale_id: data.saleID,
          sale_number: data.saleNumber,
          sale_time: new Date(data.saleTime),
          total: parseFloat(data.total || 0),
          total_tax: parseFloat(data.totalTax || 0),
          customer_id: data.customerID,
          customer_name: data.Customer?.firstName && data.Customer?.lastName 
            ? `${data.Customer.firstName} ${data.Customer.lastName}` 
            : data.Customer?.firstName || data.Customer?.lastName || null,
          employee_id: data.employeeID,
          register_id: data.registerID,
          shop_id: data.shopID,
          completed: data.completed === 'true',
          archived: data.archived === 'true',
          voided: data.voided === 'true',
          line_items_count: data.SaleLines?.SaleLine?.length || 0,
          payment_methods: data.Payments?.Payment?.map((p: any) => p.paymentTypeID) || [],
          webhook_received_at: new Date(),
        }];
        break;

      case 'Item.created':
      case 'Item.updated':
        dataToInsert = [{
          data_type: 'product',
          id: data.itemID,
          item_id: data.itemID,
          item_number: data.itemNumber,
          description: data.description,
          custom_sku: data.customSku,
          system_sku: data.systemSku,
          upc: data.upc,
          price: parseFloat(data.price || 0),
          cost: parseFloat(data.cost || 0),
          weight: parseFloat(data.weight || 0),
          category_id: data.categoryID,
          category_name: data.Category?.name || null,
          brand: data.brand,
          manufacturer_sku: data.manufacturerSku,
          tax_class: data.taxClass,
          archived: data.archived === 'true',
          item_matrix_id: data.itemMatrixID,
          created_at: data.createTime ? new Date(data.createTime) : null,
          updated_at: data.timeStamp ? new Date(data.timeStamp) : null,
          webhook_received_at: new Date(),
        }];
        break;

      case 'Customer.created':
      case 'Customer.updated':
        dataToInsert = [{
          data_type: 'customer',
          id: data.customerID,
          customer_id: data.customerID,
          first_name: data.firstName,
          last_name: data.lastName,
          full_name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
          email: data.email,
          phone: data.phone,
          company: data.company,
          customer_type_id: data.customerTypeID,
          customer_type_name: data.CustomerType?.name || null,
          credit_limit: parseFloat(data.creditLimit || 0),
          tax_category_id: data.taxCategoryID,
          archived: data.archived === 'true',
          created_at: data.createTime ? new Date(data.createTime) : null,
          updated_at: data.timeStamp ? new Date(data.timeStamp) : null,
          webhook_received_at: new Date(),
        }];
        break;

      default:
        logger.info('Unhandled Lightspeed webhook event', { 
          event_type, 
          dataSourceId: dataSource.id 
        });
        return res.json({ received: true, processed: 0 });
    }

    // Insert or update data
    if (dataToInsert.length > 0) {
      // For webhooks, we typically want to update existing records or insert new ones
      // This is a simplified approach - in production you might want more sophisticated upsert logic
      await storage.insertDataRows(dataSource.id, dataToInsert);
      
      const currentCount = dataSource.rowCount || 0;
      await storage.updateDataSource(dataSource.id, {
        lastSyncAt: new Date(),
        rowCount: currentCount + dataToInsert.length,
      });

      logger.info('Lightspeed webhook data processed', {
        dataSourceId: dataSource.id,
        eventType: event_type,
        rowsAdded: dataToInsert.length,
      });
    }

    res.json({ 
      received: true, 
      processed: dataToInsert.length,
      event_type 
    });
  } catch (error) {
    logger.error('Lightspeed webhook error', { error });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;