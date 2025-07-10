import cron from 'node-cron';
import Bull from 'bull';
import { storage } from '../storage';
import { connectToDataSource } from './dataConnector';
import { logger } from '../utils/logger';
import { decryptConnectionData } from '../utils/encryption';

// Initialize Redis queue for background jobs
const syncQueue = new Bull('data-sync', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

// Map to track scheduled jobs
const scheduledJobs = new Map<number, cron.ScheduledTask>();

/**
 * Schedule sync for a data source
 */
export function scheduleSyncJob(dataSourceId: number, syncFrequency: number): void {
  // Cancel existing job if any
  cancelSyncJob(dataSourceId);

  // Convert minutes to cron expression
  const cronExpression = getCronExpression(syncFrequency);
  
  const task = cron.schedule(cronExpression, async () => {
    logger.info('Starting scheduled sync', { dataSourceId });
    await syncQueue.add('sync-data-source', { dataSourceId });
  });

  task.start();
  scheduledJobs.set(dataSourceId, task);
  
  logger.info('Sync job scheduled', { dataSourceId, cronExpression });
}

/**
 * Cancel sync job for a data source
 */
export function cancelSyncJob(dataSourceId: number): void {
  const existingJob = scheduledJobs.get(dataSourceId);
  if (existingJob) {
    existingJob.stop();
    scheduledJobs.delete(dataSourceId);
    logger.info('Sync job cancelled', { dataSourceId });
  }
}

/**
 * Convert sync frequency (minutes) to cron expression
 */
function getCronExpression(minutes: number): string {
  if (minutes < 60) {
    return `*/${minutes} * * * *`; // Every N minutes
  } else if (minutes === 60) {
    return '0 * * * *'; // Every hour
  } else if (minutes === 1440) {
    return '0 0 * * *'; // Daily at midnight
  } else {
    const hours = Math.floor(minutes / 60);
    return `0 */${hours} * * *`; // Every N hours
  }
}

/**
 * Process sync job
 */
syncQueue.process('sync-data-source', async (job) => {
  const { dataSourceId } = job.data;
  
  try {
    const dataSource = await storage.getDataSource(dataSourceId);
    if (!dataSource) {
      throw new Error('Data source not found');
    }

    // Update status
    await storage.updateDataSource(dataSourceId, { status: 'syncing' });

    // Decrypt connection data
    const connectionData = decryptConnectionData(dataSource.connectionData);

    // Perform sync
    const syncResult = await connectToDataSource(dataSource.type, connectionData);
    
    if (syncResult.success) {
      // Clear old data and insert new
      await storage.clearDataRows(dataSourceId);
      if (syncResult.data && syncResult.data.length > 0) {
        await storage.insertDataRows(dataSourceId, syncResult.data);
      }

      await storage.updateDataSource(dataSourceId, {
        status: 'connected',
        lastSyncAt: new Date(),
        rowCount: syncResult.rowCount || 0,
        schema: syncResult.schema,
        errorMessage: null,
      });

      logger.info('Data sync completed', {
        dataSourceId,
        rowsUpdated: syncResult.rowCount,
      });
    } else {
      await storage.updateDataSource(dataSourceId, {
        status: 'error',
        errorMessage: syncResult.error,
      });

      logger.error('Data sync failed', {
        dataSourceId,
        error: syncResult.error,
      });
    }
  } catch (error) {
    logger.error('Sync job error', { dataSourceId, error });
    
    await storage.updateDataSource(dataSourceId, {
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'Sync failed',
    });
  }
});

/**
 * Initialize sync jobs for all active data sources
 */
export async function initializeSyncJobs(): Promise<void> {
  try {
    // Get all active live data sources
    const dataSources = await storage.getAllActiveDataSources();
    
    for (const dataSource of dataSources) {
      if (dataSource.connectionType === 'live' && dataSource.syncFrequency) {
        scheduleSyncJob(dataSource.id, dataSource.syncFrequency);
      }
    }

    logger.info('Sync jobs initialized', { count: dataSources.length });
  } catch (error) {
    logger.error('Failed to initialize sync jobs', { error });
  }
}

/**
 * Handle webhook updates for push-based data sources
 */
export async function handleWebhookUpdate(
  dataSourceId: number,
  webhookData: any
): Promise<void> {
  try {
    const dataSource = await storage.getDataSource(dataSourceId);
    if (!dataSource) {
      throw new Error('Data source not found');
    }

    // Process webhook data based on source type
    let processedData: any[] = [];
    
    switch (dataSource.type) {
      case 'shopify':
        processedData = processShopifyWebhook(webhookData);
        break;
      case 'stripe':
        processedData = processStripeWebhook(webhookData);
        break;
      // Add more webhook processors as needed
      default:
        logger.warn('Unhandled webhook type', { type: dataSource.type });
        return;
    }

    // Append new data (webhooks are incremental)
    if (processedData.length > 0) {
      await storage.insertDataRows(dataSourceId, processedData);
      
      const currentCount = dataSource.rowCount || 0;
      await storage.updateDataSource(dataSourceId, {
        lastSyncAt: new Date(),
        rowCount: currentCount + processedData.length,
      });

      logger.info('Webhook data processed', {
        dataSourceId,
        rowsAdded: processedData.length,
      });
    }
  } catch (error) {
    logger.error('Webhook processing error', { dataSourceId, error });
  }
}

/**
 * Process Shopify webhook data
 */
function processShopifyWebhook(data: any): any[] {
  // Transform Shopify webhook data to standard format
  if (data.topic === 'orders/create' || data.topic === 'orders/updated') {
    return [{
      id: data.id,
      order_number: data.order_number,
      total_price: parseFloat(data.total_price),
      currency: data.currency,
      customer_email: data.email,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
      line_items: data.line_items?.length || 0,
      status: data.financial_status,
    }];
  }
  return [];
}

/**
 * Process Stripe webhook data
 */
function processStripeWebhook(data: any): any[] {
  // Transform Stripe webhook data to standard format
  if (data.type === 'payment_intent.succeeded') {
    const payment = data.data.object;
    return [{
      id: payment.id,
      amount: payment.amount / 100, // Convert cents to dollars
      currency: payment.currency,
      status: payment.status,
      customer: payment.customer,
      created_at: new Date(payment.created * 1000),
      description: payment.description,
    }];
  }
  return [];
}

/**
 * Get sync status for all data sources
 */
export async function getSyncStatus(userId: number): Promise<any[]> {
  const dataSources = await storage.getDataSourcesByUserId(userId);
  
  return dataSources.map(ds => ({
    id: ds.id,
    name: ds.name,
    type: ds.type,
    connectionType: ds.connectionType,
    status: ds.status,
    lastSyncAt: ds.lastSyncAt,
    nextSyncAt: ds.syncFrequency ? getNextSyncTime(ds.lastSyncAt, ds.syncFrequency) : null,
    syncFrequency: ds.syncFrequency,
    rowCount: ds.rowCount,
    errorMessage: ds.errorMessage,
  }));
}

/**
 * Calculate next sync time
 */
function getNextSyncTime(lastSync: Date | null, frequencyMinutes: number): Date {
  const lastSyncTime = lastSync ? new Date(lastSync) : new Date();
  return new Date(lastSyncTime.getTime() + frequencyMinutes * 60 * 1000);
}