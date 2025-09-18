import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket properly for Neon
neonConfig.webSocketConstructor = ws;
neonConfig.pipelineConnect = false;
neonConfig.useSecureWebSocket = true;
neonConfig.fetchConnectionCache = true;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Main pool for ORM operations with improved error handling
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: true,
  max: 3,  // Further reduced for Neon compatibility
  idleTimeoutMillis: 300000,  // 5 minutes - shorter timeout to prevent admin termination
  connectionTimeoutMillis: 15000,  // 15 seconds - faster timeout for retry logic
  maxUses: 100,  // Lower reuse count to prevent connection staleness
  allowExitOnIdle: true  // Allow exit to prevent hanging connections
});

// Separate pool for session management
export const sessionPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
  max: 1,  // Single connection for sessions
  idleTimeoutMillis: 300000,  // 5 minutes - consistent with main pool
  connectionTimeoutMillis: 15000,  // 15 seconds
  maxUses: 100,  // Lower reuse count
  allowExitOnIdle: true
});

// Add error handlers to prevent crashes
pool.on('error', (err) => {
  console.error('Database pool error:', err);
  // Don't exit the process, just log the error
});

sessionPool.on('error', (err) => {
  console.error('Session pool error:', err);
  // Don't exit the process, just log the error
});

export const db = drizzle({ client: pool, schema });