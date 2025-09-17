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
  max: 5,  // Reduced for Neon serverless compatibility
  idleTimeoutMillis: 60000,  // 1 minute
  connectionTimeoutMillis: 10000  // 10 seconds
});

// Separate pool for session management
export const sessionPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
  max: 2,  // Minimal connections for sessions
  idleTimeoutMillis: 300000,  // 5 minutes
  connectionTimeoutMillis: 15000  // 15 seconds
});

export const db = drizzle({ client: pool, schema });