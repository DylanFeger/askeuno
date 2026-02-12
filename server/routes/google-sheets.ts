/**
 * Google Sheets OAuth Routes
 * Handles OAuth flow and data import from Google Sheets
 */

import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  getGoogleAuthUrl,
  exchangeCodeForTokens,
  saveGoogleSheetsConnection,
  isGoogleSheetsConnected,
  disconnectGoogleSheets,
  listSpreadsheets,
  getSpreadsheetMetadata,
  importGoogleSheet,
} from '../services/googleSheetsConnector';
import { google } from 'googleapis';

const router = Router();

/**
 * GET /api/google-sheets/auth - Initiate OAuth flow
 */
router.get('/auth', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Create state with user ID for callback verification
    const state = Buffer.from(JSON.stringify({
      userId,
      timestamp: Date.now(),
    })).toString('base64');
    
    const authUrl = getGoogleAuthUrl(state);
    
    logger.info('Google Sheets OAuth initiated', { userId });
    
    res.json({ authUrl });
  } catch (error: any) {
    logger.error('Failed to initiate Google Sheets OAuth', { error: error.message });
    res.status(500).json({ error: error.message || 'Failed to initiate OAuth' });
  }
});

/**
 * GET /api/google-sheets/callback - OAuth callback
 */
router.get('/callback', async (req, res: Response) => {
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      logger.warn('Google Sheets OAuth denied', { error });
      return res.redirect('/connections?error=google_sheets_denied');
    }
    
    if (!code || !state) {
      return res.redirect('/connections?error=invalid_callback');
    }
    
    // Decode state
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    } catch {
      return res.redirect('/connections?error=invalid_state');
    }
    
    const { userId } = stateData;
    
    if (!userId) {
      return res.redirect('/connections?error=invalid_state');
    }
    
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code as string);
    
    // Get user email from token
    let email: string | undefined;
    try {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: tokens.accessToken });
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      email = userInfo.data.email || undefined;
    } catch (e) {
      logger.warn('Could not fetch Google user email', { error: e });
    }
    
    // Save connection
    await saveGoogleSheetsConnection(
      userId,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.expiresAt,
      email
    );
    
    logger.info('Google Sheets connected successfully', { userId, email });
    
    res.redirect('/connections?success=google_sheets_connected');
  } catch (error: any) {
    logger.error('Google Sheets OAuth callback failed', { error: error.message });
    res.redirect('/connections?error=oauth_failed');
  }
});

/**
 * GET /api/google-sheets/status - Check connection status
 */
router.get('/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const connected = await isGoogleSheetsConnected(userId);
    
    res.json({ connected });
  } catch (error: any) {
    logger.error('Failed to check Google Sheets status', { error: error.message });
    res.status(500).json({ error: 'Failed to check status' });
  }
});

/**
 * POST /api/google-sheets/disconnect - Disconnect Google Sheets
 */
router.post('/disconnect', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    await disconnectGoogleSheets(userId);
    
    logger.info('Google Sheets disconnected', { userId });
    
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to disconnect Google Sheets', { error: error.message });
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

/**
 * GET /api/google-sheets/spreadsheets - List user's spreadsheets
 */
router.get('/spreadsheets', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const spreadsheets = await listSpreadsheets(userId);
    
    res.json({ spreadsheets });
  } catch (error: any) {
    logger.error('Failed to list spreadsheets', { error: error.message });
    res.status(500).json({ error: error.message || 'Failed to list spreadsheets' });
  }
});

/**
 * GET /api/google-sheets/spreadsheets/:id - Get spreadsheet metadata
 */
router.get('/spreadsheets/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { id } = req.params;
    const metadata = await getSpreadsheetMetadata(userId, id);
    
    res.json(metadata);
  } catch (error: any) {
    logger.error('Failed to get spreadsheet metadata', { error: error.message });
    res.status(500).json({ error: error.message || 'Failed to get spreadsheet' });
  }
});

/**
 * POST /api/google-sheets/import - Import data from a spreadsheet
 */
router.post('/import', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { spreadsheetId, sheetName } = req.body;
    
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'spreadsheetId is required' });
    }
    
    const result = await importGoogleSheet(userId, spreadsheetId, sheetName);
    
    logger.info('Google Sheet imported', { 
      userId, 
      spreadsheetId, 
      rowCount: result.rowCount 
    });
    
    res.json(result);
  } catch (error: any) {
    logger.error('Failed to import Google Sheet', { error: error.message });
    res.status(500).json({ error: error.message || 'Failed to import spreadsheet' });
  }
});

export default router;
