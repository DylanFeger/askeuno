import { db } from "../db";
import { dataSources, dataRows } from "@shared/schema";
import { eq, and, lt } from "drizzle-orm";
import { logger } from "../utils/logger";
import OpenAI from "openai";

/**
 * Data Sync Job - Refreshes data from connected sources
 * Can be run as a cron job or AWS Lambda function
 */

// Configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // Start with 1 second
const SYNC_BATCH_SIZE = 100;
const STALE_DATA_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours

interface SyncResult {
  dataSourceId: number;
  success: boolean;
  rowsProcessed: number;
  error?: string;
  duration: number;
}

// Retry wrapper with exponential backoff
async function retryOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Attempting ${operationName} (attempt ${attempt}/${maxRetries})`);
      return await operation();
    } catch (error) {
      lastError = error;
      logger.warn(`${operationName} failed on attempt ${attempt}`, { error, attempt });
      
      if (attempt < maxRetries) {
        const delay = RETRY_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
        logger.info(`Retrying ${operationName} in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  logger.error(`${operationName} failed after ${maxRetries} attempts`, { error: lastError });
  throw lastError;
}

// Simulate external API data fetch (replace with actual API calls)
async function fetchExternalData(source: any): Promise<any[]> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Simulate different data types
  if (source.type === 'quickbooks') {
    return [
      { id: 1, type: 'invoice', amount: 1500, customer: 'Acme Corp', date: new Date() },
      { id: 2, type: 'payment', amount: 1500, customer: 'Acme Corp', date: new Date() },
      { id: 3, type: 'expense', amount: 200, vendor: 'Office Supplies', date: new Date() }
    ];
  } else if (source.type === 'google_sheets') {
    return [
      { month: 'January', revenue: 50000, expenses: 35000, profit: 15000 },
      { month: 'February', revenue: 55000, expenses: 38000, profit: 17000 },
      { month: 'March', revenue: 60000, expenses: 40000, profit: 20000 }
    ];
  }
  
  // Default sample data
  return [
    { id: Date.now(), value: Math.random() * 1000, timestamp: new Date() }
  ];
}

// Process and analyze data using AI
async function analyzeDataChanges(oldData: any[], newData: any[]): Promise<any> {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const prompt = `Analyze these data changes and identify key insights:
    Old data sample: ${JSON.stringify(oldData.slice(0, 3))}
    New data sample: ${JSON.stringify(newData.slice(0, 3))}
    
    Provide a brief summary of changes and any notable patterns.`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
    });
    
    return {
      insights: response.choices[0].message.content,
      changeCount: newData.length - oldData.length,
      timestamp: new Date()
    };
  } catch (error) {
    logger.warn('AI analysis failed, using basic analysis', { error });
    return {
      insights: `Data updated: ${newData.length} total rows`,
      changeCount: newData.length - oldData.length,
      timestamp: new Date()
    };
  }
}

// Sync a single data source
async function syncDataSource(dataSource: any): Promise<SyncResult> {
  const startTime = Date.now();
  
  try {
    logger.info(`Starting sync for data source: ${dataSource.name}`, { 
      dataSourceId: dataSource.id,
      type: dataSource.type 
    });
    
    // Fetch existing data
    const existingData = await db
      .select()
      .from(dataRows)
      .where(eq(dataRows.dataSourceId, dataSource.id))
      .limit(SYNC_BATCH_SIZE);
    
    // Fetch new data from external source
    const newData = await retryOperation(
      () => fetchExternalData(dataSource),
      `fetch data for ${dataSource.name}`
    );
    
    // Analyze changes
    const analysis = await analyzeDataChanges(
      existingData.map(row => row.rowData),
      newData
    );
    
    // Clear old data (in production, consider archiving instead)
    await db
      .delete(dataRows)
      .where(eq(dataRows.dataSourceId, dataSource.id));
    
    // Insert new data in batches
    const rowsToInsert = newData.map(data => ({
      dataSourceId: dataSource.id,
      rowData: data
    }));
    
    for (let i = 0; i < rowsToInsert.length; i += SYNC_BATCH_SIZE) {
      const batch = rowsToInsert.slice(i, i + SYNC_BATCH_SIZE);
      await retryOperation(
        () => db.insert(dataRows).values(batch),
        `insert batch ${i / SYNC_BATCH_SIZE + 1}`
      );
    }
    
    // Update data source metadata
    await db
      .update(dataSources)
      .set({
        rowCount: newData.length,
        lastSyncAt: new Date(),
        schema: { ...dataSource.schema, lastAnalysis: analysis }
      })
      .where(eq(dataSources.id, dataSource.id));
    
    const duration = Date.now() - startTime;
    logger.info(`Successfully synced data source: ${dataSource.name}`, {
      dataSourceId: dataSource.id,
      rowsProcessed: newData.length,
      duration,
      insights: analysis.insights
    });
    
    return {
      dataSourceId: dataSource.id,
      success: true,
      rowsProcessed: newData.length,
      duration
    };
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error(`Failed to sync data source: ${dataSource.name}`, {
      dataSourceId: dataSource.id,
      error: error.message,
      duration
    });
    
    return {
      dataSourceId: dataSource.id,
      success: false,
      rowsProcessed: 0,
      error: error.message,
      duration
    };
  }
}

// Main sync function
export async function runDataSync(): Promise<{
  success: boolean;
  results: SyncResult[];
  summary: any;
}> {
  const jobStartTime = Date.now();
  logger.info('Starting scheduled data sync job');
  
  try {
    // Find data sources that need syncing
    const staleDate = new Date(Date.now() - STALE_DATA_THRESHOLD);
    const sourcesToSync = await db
      .select()
      .from(dataSources)
      .where(
        and(
          lt(dataSources.lastSyncAt, staleDate),
          // Only sync connected sources, not uploaded files
          eq(dataSources.type, 'google_sheets')
        )
      );
    
    logger.info(`Found ${sourcesToSync.length} data sources to sync`);
    
    // Process each data source
    const results: SyncResult[] = [];
    
    for (const source of sourcesToSync) {
      const result = await syncDataSource(source);
      results.push(result);
      
      // Add delay between syncs to avoid overwhelming external APIs
      if (sourcesToSync.indexOf(source) < sourcesToSync.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Calculate summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalRows = results.reduce((sum, r) => sum + r.rowsProcessed, 0);
    const totalDuration = Date.now() - jobStartTime;
    
    const summary = {
      totalSources: results.length,
      successful,
      failed,
      totalRows,
      totalDuration,
      averageTimePerSource: results.length > 0 ? totalDuration / results.length : 0
    };
    
    logger.info('Data sync job completed', summary);
    
    return {
      success: failed === 0,
      results,
      summary
    };
    
  } catch (error: any) {
    logger.error('Data sync job failed', { error: error.message });
    throw error;
  }
}

// Lambda handler wrapper
export const lambdaHandler = async (event: any, context: any) => {
  try {
    const result = await runDataSync();
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error: any) {
    logger.error('Lambda execution failed', { error: error.message });
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        success: false
      })
    };
  }
};

// Cron job wrapper
export const cronJob = async () => {
  try {
    const result = await runDataSync();
    if (!result.success) {
      process.exit(1); // Exit with error code for cron monitoring
    }
  } catch (error) {
    logger.error('Cron job failed', { error });
    process.exit(1);
  }
};

// Test the sync function
if (require.main === module) {
  logger.info('Running data sync test');
  runDataSync()
    .then(result => {
      console.log('Sync completed:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Sync failed:', error);
      process.exit(1);
    });
}