import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket properly for Neon
neonConfig.webSocketConstructor = ws;
neonConfig.pipelineConnect = false;
neonConfig.useSecureWebSocket = true;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Main pool for ORM operations
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: true,
  max: 5,  // Reduced for Neon compatibility
  idleTimeoutMillis: 600000,  // 10 minutes - prevent premature termination
  connectionTimeoutMillis: 30000,  // 30 seconds - allow more time for connection
  maxUses: 7500,  // Prevent connection reuse issues
  allowExitOnIdle: false
});

// Separate pool for session management
export const sessionPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
  max: 2,  // Minimal connections for sessions
  idleTimeoutMillis: 600000,  // 10 minutes - consistent with main pool
  connectionTimeoutMillis: 30000,  // 30 seconds
  maxUses: 7500,  // Prevent connection reuse issues
  allowExitOnIdle: false
});

export const db = drizzle({ client: pool, schema });