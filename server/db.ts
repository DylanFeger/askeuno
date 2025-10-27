import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket properly for Neon
neonConfig.webSocketConstructor = ws;
neonConfig.pipelineConnect = false;
neonConfig.useSecureWebSocket = true;
neonConfig.fetchConnectionCache = true;
neonConfig.poolQueryViaFetch = true; // Use fetch for pooled queries to improve stability

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Retry configuration for database operations
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Helper function to execute queries with retry logic
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string = 'database operation'
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if error is retryable
      const isRetryable = error.code === '57P01' || // admin termination
                         error.code === 'ECONNRESET' ||
                         error.code === 'ECONNREFUSED' ||
                         error.code === 'ETIMEDOUT' ||
                         error.message?.includes('terminating connection');
      
      if (!isRetryable || attempt === MAX_RETRIES) {
        console.error(`Failed ${operationName} after ${attempt} attempts:`, error);
        throw error;
      }
      
      console.warn(`Retrying ${operationName} (attempt ${attempt}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
    }
  }
  
  throw lastError;
}

// Main pool for ORM operations with optimized settings for Neon
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: true,
  max: 5,  // Slightly increased but still conservative
  idleTimeoutMillis: 60000,  // 1 minute - shorter to prevent stale connections
  connectionTimeoutMillis: 10000,  // 10 seconds - faster failure for retry
  maxUses: 50,  // Lower reuse to refresh connections more often
  allowExitOnIdle: true
});

// Separate pool for session management
export const sessionPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
  max: 2,  // Small pool for sessions
  idleTimeoutMillis: 60000,  // 1 minute
  connectionTimeoutMillis: 10000,  // 10 seconds
  maxUses: 50,
  allowExitOnIdle: true
});

// Add error handlers with automatic reconnection logic
pool.on('error', (err: any) => {
  console.error('Database pool error:', err);
  // Handle admin termination gracefully
  if (err.code === '57P01') {
    console.log('Admin termination detected, connections will be recreated on next query');
  }
});

sessionPool.on('error', (err: any) => {
  console.error('Session pool error:', err);
  if (err.code === '57P01') {
    console.log('Session pool admin termination detected, connections will be recreated');
  }
});

// Create db instance with schema
export const db = drizzle({ client: pool, schema });