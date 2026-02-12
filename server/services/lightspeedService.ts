/**
 * Lightspeed Service
 * Helper functions for working with Lightspeed connections
 */

import { db } from '../db';
import { connectionManager, dataSources } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { decryptConnectionData } from '../utils/encryption';
import crypto from 'crypto';

// Encryption helpers (same as in lightspeed.ts)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  throw new Error('ENCRYPTION_KEY must be exactly 64 hex characters');
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

/**
 * Get Lightspeed connection data from connectionManager
 */
export async function getLightspeedConnection(
  userId: number
): Promise<{ accountId: string; accessToken: string; refreshToken: string } | null> {
  try {
    const [connection] = await db
      .select()
      .from(connectionManager)
      .where(
        and(
          eq(connectionManager.userId, userId),
          eq(connectionManager.provider, 'lightspeed'),
          eq(connectionManager.status, 'active'),
        ),
      )
      .limit(1);

    if (!connection || !connection.accessToken || !connection.accountId) {
      return null;
    }

    // Decrypt tokens
    const accessToken = decrypt(connection.accessToken);
    const refreshToken = connection.refreshToken ? decrypt(connection.refreshToken) : '';

    return {
      accountId: connection.accountId,
      accessToken,
      refreshToken,
    };
  } catch (error) {
    logger.error('Error getting Lightspeed connection', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Get Lightspeed connection data from dataSource
 */
export async function getLightspeedConnectionFromDataSource(
  dataSourceId: number,
  userId: number
): Promise<{ accountId: string; accessToken: string; refreshToken: string } | null> {
  try {
    const [dataSource] = await db
      .select()
      .from(dataSources)
      .where(
        and(
          eq(dataSources.id, dataSourceId),
          eq(dataSources.userId, userId),
          eq(dataSources.type, 'lightspeed'),
          eq(dataSources.connectionType, 'live'),
        ),
      )
      .limit(1);

    if (!dataSource || !dataSource.connectionData) {
      return null;
    }

    // Decrypt connection data
    const connectionData = decryptConnectionData(dataSource.connectionData);

    // Get access token - it might be in connectionData or we need to get it from connectionManager
    if (connectionData.accessToken && connectionData.accountId) {
      return {
        accountId: connectionData.accountId,
        accessToken: connectionData.accessToken,
        refreshToken: connectionData.refreshToken || '',
      };
    }

    // If not in connectionData, try to get from connectionManager
    if (connectionData.connectionManagerId) {
      const [connection] = await db
        .select()
        .from(connectionManager)
        .where(eq(connectionManager.id, connectionData.connectionManagerId))
        .limit(1);

      if (connection && connection.accessToken && connection.accountId) {
        const accessToken = decrypt(connection.accessToken);
        const refreshToken = connection.refreshToken ? decrypt(connection.refreshToken) : '';

        return {
          accountId: connection.accountId,
          accessToken,
          refreshToken,
        };
      }
    }

    return null;
  } catch (error) {
    logger.error('Error getting Lightspeed connection from dataSource', {
      dataSourceId,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Refresh Lightspeed access token if needed
 */
export async function ensureValidLightspeedToken(
  userId: number
): Promise<{ accountId: string; accessToken: string } | null> {
  const connection = await db
    .select()
    .from(connectionManager)
    .where(
      and(
        eq(connectionManager.userId, userId),
        eq(connectionManager.provider, 'lightspeed'),
        eq(connectionManager.status, 'active'),
      ),
    )
    .limit(1);

  if (connection.length === 0) {
    return null;
  }

  const conn = connection[0];
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  // Check if token needs refresh
  if (conn.expiresAt && conn.expiresAt < fiveMinutesFromNow) {
    try {
      // Import refresh logic from lightspeed.ts
      const { ensureLightspeedToken } = await import('../routes/lightspeed');
      const tokenData = await ensureLightspeedToken(userId);
      return tokenData;
    } catch (error) {
      logger.error('Failed to refresh Lightspeed token', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  // Token is still valid
  return {
    accountId: conn.accountId!,
    accessToken: decrypt(conn.accessToken!),
  };
}
