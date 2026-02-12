/**
 * Database Query Service
 * Handles executing SQL queries against live database connections
 */

import { Pool } from 'pg';
import mysql from 'mysql2/promise';
import { db } from '../db';
import { dataSources, connectionManager } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger';
import crypto from 'crypto';
import { poolManager } from './dbConnectionPool';

// Encryption helpers
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  throw new Error('ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes for AES-256)');
}
const IV_LENGTH = 16;

function decrypt(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

interface DatabaseConnection {
  type: 'postgres' | 'mysql';
  connectionString: string;
  isReadOnly: boolean;
}

/**
 * Get database connection details for a data source
 * Checks both dataSources (for live connections) and connectionManager (for direct DB connections)
 */
export async function getDatabaseConnection(
  dataSourceId: number,
  userId: number
): Promise<DatabaseConnection | null> {
  try {
    // First, check if this is a live database connection in dataSources
    const [dataSource] = await db
      .select()
      .from(dataSources)
      .where(and(
        eq(dataSources.id, dataSourceId),
        eq(dataSources.userId, userId),
        eq(dataSources.connectionType, 'live')
      ))
      .limit(1);

    if (dataSource && dataSource.connectionData) {
      // Check if it's a database type
      if (dataSource.type === 'postgres' || dataSource.type === 'mysql') {
        // connectionData is stored as an encrypted connection string
        let connectionString: string;
        try {
          // Try to decrypt (it should be encrypted)
          connectionString = decrypt(dataSource.connectionData as any);
        } catch (e) {
          // If decryption fails, it might be stored as JSON with nested structure
          try {
            const parsed = JSON.parse(dataSource.connectionData as any);
            if (parsed.connectionString) {
              // Decrypt the nested connection string
              connectionString = decrypt(parsed.connectionString);
            } else {
              throw new Error('No connectionString in parsed data');
            }
          } catch (e2) {
            // If all else fails, assume it's a plain connection string (shouldn't happen in production)
            logger.warn('Could not decrypt connection data, assuming plain format', {
              dataSourceId,
              error: e instanceof Error ? e.message : 'Unknown error'
            });
            connectionString = dataSource.connectionData as any;
          }
        }
        
        return {
          type: dataSource.type as 'postgres' | 'mysql',
          connectionString,
          isReadOnly: true // Live connections are always read-only
        };
      }
    }

    // If not found in dataSources, check connectionManager for direct database connections
    // We need to find a connectionManager entry that might be linked to this dataSource
    // For now, we'll search by userId and provider='database'
    const connections = await db
      .select()
      .from(connectionManager)
      .where(and(
        eq(connectionManager.userId, userId),
        eq(connectionManager.provider, 'database'),
        eq(connectionManager.status, 'active')
      ));

    // Try to find a connection that matches the dataSource name or use the first one
    // In a production system, you'd want a proper foreign key relationship
    for (const conn of connections) {
      if (conn.connectionString) {
        // Decrypt connection string
        const connectionString = decrypt(conn.connectionString);
        
        // Determine database type from connection string or account label
        let dbType: 'postgres' | 'mysql' = 'postgres';
        if (conn.accountLabel?.toLowerCase().includes('mysql') || 
            connectionString.startsWith('mysql://')) {
          dbType = 'mysql';
        } else if (connectionString.startsWith('postgresql://') || 
                   connectionString.startsWith('postgres://')) {
          dbType = 'postgres';
        }

        return {
          type: dbType,
          connectionString,
          isReadOnly: conn.isReadOnly || true
        };
      }
    }

    return null;
  } catch (error) {
    logger.error('Error getting database connection', { 
      dataSourceId, 
      userId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return null;
  }
}

/**
 * Execute SQL query against a live database connection
 */
export async function executeLiveDatabaseQuery(
  sql: string,
  connection: DatabaseConnection,
  maxRows: number = 1000
): Promise<{ success: boolean; data?: any[]; error?: string; rowCount?: number }> {
  // Note: We use pools now, not individual connections

  try {
    // Validate SQL is read-only
    const upperSql = sql.toUpperCase().trim();
    const forbiddenOps = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE', 'EXEC', 'EXECUTE', 'GRANT', 'REVOKE'];
    for (const op of forbiddenOps) {
      if (upperSql.includes(op)) {
        return {
          success: false,
          error: `Forbidden operation: ${op}. Only SELECT queries are allowed.`
        };
      }
    }

    // Ensure LIMIT clause exists
    let finalSql = sql.trim();
    if (!upperSql.includes('LIMIT')) {
      finalSql += ` LIMIT ${maxRows}`;
    } else {
      // Check if limit exceeds maxRows
      const limitMatch = upperSql.match(/LIMIT\s+(\d+)/);
      if (limitMatch) {
        const requestedLimit = parseInt(limitMatch[1]);
        if (requestedLimit > maxRows) {
          finalSql = sql.replace(/LIMIT\s+\d+/i, `LIMIT ${maxRows}`);
        }
      }
    }

    // Use connection pool instead of creating new connections
    if (connection.type === 'postgres') {
      pool = poolManager.getPool(connection.connectionString, 'postgres') as Pool;
      const result = await pool.query(finalSql);
      
      // Don't close the pool - it's managed by poolManager
      // Pool connections are reused automatically

      return {
        success: true,
        data: result.rows,
        rowCount: result.rowCount
      };
    } else if (connection.type === 'mysql') {
      const mysqlPool = poolManager.getPool(connection.connectionString, 'mysql') as mysql.Pool;
      const [rows] = await mysqlPool.execute(finalSql);
      
      // Don't close the pool - it's managed by poolManager
      // Pool connections are reused automatically

      // Convert MySQL result to array of objects
      const data = Array.isArray(rows) ? rows : [];
      
      return {
        success: true,
        data: data as any[],
        rowCount: data.length
      };
    } else {
      return {
        success: false,
        error: `Unsupported database type: ${connection.type}`
      };
    }
  } catch (error: any) {
    logger.error('Live database query execution error', {
      error: error.message,
      sql: sql.substring(0, 200), // Log first 200 chars for debugging
      dbType: connection.type
    });

    // No need to clean up - pools are managed by poolManager
    // Individual connections are returned to the pool automatically

    return {
      success: false,
      error: error.message || 'Database query execution failed'
    };
  }
}

/**
 * Get schema information from a live database
 */
export async function getDatabaseSchema(
  connection: DatabaseConnection
): Promise<{ tables: Array<{ name: string; columns: Array<{ name: string; type: string }> }> } | null> {
  let pool: Pool | null = null;
  let mysqlConnection: mysql.Connection | null = null;

  try {
    if (connection.type === 'postgres') {
      pool = poolManager.getPool(connection.connectionString, 'postgres') as Pool;

      // Get all tables
      const tablesResult = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);

      const tables = [];
      for (const table of tablesResult.rows) {
        const tableName = table.table_name;
        
        // Get columns for this table
        const columnsResult = await pool.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);

        tables.push({
          name: tableName,
          columns: columnsResult.rows.map((col: any) => ({
            name: col.column_name,
            type: col.data_type
          }))
        });
      }

      // Don't close pool - managed by poolManager
      return { tables };
    } else if (connection.type === 'mysql') {
      mysqlConnection = poolManager.getPool(connection.connectionString, 'mysql') as mysql.Pool;
      
      // Get all tables
      const [tablesResult] = await mysqlConnection.execute(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);

      const tables = [];
      for (const table of (tablesResult as any[])) {
        const tableName = table.table_name;
        
        // Get columns for this table
        const [columnsResult] = await mysqlConnection.execute(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = DATABASE()
          AND table_name = ?
          ORDER BY ordinal_position
        `, [tableName]);

        tables.push({
          name: tableName,
          columns: (columnsResult as any[]).map((col: any) => ({
            name: col.column_name,
            type: col.data_type
          }))
        });
      }

      // Don't close pool - managed by poolManager
      return { tables };
    }

    return null;
  } catch (error: any) {
    logger.error('Error getting database schema', {
      error: error.message,
      dbType: connection.type
    });

    // No cleanup needed - pools are managed by poolManager

    return null;
  }
}
