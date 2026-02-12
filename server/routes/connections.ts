import { Router, Request, Response } from 'express';
import { db } from '../db';
import { connectionManager, dataSources } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { Pool } from 'pg';
import mysql from 'mysql2/promise';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { getDatabaseSchema } from '../services/databaseQueryService';

const router = Router();

// Encryption helpers for secure token storage
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
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

// Get all connections for the authenticated user
router.get('/connections', requireAuth, (async (req: AuthenticatedRequest, res: Response) => {
  logger.info('Fetching connections', { userId: req.user.id });
  
  try {
    const connections = await db
      .select({
        id: connectionManager.id,
        provider: connectionManager.provider,
        accountLabel: connectionManager.accountLabel,
        scopesGranted: connectionManager.scopesGranted,
        status: connectionManager.status,
        healthStatus: connectionManager.healthStatus,
        createdAt: connectionManager.createdAt,
        lastUsedAt: connectionManager.lastUsedAt,
      })
      .from(connectionManager)
      .where(and(
        eq(connectionManager.userId, req.user.id),
        eq(connectionManager.status, 'active')
      ));

    res.json(connections);
  } catch (error) {
    logger.error('Error fetching connections', { error, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
}) as any);

// Test a connection
router.post('/connections/:id/test', requireAuth, (async (req: AuthenticatedRequest, res: Response) => {
  const connectionId = parseInt(req.params.id);
  logger.info('Testing connection', { userId: req.user.id, connectionId });

  try {
    const [connection] = await db
      .select()
      .from(connectionManager)
      .where(and(
        eq(connectionManager.id, connectionId),
        eq(connectionManager.userId, req.user.id)
      ));

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    let testResult = { success: false, message: '' };

    // Test based on provider type
    switch (connection.provider) {
      case 'database':
        testResult = await testDatabaseConnection(connection);
        break;
      case 'google_sheets':
        testResult = await testGoogleSheetsConnection(connection);
        break;
      case 'quickbooks':
        testResult = await testQuickBooksConnection(connection);
        break;
      case 'lightspeed':
        testResult = await testLightspeedConnection(connection);
        break;
      case 'stripe':
        testResult = await testStripeConnection(connection);
        break;
      default:
        testResult = { success: false, message: 'Unknown provider' };
    }

    // Update health status
    await db
      .update(connectionManager)
      .set({
        healthStatus: testResult.success ? 'healthy' : 'unhealthy',
        lastHealthCheck: new Date(),
      })
      .where(eq(connectionManager.id, connectionId));

    logger.info('Connection test completed', { 
      userId: req.user.id, 
      connectionId,
      provider: connection.provider,
      success: testResult.success 
    });

    res.json(testResult);
  } catch (error) {
    logger.error('Connection test failed', { 
      userId: req.user.id, 
      connectionId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    res.status(500).json({ error: 'Failed to test connection' });
  }
}) as any);

// Delete a connection
router.delete('/connections/:id', requireAuth, (async (req: AuthenticatedRequest, res: Response) => {
  const connectionId = parseInt(req.params.id);
  logger.info('Revoking connection', { userId: req.user.id, connectionId });

  try {
    // Mark as revoked instead of deleting for audit trail
    await db
      .update(connectionManager)
      .set({
        status: 'revoked',
        revokedAt: new Date(),
        tokenMetadata: null, // Clear tokens
        connectionString: null, // Clear connection strings
      })
      .where(and(
        eq(connectionManager.id, connectionId),
        eq(connectionManager.userId, req.user.id)
      ));

    logger.info('Connection revoked successfully', { 
      userId: req.user.id, 
      connectionId,
      action: 'connection_revoked'
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to revoke connection', { 
      userId: req.user.id, 
      connectionId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    res.status(500).json({ error: 'Failed to delete connection' });
  }
}) as any);

// Connect to a database (PostgreSQL or MySQL)
router.post('/connections/database', requireAuth, (async (req: AuthenticatedRequest, res: Response) => {
  const { dbType, connectionString, name } = req.body;
  
  logger.info('Attempting database connection', { 
    userId: req.user.id, 
    dbType,
    dbName: name || 'unnamed' 
  });

  if (!connectionString || !dbType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Test connection and verify read-only permissions
    const isReadOnly = await verifyReadOnlyDatabase(dbType, connectionString);
    
    if (!isReadOnly) {
      logger.warn('Database connection rejected - write permissions detected', { 
        userId: req.user.id, 
        dbType,
        action: 'connection_rejected'
      });
      return res.status(403).json({ 
        error: 'Database user has write permissions. Please provide a read-only user.' 
      });
    }

    // Encrypt and store connection
    const encryptedConnection = encrypt(connectionString);

    // Get database schema for the data source
    let schema: any = null;
    let rowCount = 0;
    try {
      const dbConnection = {
        type: dbType === 'mysql' ? 'mysql' as const : 'postgres' as const,
        connectionString,
        isReadOnly: true
      };
      const schemaResult = await getDatabaseSchema(dbConnection);
      if (schemaResult) {
        // Convert schema to the format expected by dataSources
        const schemaObj: any = {};
        for (const table of schemaResult.tables) {
          for (const column of table.columns) {
            // Use table.column as key to avoid conflicts
            const key = `${table.name}.${column.name}`;
            schemaObj[key] = {
              name: column.name,
              type: column.type,
              table: table.name
            };
          }
        }
        schema = schemaObj;
        // Estimate row count (we'll update this on first sync)
        rowCount = 0;
      }
    } catch (schemaError) {
      logger.warn('Could not fetch database schema', {
        error: schemaError instanceof Error ? schemaError.message : 'Unknown error',
        dbType
      });
      // Continue without schema - it can be fetched later
    }

    // Create connectionManager entry
    const [newConnection] = await db
      .insert(connectionManager)
      .values({
        userId: req.user.id,
        provider: 'database',
        accountLabel: name || `${dbType} Database`,
        scopesGranted: ['read'],
        connectionString: encryptedConnection,
        isReadOnly: true,
        status: 'active',
        healthStatus: 'healthy',
      })
      .returning();

    // Also create a dataSource entry so the chat system can use it
    // Store the encrypted connection string directly (same as connectionManager)
    const encryptedConnectionData = encryptedConnection;

    const [newDataSource] = await db
      .insert(dataSources)
      .values({
        userId: req.user.id,
        name: name || `${dbType} Database`,
        type: dbType === 'mysql' ? 'mysql' : 'postgres',
        connectionType: 'live',
        connectionData: encryptedConnectionData,
        schema: schema,
        rowCount: rowCount,
        status: 'active',
        lastSyncAt: new Date(),
      })
      .returning();

    logger.info('Database connection established successfully', { 
      userId: req.user.id, 
      connectionId: newConnection.id,
      dataSourceId: newDataSource.id,
      dbType,
      action: 'connection_created'
    });

    res.json({ 
      success: true, 
      connection: {
        id: newConnection.id,
        provider: newConnection.provider,
        accountLabel: newConnection.accountLabel,
      },
      dataSource: {
        id: newDataSource.id,
        name: newDataSource.name,
        type: newDataSource.type
      }
    });
  } catch (error: any) {
    logger.error('Database connection failed', { 
      userId: req.user.id, 
      dbType,
      error: error.message || 'Unknown error',
      action: 'connection_failed'
    });
    res.status(400).json({ 
      error: error.message || 'Failed to connect to database' 
    });
  }
}) as any);

// Helper function to verify read-only database permissions
async function verifyReadOnlyDatabase(dbType: string, connectionString: string): Promise<boolean> {
  if (dbType === 'postgres') {
    const pool = new Pool({ connectionString });
    
    try {
      // Test SELECT permission
      await pool.query('SELECT 1');
      
      // Test write permissions (should fail for read-only)
      try {
        await pool.query('CREATE TEMP TABLE test_write_permission (id INT)');
        await pool.query('DROP TABLE IF EXISTS test_write_permission');
        // If we can create/drop, user has write permissions
        return false;
      } catch (writeError) {
        // Write failed, which is what we want
        return true;
      }
    } catch (error) {
      throw new Error('Failed to connect to database');
    } finally {
      await pool.end();
    }
  } else if (dbType === 'mysql') {
    const connection = await mysql.createConnection(connectionString);
    
    try {
      // Test SELECT permission
      await connection.execute('SELECT 1');
      
      // Test write permissions
      try {
        await connection.execute('CREATE TEMPORARY TABLE test_write (id INT)');
        await connection.execute('DROP TEMPORARY TABLE IF EXISTS test_write');
        // If we can create/drop, user has write permissions
        return false;
      } catch (writeError) {
        // Write failed, which is what we want
        return true;
      }
    } catch (error) {
      throw new Error('Failed to connect to database');
    } finally {
      await connection.end();
    }
  }
  
  return false;
}

// Test helper functions for each provider
async function testDatabaseConnection(connection: any): Promise<{ success: boolean; message: string }> {
  if (!connection.connectionString) {
    return { success: false, message: 'No connection string found' };
  }

  try {
    const decryptedConnection = decrypt(connection.connectionString);
    const dbType = connection.accountLabel?.includes('MySQL') ? 'mysql' : 'postgres';
    
    if (dbType === 'postgres') {
      const pool = new Pool({ connectionString: decryptedConnection });
      await pool.query('SELECT 1');
      await pool.end();
    } else {
      const conn = await mysql.createConnection(decryptedConnection);
      await conn.execute('SELECT 1');
      await conn.end();
    }
    
    return { success: true, message: 'Connection successful' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Connection failed' };
  }
}

async function testGoogleSheetsConnection(connection: any): Promise<{ success: boolean; message: string }> {
  // Check if token is expired
  if (connection.expiresAt && new Date(connection.expiresAt) < new Date()) {
    return { success: false, message: 'Token expired - please reconnect' };
  }
  
  // Would make actual API call to Google Sheets API
  return { success: true, message: 'Connection active' };
}

async function testQuickBooksConnection(connection: any): Promise<{ success: boolean; message: string }> {
  // Check if token is expired
  if (connection.expiresAt && new Date(connection.expiresAt) < new Date()) {
    return { success: false, message: 'Token expired - please reconnect' };
  }
  
  // Would make actual API call to QuickBooks API
  return { success: true, message: 'Connection active' };
}

async function testLightspeedConnection(connection: any): Promise<{ success: boolean; message: string }> {
  // Check if token is expired
  if (connection.expiresAt && new Date(connection.expiresAt) < new Date()) {
    return { success: false, message: 'Token expired - please reconnect' };
  }
  
  // Would make actual API call to Lightspeed API
  return { success: true, message: 'Connection active' };
}

async function testStripeConnection(connection: any): Promise<{ success: boolean; message: string }> {
  // Stripe uses long-lived API keys, so mainly check if they exist
  if (!connection.tokenMetadata) {
    return { success: false, message: 'No credentials found' };
  }
  
  // Would make actual API call to Stripe API
  return { success: true, message: 'Connection active' };
}

export default router;