/**
 * Google Sheets Connector - Standard OAuth Implementation
 * Replaces Replit-specific connector with standard Google OAuth2
 */

import { google } from 'googleapis';
import { logger } from '../utils/logger';
import { db } from '../db';
import { connectionManager } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { decrypt, encrypt } from '../utils/encryption';

// OAuth2 configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 
  `${process.env.APP_URL || 'http://localhost:5000'}/api/oauth/callback/google-sheets`;

// Required scopes for Google Sheets and Drive access
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

// Create OAuth2 client
function createOAuth2Client() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
  }
  
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

/**
 * Generate OAuth authorization URL
 */
export function getGoogleAuthUrl(state: string): string {
  const oauth2Client = createOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_SCOPES,
    state,
    prompt: 'consent', // Force to get refresh token
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = createOAuth2Client();
  
  const { tokens } = await oauth2Client.getToken(code);
  
  return {
    accessToken: tokens.access_token!,
    refreshToken: tokens.refresh_token,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600000),
  };
}

/**
 * Get access token for a user (from database or refresh)
 */
async function getAccessToken(userId: number): Promise<string> {
  // Get connection from database
  const [connection] = await db
    .select()
    .from(connectionManager)
    .where(
      and(
        eq(connectionManager.userId, userId),
        eq(connectionManager.provider, 'google-sheets')
      )
    )
    .limit(1);
  
  if (!connection) {
    throw new Error('Google Sheets not connected. Please connect your Google account first.');
  }
  
  // Check if token is expired
  const expiresAt = connection.tokenExpiresAt ? new Date(connection.tokenExpiresAt) : null;
  const isExpired = expiresAt ? expiresAt.getTime() < Date.now() + 60000 : true; // 1 min buffer
  
  if (!isExpired && connection.accessToken) {
    // Return existing token
    return decrypt(connection.accessToken);
  }
  
  // Token expired, need to refresh
  if (!connection.refreshToken) {
    throw new Error('Google Sheets refresh token not available. Please reconnect your Google account.');
  }
  
  // Refresh the token
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: decrypt(connection.refreshToken),
  });
  
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Update tokens in database
    await db
      .update(connectionManager)
      .set({
        accessToken: encrypt(credentials.access_token!),
        tokenExpiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : new Date(Date.now() + 3600000),
        updatedAt: new Date(),
      })
      .where(eq(connectionManager.id, connection.id));
    
    logger.info('Google Sheets token refreshed', { userId });
    
    return credentials.access_token!;
  } catch (error) {
    logger.error('Failed to refresh Google Sheets token', { userId, error });
    throw new Error('Failed to refresh Google Sheets access. Please reconnect your Google account.');
  }
}

/**
 * Save Google Sheets connection to database
 */
export async function saveGoogleSheetsConnection(
  userId: number,
  accessToken: string,
  refreshToken: string | undefined,
  expiresAt: Date,
  email?: string
) {
  // Check if connection already exists
  const [existing] = await db
    .select()
    .from(connectionManager)
    .where(
      and(
        eq(connectionManager.userId, userId),
        eq(connectionManager.provider, 'google-sheets')
      )
    )
    .limit(1);
  
  if (existing) {
    // Update existing connection
    await db
      .update(connectionManager)
      .set({
        accessToken: encrypt(accessToken),
        refreshToken: refreshToken ? encrypt(refreshToken) : existing.refreshToken,
        tokenExpiresAt: expiresAt,
        accountId: email || existing.accountId,
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(connectionManager.id, existing.id));
    
    logger.info('Google Sheets connection updated', { userId, email });
    return existing.id;
  }
  
  // Create new connection
  const [newConnection] = await db
    .insert(connectionManager)
    .values({
      userId,
      provider: 'google-sheets',
      accessToken: encrypt(accessToken),
      refreshToken: refreshToken ? encrypt(refreshToken) : null,
      tokenExpiresAt: expiresAt,
      accountId: email,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  
  logger.info('Google Sheets connection created', { userId, email });
  return newConnection.id;
}

/**
 * Get Google Sheets client for a user
 * WARNING: Never cache this client - tokens can expire
 */
export async function getGoogleSheetClientForUser(userId: number) {
  const accessToken = await getAccessToken(userId);
  
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken,
  });
  
  return google.sheets({ version: 'v4', auth: oauth2Client });
}

/**
 * Get Google Drive client for a user (for listing spreadsheets)
 */
export async function getGoogleDriveClientForUser(userId: number) {
  const accessToken = await getAccessToken(userId);
  
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken,
  });
  
  return google.drive({ version: 'v3', auth: oauth2Client });
}

