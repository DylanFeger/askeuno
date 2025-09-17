import { Router, type Request, type Response } from 'express';
import axios from 'axios';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { storage } from '../storage';
import { logger } from '../utils/logger';
import { encryptConnectionData } from '../utils/encryption';
import crypto from 'crypto';

const router = Router();

/**
 * Register webhooks with Lightspeed
 */
async function registerLightspeedWebhooks(accountId: string, accessToken: string, dataSourceId: number): Promise<boolean> {
  try {
    const webhookToken = crypto.randomBytes(32).toString('hex');
    const webhookSecret = crypto.randomBytes(32).toString('hex');
    const webhookUrl = `${process.env.BASE_URL || 'https://askeuno.com'}/api/webhooks/lightspeed?token=${webhookToken}`;

    // Events to subscribe to
    const events = [
      'Sale.created',
      'Sale.updated', 
      'Item.created',
      'Item.updated',
      'Customer.created',
      'Customer.updated'
    ];

    // Register each webhook event
    for (const event of events) {
      try {
        await axios.post(
          `https://api.lightspeedapp.com/API/Account/${accountId}/Webhook.json`,
          {
            webhook: {
              event: event,
              url: webhookUrl,
              secret: webhookSecret
            }
          },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          }
        );
        
        logger.info('Lightspeed webhook registered', { 
          event, 
          dataSourceId, 
          webhookUrl 
        });
      } catch (error: any) {
        logger.warn('Failed to register Lightspeed webhook', { 
          event, 
          error: error.response?.data || error.message 
        });
        // Continue with other events even if one fails
      }
    }

    // Update data source with webhook configuration
    const connectionData = await storage.getDataSource(dataSourceId);
    if (connectionData) {
      const decryptedData = JSON.parse(connectionData.connectionData);
      const updatedData = {
        ...decryptedData,
        webhookToken,
        webhookSecret,
        webhookUrl
      };
      
      await storage.updateDataSource(dataSourceId, {
        connectionData: encryptConnectionData(updatedData)
      });
    }

    return true;
  } catch (error: any) {
    logger.error('Webhook registration failed', { 
      accountId, 
      dataSourceId, 
      error: error.response?.data || error.message 
    });
    return false;
  }
}

// Lightspeed OAuth configuration
const LIGHTSPEED_CLIENT_ID = process.env.LIGHTSPEED_CLIENT_ID;
const LIGHTSPEED_CLIENT_SECRET = process.env.LIGHTSPEED_CLIENT_SECRET;
// Use production redirect URI for testing
const LIGHTSPEED_REDIRECT_URI = process.env.LIGHTSPEED_REDIRECT_URI || 'https://askeuno.com/api/auth/lightspeed/callback';

// Generate OAuth authorization URL
router.get('/oauth', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!LIGHTSPEED_CLIENT_ID) {
      logger.error('Lightspeed OAuth error: Missing CLIENT_ID');
      return res.status(500).json({ 
        error: 'Lightspeed integration not configured. Please contact support.' 
      });
    }

    // Generate state parameter for security
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const state = `${userId}_${Date.now()}`;
    
    // Store state in session for validation
    (req.session as any).lightspeedOAuthState = state;

    // Construct OAuth URL
    const authUrl = new URL('https://cloud.lightspeedapp.com/oauth/authorize.php');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', LIGHTSPEED_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', LIGHTSPEED_REDIRECT_URI);
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('scope', 'employee:all sale:all item:all customer:all');

    logger.info('Lightspeed OAuth initiated', { 
      userId, 
      state 
    });

    res.json({ 
      authUrl: authUrl.toString(),
      message: 'Redirect to this URL to authorize Lightspeed access'
    });
  } catch (error: any) {
    logger.error('Lightspeed OAuth initiation error', { 
      error, 
      userId: (req as any).user?.id 
    });
    res.status(500).json({ error: 'Failed to initiate OAuth flow' });
  }
});

