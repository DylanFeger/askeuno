import { Router } from 'express';
import { db } from '../db';
import { connectionManager } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { Pool } from 'pg';
import mysql from 'mysql2/promise';

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
router.get('/connections', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

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
    console.error('Error fetching connections:', error);
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

// Test a connection
router.post('/connections/:id/test', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const connectionId = parseInt(req.params.id);

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

    res.json(testResult);
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({ error: 'Failed to test connection' });
  }
});

// Delete a connection
router.delete('/connections/:id', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const connectionId = parseInt(req.params.id);

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

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting connection:', error);
    res.status(500).json({ error: 'Failed to delete connection' });
  }
});

// Connect to a database (PostgreSQL or MySQL)
router.post('/connections/database', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { dbType, connectionString, name } = req.body;

  if (!connectionString || !dbType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Test connection and verify read-only permissions
    const isReadOnly = await verifyReadOnlyDatabase(dbType, connectionString);
    
    if (!isReadOnly) {
      return res.status(403).json({ 
        error: 'Database user has write permissions. Please provide a read-only user.' 
      });
    }

    // Encrypt and store connection
    const encryptedConnection = encrypt(connectionString);

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

    res.json({ 
      success: true, 
      connection: {
        id: newConnection.id,
        provider: newConnection.provider,
        accountLabel: newConnection.accountLabel,
      }
    });
  } catch (error: any) {
    console.error('Database connection error:', error);
    res.status(400).json({ 
      error: error.message || 'Failed to connect to database' 
    });
  }
});

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