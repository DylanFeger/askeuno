/**
 * Database Connection Pool Manager
 * Manages connection pools for live database connections to prevent connection exhaustion
 */

import { Pool } from 'pg';
import mysql from 'mysql2/promise';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  throw new Error('ENCRYPTION_KEY must be exactly 64 hex characters');
}

function decrypt(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

interface PoolConfig {
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

const DEFAULT_POOL_CONFIG: PoolConfig = {
  max: 5, // Max connections per pool
  idleTimeoutMillis: 30000, // 30 seconds
  connectionTimeoutMillis: 10000, // 10 seconds
};

class DatabasePoolManager {
  private pools: Map<string, Pool | mysql.Pool> = new Map();
  private poolConfig: PoolConfig;
  
  constructor(config: Partial<PoolConfig> = {}) {
    this.poolConfig = { ...DEFAULT_POOL_CONFIG, ...config };
  }
  
  /**
   * Get or create a connection pool for a database connection
   */
  getPool(connectionString: string, type: 'postgres' | 'mysql'): Pool | mysql.Pool {
    // Create a hash of the connection string for the key (without exposing credentials)
    const key = this.createPoolKey(connectionString, type);
    
    if (!this.pools.has(key)) {
      logger.info('Creating new database connection pool', {
        type,
        maxConnections: this.poolConfig.max,
      });
      
      if (type === 'postgres') {
        const pool = new Pool({
          connectionString,
          max: this.poolConfig.max,
          idleTimeoutMillis: this.poolConfig.idleTimeoutMillis,
          connectionTimeoutMillis: this.poolConfig.connectionTimeoutMillis,
          // Connection pool options
          allowExitOnIdle: true,
        });
        
        // Handle pool errors
        pool.on('error', (err) => {
          logger.error('PostgreSQL pool error', {
            error: err.message,
            type: 'postgres',
          });
        });
        
        this.pools.set(key, pool);
      } else if (type === 'mysql') {
        // Parse MySQL connection string
        const url = new URL(connectionString);
        const pool = mysql.createPool({
          host: url.hostname,
          port: parseInt(url.port) || 3306,
          user: url.username,
          password: url.password,
          database: url.pathname.slice(1), // Remove leading /
          connectionLimit: this.poolConfig.max,
          queueLimit: 0, // Unlimited queue
          idleTimeout: this.poolConfig.idleTimeoutMillis,
          connectTimeout: this.poolConfig.connectionTimeoutMillis,
        });
        
        this.pools.set(key, pool);
      } else {
        throw new Error(`Unsupported database type: ${type}`);
      }
    }
    
    return this.pools.get(key)!;
  }
  
  /**
   * Create a unique key for the pool (hashed to avoid exposing credentials)
   */
  private createPoolKey(connectionString: string, type: string): string {
    // Hash the connection string to create a unique key without exposing credentials
    const hash = crypto.createHash('sha256').update(`${type}:${connectionString}`).digest('hex');
    return `${type}:${hash.substring(0, 16)}`;
  }
  
  /**
   * Close a specific pool
   */
  async closePool(connectionString: string, type: 'postgres' | 'mysql'): Promise<void> {
    const key = this.createPoolKey(connectionString, type);
    const pool = this.pools.get(key);
    
    if (pool) {
      logger.info('Closing database connection pool', { type, key });
      
      if (type === 'postgres') {
        await (pool as Pool).end();
      } else {
        await (pool as mysql.Pool).end();
      }
      
      this.pools.delete(key);
    }
  }
  
  /**
   * Close all pools (for graceful shutdown)
   */
  async closeAll(): Promise<void> {
    logger.info('Closing all database connection pools', {
      poolCount: this.pools.size,
    });
    
    const closePromises = Array.from(this.pools.entries()).map(async ([key, pool]) => {
      try {
        // Determine type from key
        const type = key.startsWith('postgres') ? 'postgres' : 'mysql';
        
        if (type === 'postgres') {
          await (pool as Pool).end();
        } else {
          await (pool as mysql.Pool).end();
        }
        
        logger.debug('Closed pool', { key });
      } catch (error) {
        logger.error('Error closing pool', { key, error: error instanceof Error ? error.message : 'Unknown' });
      }
    });
    
    await Promise.all(closePromises);
    this.pools.clear();
    
    logger.info('All database connection pools closed');
  }
  
  /**
   * Get pool statistics
   */
  getStats(): Record<string, any> {
    return {
      totalPools: this.pools.size,
      poolKeys: Array.from(this.pools.keys()),
    };
  }
}

// Export singleton instance
export const poolManager = new DatabasePoolManager();

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  await poolManager.closeAll();
});

process.on('SIGINT', async () => {
  await poolManager.closeAll();
});