// Handle OAuth callback
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query;

    // Check for OAuth errors
    if (error) {
      logger.error('Lightspeed OAuth callback error', { 
        error, 
        error_description,
        ip: req.ip 
      });
      return res.redirect(`/connections?error=${encodeURIComponent(error_description as string || 'OAuth authorization failed')}`);
    }

    // Validate state parameter
    const storedState = (req.session as any)?.lightspeedOAuthState;
    if (!state || !storedState || state !== storedState) {
      logger.error('Lightspeed OAuth state mismatch', { 
        receivedState: state, 
        storedState,
        ip: req.ip 
      });
      return res.redirect('/connections?error=Invalid OAuth state');
    }

    if (!code) {
      logger.error('Lightspeed OAuth callback missing code', { ip: req.ip });
      return res.redirect('/connections?error=Authorization code not received');
    }

    if (!LIGHTSPEED_CLIENT_SECRET) {
      logger.error('Lightspeed OAuth error: Missing CLIENT_SECRET');
      return res.redirect('/connections?error=OAuth configuration error');
    }

    // Exchange authorization code for access token
    const tokenResponse = await axios.post(
      'https://cloud.lightspeedapp.com/oauth/access_token.php',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: LIGHTSPEED_CLIENT_ID!,
        client_secret: LIGHTSPEED_CLIENT_SECRET,
        redirect_uri: LIGHTSPEED_REDIRECT_URI,
        code: code as string,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token, expires_in, account_id } = tokenResponse.data;

    if (!access_token || !account_id) {
      logger.error('Lightspeed OAuth token response missing required fields', { 
        response: tokenResponse.data 
      });
      return res.redirect('/connections?error=Invalid token response');
    }

    // Extract user ID from state
    const stateString = Array.isArray(state) ? state[0] : state as string;
    if (!stateString || typeof stateString !== 'string') {
      logger.error('Lightspeed OAuth invalid state parameter', { state });
      return res.redirect('/connections?error=Invalid OAuth state');
    }
    const userId = parseInt(stateString.split('_')[0]);
    if (!userId) {
      logger.error('Lightspeed OAuth invalid user ID from state', { state: stateString });
      return res.redirect('/connections?error=Invalid user session');
    }

    // Verify user exists
    const user = await storage.getUser(userId);
    if (!user) {
      logger.error('Lightspeed OAuth user not found', { userId });
      return res.redirect('/connections?error=User not found');
    }

    // Prepare connection data
    const connectionData = {
      accountId: account_id,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : null,
      environment: 'production'
    };

    // Check if user already has a Lightspeed connection
    const existingConnections = await storage.getDataSourcesByUserId(userId);
    const existingLightspeed = existingConnections.find(conn => conn.type === 'lightspeed');

    let dataSourceId: number;

    if (existingLightspeed) {
      // Update existing connection
      const encryptedData = encryptConnectionData(connectionData);
      await storage.updateDataSource(existingLightspeed.id, {
        connectionData: encryptedData,
        status: 'active',
        lastSyncAt: new Date(),
      });
      
      dataSourceId = existingLightspeed.id;
      logger.info('Lightspeed connection updated', { 
        userId, 
        dataSourceId 
      });
    } else {
      // Create new connection
      const encryptedData = encryptConnectionData(connectionData);
      
      // Test the connection first
      const { connectToDataSource } = await import('../services/dataConnector');
      const testResult = await connectToDataSource('lightspeed', connectionData);
      
      if (!testResult.success) {
        logger.error('Lightspeed connection test failed', { 
          userId, 
          error: testResult.error 
        });
        return res.redirect('/connections?error=Connection test failed: ' + testResult.error);
      }

      const newDataSource = await storage.createDataSource({
        userId,
        name: 'Lightspeed Retail',
        type: 'lightspeed',
        connectionType: 'live',
        connectionData: encryptedData,
        schema: testResult.schema,
        rowCount: testResult.rowCount || 0,
        status: 'active',
        lastSyncAt: new Date(),
        syncFrequency: 60, // 1 hour default
      });

      dataSourceId = newDataSource.id;
      logger.info('Lightspeed connection created', { userId, dataSourceId });
    }

    // Register webhooks for real-time updates
    try {
      const webhookSuccess = await registerLightspeedWebhooks(account_id, access_token, dataSourceId);
      if (webhookSuccess) {
        logger.info('Lightspeed webhooks registered successfully', { 
          userId, 
          dataSourceId, 
          accountId: account_id 
        });
      } else {
        logger.warn('Lightspeed webhook registration failed, but connection still works', { 
          userId, 
          dataSourceId 
        });
      }
    } catch (error: any) {
      logger.error('Webhook registration error', { 
        userId, 
        dataSourceId, 
        error: error.message 
      });
      // Don't fail the OAuth flow if webhooks fail - connection still works
    }

    // Clear OAuth state from session
    delete (req.session as any).lightspeedOAuthState;

    // Redirect back to connections page with success
    res.redirect('/connections?success=lightspeed_connected');
  } catch (error: any) {
    logger.error('Lightspeed OAuth callback error', { 
      error, 
      query: req.query,
      ip: req.ip 
    });
    res.redirect('/connections?error=OAuth callback failed: ' + (error.message || 'Unknown error'));
  }
});

// Refresh access token
router.post('/refresh', requireAuth, async (req: Request, res: Response) => {
  try {
    const { dataSourceId } = req.body;
    
    if (!dataSourceId) {
      return res.status(400).json({ error: 'Data source ID is required' });
    }

    // Get data source
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const dataSource = await storage.getDataSource(dataSourceId);
    if (!dataSource || dataSource.userId !== userId || dataSource.type !== 'lightspeed') {
      return res.status(404).json({ error: 'Lightspeed data source not found' });
    }

    // Decrypt connection data
    const { decryptConnectionData } = await import('../utils/encryption');
    const connectionData = decryptConnectionData(dataSource.connectionData);

    if (!connectionData.refreshToken) {
      return res.status(400).json({ error: 'No refresh token available' });
    }

    // Refresh the token
    const tokenResponse = await axios.post(
      'https://cloud.lightspeedapp.com/oauth/access_token.php',
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: LIGHTSPEED_CLIENT_ID!,
        client_secret: LIGHTSPEED_CLIENT_SECRET!,
        refresh_token: connectionData.refreshToken,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Update connection data
    const updatedConnectionData = {
      ...connectionData,
      accessToken: access_token,
      refreshToken: refresh_token || connectionData.refreshToken,
      expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : connectionData.expiresAt,
    };

    const encryptedData = encryptConnectionData(updatedConnectionData);
    await storage.updateDataSource(dataSourceId, {
      connectionData: encryptedData,
    });

    logger.info('Lightspeed token refreshed', { 
      userId, 
      dataSourceId 
    });

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Lightspeed token refresh error', { 
      error, 
      userId: (req as any).user?.id,
      dataSourceId: req.body.dataSourceId 
    });
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

export default router;
