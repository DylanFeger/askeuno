import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";
import { logger } from './utils/logger';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Detect if we're using Neon (has neon.tech in the URL) or local PostgreSQL
const isNeonDatabase = process.env.DATABASE_URL.includes('neon.tech') || 
                       process.env.DATABASE_URL.includes('neon.aws');

// Configure Neon WebSocket only when using Neon
if (isNeonDatabase) {
  neonConfig.webSocketConstructor = ws;
  neonConfig.pipelineConnect = false;
  neonConfig.useSecureWebSocket = true;
  neonConfig.fetchConnectionCache = true;
  neonConfig.poolQueryViaFetch = true;
  logger.info('Using Neon database connection');
} else {
  logger.info('Using standard PostgreSQL connection');
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
        logger.error(`Failed ${operationName} after ${attempt} attempts`, { error, operationName, attempt });
        throw error;
      }
      
      logger.warn(`Retrying ${operationName}`, { attempt, maxRetries: MAX_RETRIES, operationName });
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
    }
  }
  
  throw lastError;
}

// Create pool based on database type
let pool: NeonPool | PgPool;
let sessionPool: NeonPool | PgPool;
let db: ReturnType<typeof drizzleNeon> | ReturnType<typeof drizzlePg>;

if (isNeonDatabase) {
  // Neon pool with WebSocket support
  pool = new NeonPool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: true,
    max: 5,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 10000,
    maxUses: 50,
    allowExitOnIdle: true
  });

  sessionPool = new NeonPool({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
    max: 2,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 10000,
    maxUses: 50,
    allowExitOnIdle: true
  });

  db = drizzleNeon({ client: pool, schema });
} else {
  // Standard PostgreSQL pool for local/Docker
  const sslConfig = process.env.DATABASE_URL.includes('localhost') || 
                    process.env.DATABASE_URL.includes('127.0.0.1')
    ? false 
    : { rejectUnauthorized: false };

  pool = new PgPool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: sslConfig,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  sessionPool = new PgPool({
    connectionString: process.env.DATABASE_URL,
    ssl: sslConfig,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  db = drizzlePg({ client: pool, schema });
}

// Add error handlers with automatic reconnection logic
pool.on('error', (err: any) => {
  logger.error('Database pool error', { error: err });
  if (err.code === '57P01') {
    logger.info('Database pool admin termination detected, connections will be recreated on next query');
  }
});

sessionPool.on('error', (err: any) => {
  logger.error('Session pool error', { error: err });
  if (err.code === '57P01') {
    logger.info('Session pool admin termination detected, connections will be recreated');
  }
});

export { pool, sessionPool, db };