// Legacy function - kept for backward compatibility
// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableGoogleSheetClient() {
  throw new Error(
    'getUncachableGoogleSheetClient() is deprecated. ' +
    'Use getGoogleSheetClientForUser(userId) instead.'
  );
}

/**
 * Check if Google Sheets is connected for a user
 */
export async function isGoogleSheetsConnected(userId: number): Promise<boolean> {
  try {
    const [connection] = await db
      .select()
      .from(connectionManager)
      .where(
        and(
          eq(connectionManager.userId, userId),
          eq(connectionManager.provider, 'google-sheets'),
          eq(connectionManager.status, 'active')
        )
      )
      .limit(1);
    
    return !!connection;
  } catch (error) {
    return false;
  }
}

/**
 * Disconnect Google Sheets for a user
 */
export async function disconnectGoogleSheets(userId: number): Promise<boolean> {
  try {
    await db
      .update(connectionManager)
      .set({
        status: 'disconnected',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(connectionManager.userId, userId),
          eq(connectionManager.provider, 'google-sheets')
        )
      );
    
    logger.info('Google Sheets disconnected', { userId });
    return true;
  } catch (error) {
    logger.error('Error disconnecting Google Sheets', { userId, error });
    return false;
  }
}

/**
 * List all spreadsheets accessible to the user
 */
export async function listSpreadsheets(userId: number) {
  try {
    const drive = await getGoogleDriveClientForUser(userId);
    
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet'",
      pageSize: 100,
      fields: 'files(id, name, modifiedTime, webViewLink)',
      orderBy: 'modifiedTime desc',
    });
    
    return response.data.files || [];
  } catch (error: any) {
    logger.error('Error listing spreadsheets', { userId, error: error.message });
    throw new Error('Failed to list spreadsheets');
  }
}

/**
 * Get spreadsheet data
 */
export async function getSpreadsheetData(userId: number, spreadsheetId: string, range: string = 'A1:ZZ') {
  try {
    const sheets = await getGoogleSheetClientForUser(userId);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    
    return response.data.values || [];
  } catch (error: any) {
    logger.error('Error fetching spreadsheet data', { 
      userId,
      spreadsheetId, 
      range,
      error: error.message,
    });
    throw new Error('Failed to fetch spreadsheet data');
  }
}

/**
 * Get spreadsheet metadata (title, sheets, etc.)
 */
export async function getSpreadsheetMetadata(userId: number, spreadsheetId: string) {
  try {
    const sheets = await getGoogleSheetClientForUser(userId);
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    
    return {
      title: response.data.properties?.title,
      sheets: response.data.sheets?.map(sheet => ({
        title: sheet.properties?.title,
        sheetId: sheet.properties?.sheetId,
        index: sheet.properties?.index,
        rowCount: sheet.properties?.gridProperties?.rowCount,
        columnCount: sheet.properties?.gridProperties?.columnCount,
      })) || [],
    };
  } catch (error: any) {
    logger.error('Error fetching spreadsheet metadata', { 
      userId,
      spreadsheetId,
      error: error.message,
    });
    throw new Error('Failed to fetch spreadsheet metadata');
  }
}

/**
 * Import data from a Google Sheet into Euno
 */
export async function importGoogleSheet(
  userId: number,
  spreadsheetId: string,
  sheetName?: string
) {
  try {
    // Get metadata first
    const metadata = await getSpreadsheetMetadata(userId, spreadsheetId);
    
    // Determine which sheet to import
    const targetSheet = sheetName 
      ? metadata.sheets.find(s => s.title === sheetName)
      : metadata.sheets[0];
    
    if (!targetSheet) {
      throw new Error('Sheet not found');
    }
    
    // Get the data
    const range = `'${targetSheet.title}'!A1:ZZ`;
    const data = await getSpreadsheetData(userId, spreadsheetId, range);
    
    if (!data || data.length === 0) {
      throw new Error('No data found in spreadsheet');
    }
    
    // First row is headers
    const headers = data[0] as string[];
    const rows = data.slice(1);
    
    // Convert to structured data
    const structuredData = rows.map(row => {
      const obj: Record<string, any> = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || null;
      });
      return obj;
    });
    
    return {
      title: metadata.title,
      sheetName: targetSheet.title,
      headers,
      rowCount: rows.length,
      data: structuredData,
    };
  } catch (error: any) {
    logger.error('Error importing Google Sheet', { 
      userId,
      spreadsheetId,
      sheetName,
      error: error.message,
    });
    throw error;
  }
}
