import cron from 'node-cron';
import { storage } from '../storage';
import { connectToDataSource } from './dataConnector';
import { decryptConnectionData } from '../utils/encryption';
import { logger } from '../utils/logger';

interface ScheduledJob {
  dataSourceId: number;
  schedule: string;
  task: cron.ScheduledTask;
}

// Store active scheduled jobs
const activeJobs = new Map<number, ScheduledJob>();

/**
 * Convert sync frequency to cron expression
 */
function frequencyToCron(frequency: string): string | null {
  switch (frequency) {
    case '15min':
      return '*/15 * * * *'; // Every 15 minutes
    case 'hourly':
      return '0 * * * *'; // Every hour at minute 0
    case 'daily':
      return '0 0 * * *'; // Every day at midnight
    case 'weekly':
      return '0 0 * * 0'; // Every Sunday at midnight
    case 'manual':
    default:
      return null;
  }
}

/**
 * Sync data for a specific data source
 */
async function syncDataSource(dataSourceId: number) {
  try {
    logger.info('Starting scheduled sync', { dataSourceId });
    
    const dataSource = await storage.getDataSource(dataSourceId);
    if (!dataSource || dataSource.connectionType !== 'live') {
      logger.warn('Invalid data source for sync', { dataSourceId });
      return;
    }

    // Update status to syncing
    await storage.updateDataSource(dataSourceId, { status: 'syncing' });

    // Decrypt connection data and perform sync
    const connectionData = decryptConnectionData(dataSource.connectionData);
    const syncResult = await connectToDataSource(dataSource.type, connectionData);
    
    if (syncResult.success) {
      // Clear old data and insert new
      await storage.clearDataRows(dataSourceId);
      if (syncResult.data && syncResult.data.length > 0) {
        await storage.insertDataRows(dataSourceId, syncResult.data);
      }

      await storage.updateDataSource(dataSourceId, {
        status: 'active',
        lastSyncAt: new Date(),
        rowCount: syncResult.rowCount || 0,
        schema: syncResult.schema,
        errorMessage: null,
      });

      logger.info('Scheduled sync completed', { 
        dataSourceId, 
        rowsUpdated: syncResult.rowCount 
      });
    } else {
      await storage.updateDataSource(dataSourceId, {
        status: 'error',
        errorMessage: syncResult.error,
      });

      logger.error('Scheduled sync failed', { 
        dataSourceId, 
        error: syncResult.error 
      });
    }
  } catch (error) {
    logger.error('Error during scheduled sync', { dataSourceId, error });
    await storage.updateDataSource(dataSourceId, {
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'Sync failed',
    });
  }
}

/**
 * Schedule a data source for automatic syncing
 */
export function scheduleDataSource(dataSourceId: number, frequency: string) {
  // Remove existing schedule if any
  unscheduleDataSource(dataSourceId);

  const cronExpression = frequencyToCron(frequency);
  if (!cronExpression) {
    logger.info('Manual sync only, no schedule created', { dataSourceId });
    return;
  }

  // Create scheduled task
  const task = cron.schedule(cronExpression, () => {
    syncDataSource(dataSourceId).catch(error => {
      logger.error('Uncaught error in scheduled sync', { dataSourceId, error });
    });
  });

  // Start the task
  task.start();

  // Store in active jobs
  activeJobs.set(dataSourceId, {
    dataSourceId,
    schedule: cronExpression,
    task,
  });

  logger.info('Data source scheduled', { dataSourceId, schedule: cronExpression });
}

/**
 * Remove scheduled sync for a data source
 */
export function unscheduleDataSource(dataSourceId: number) {
  const job = activeJobs.get(dataSourceId);
  if (job) {
    job.task.stop();
    activeJobs.delete(dataSourceId);
    logger.info('Data source unscheduled', { dataSourceId });
  }
}

/**
 * Initialize scheduler and restore active schedules from database
 */
export async function initializeScheduler() {
  try {
    logger.info('Initializing scheduler');

    // Get all active data sources with sync frequency
    const dataSources = await storage.getAllActiveDataSources();
    
    for (const dataSource of dataSources) {
      if (dataSource.connectionType === 'live' && dataSource.syncFrequency) {
        scheduleDataSource(dataSource.id, dataSource.syncFrequency);
      }
    }

    logger.info('Scheduler initialized', { 
      scheduledCount: activeJobs.size 
    });
  } catch (error) {
    logger.error('Failed to initialize scheduler', { error });
  }
}

/**
 * Shutdown scheduler gracefully
 */
export function shutdownScheduler() {
  logger.info('Shutting down scheduler');
  
  activeJobs.forEach(job => {
    job.task.stop();
  });
  
  activeJobs.clear();
}