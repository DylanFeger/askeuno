import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db';
import { connectionManager } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Encryption helpers
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;

// PKCE helpers
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

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

// Validate store URL
function validateStoreUrl(url: string): boolean {
  const regex = /^https:\/\/[a-z0-9-]+\.lightspeedapp\.com\/?$/;
  return regex.test(url);
}

// POST /api/lightspeed/start - Initiate OAuth flow
router.post('/lightspeed/start', requireAuth, async (req: Request, res: Response) => {
  const { storeUrl } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!storeUrl || !validateStoreUrl(storeUrl)) {
    return res.status(400).json({ error: 'Invalid store URL. Must be in format: https://yourstore.lightspeedapp.com' });
  }

  // Generate state for CSRF protection
  const state = crypto.randomBytes(32).toString('hex');
  
  // Generate PKCE parameters
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  
  // Store state and PKCE verifier in session
  req.session.oauthState = state;
  req.session.oauthProvider = 'lightspeed';
  req.session.lightspeedStoreUrl = storeUrl;
  req.session.codeVerifier = codeVerifier;
  (req.session as any).userId = userId;

  // Build authorization URL - support both LS_* and LIGHTSPEED_* env vars
  const authUrl = new URL(process.env.LS_AUTH_URL || process.env.LIGHTSPEED_AUTH_URL || 'https://cloud.lightspeedapp.com/auth/oauth/authorize');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', process.env.LS_CLIENT_ID || process.env.LIGHTSPEED_CLIENT_ID || '');
  authUrl.searchParams.append('redirect_uri', process.env.LS_REDIRECT_URI || process.env.LIGHTSPEED_REDIRECT_URI || `${process.env.APP_URL || 'https://askeuno.com'}/api/oauth/callback/lightspeed`);
  // Using employee:all for comprehensive analytics access
  // For more restricted access, use: 'employee:inventory employee:reports employee:register'
  authUrl.searchParams.append('scope', 'employee:all');
  authUrl.searchParams.append('state', state);
  
  // Add PKCE parameters for enhanced security
  authUrl.searchParams.append('code_challenge', codeChallenge);
  authUrl.searchParams.append('code_challenge_method', 'S256');

  const clientId = process.env.LS_CLIENT_ID || process.env.LIGHTSPEED_CLIENT_ID || '';
  console.log('[Lightspeed OAuth] Starting flow:', {
    userId,
    storeUrl,
    clientId: clientId.substring(0, 10) + '...',
    authUrl: authUrl.toString().substring(0, 150) + '...'
  });
  
  res.json({ redirect: authUrl.toString() });
});

// GET /api/oauth/callback/lightspeed - OAuth callback
router.get('/oauth/callback/lightspeed', async (req: Request, res: Response) => {
  const { code, state } = req.query;

  // Verify state
  if (!state || state !== req.session.oauthState) {
    return res.status(400).send('Invalid state parameter');
  }

  const userId = (req.session as any).userId;
  const storeUrl = req.session.lightspeedStoreUrl;
  const codeVerifier = req.session.codeVerifier;

  if (!userId || !storeUrl || !codeVerifier) {
    console.error('Missing session data:', { userId: !!userId, storeUrl: !!storeUrl, codeVerifier: !!codeVerifier });
    return res.status(400).send('Session expired. Please try connecting again.');
  }

  try {
    // Exchange code for tokens with PKCE
    const tokenUrl = process.env.LS_TOKEN_URL || process.env.LIGHTSPEED_TOKEN_URL || 'https://cloud.lightspeedapp.com/auth/oauth/token';
    const clientId = process.env.LS_CLIENT_ID || process.env.LIGHTSPEED_CLIENT_ID || '';
    const clientSecret = process.env.LS_CLIENT_SECRET || process.env.LIGHTSPEED_CLIENT_SECRET || '';
    const redirectUri = process.env.LS_REDIRECT_URI || process.env.LIGHTSPEED_REDIRECT_URI || `${process.env.APP_URL || 'https://askeuno.com'}/api/oauth/callback/lightspeed`;
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier, // Add PKCE verifier
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      return res.status(502).send('Failed to exchange authorization code');
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, account_id } = tokenData;

    // Calculate expiration time with buffer
    const expiresAt = new Date(Date.now() + (expires_in - 120) * 1000);

    // Encrypt tokens
    const encryptedAccessToken = encrypt(access_token);
    const encryptedRefreshToken = encrypt(refresh_token);

    // Upsert connection
    const existingConnection = await db.select()
      .from(connectionManager)
      .where(and(
        eq(connectionManager.userId, userId),
        eq(connectionManager.provider, 'lightspeed')
      ))
      .limit(1);

    if (existingConnection.length > 0) {
      // Update existing connection
      await db.update(connectionManager)
        .set({
          storeUrl,
          accountId: account_id,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt,
          status: 'active',
          updatedAt: new Date(),
          accountLabel: `Lightspeed - ${storeUrl}`,
          scopesGranted: ['employee:all'], // Full analytics access with employee permissions
        })
        .where(and(
          eq(connectionManager.userId, userId),
          eq(connectionManager.provider, 'lightspeed')
        ));
    } else {
      // Create new connection
      await db.insert(connectionManager).values({
        userId,
        provider: 'lightspeed',
        storeUrl,
        accountId: account_id,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        status: 'active',
        accountLabel: `Lightspeed - ${storeUrl}`,
        scopesGranted: ['employee:all'], // Full analytics access with employee permissions
        isReadOnly: true,
      });
    }

    // Clear session
    delete req.session.oauthState;
    delete req.session.oauthProvider;
    delete req.session.lightspeedStoreUrl;
    delete req.session.codeVerifier;
    delete (req.session as any).userId;

    // Redirect to chat page
    res.redirect('/chat?source=lightspeed');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('An error occurred during authentication');
  }
});

// Helper to ensure valid token
async function ensureLightspeedToken(userId: number): Promise<{ accessToken: string; accountId: string } | null> {
  const connection = await db.select()
    .from(connectionManager)
    .where(and(
      eq(connectionManager.userId, userId),
      eq(connectionManager.provider, 'lightspeed'),
      eq(connectionManager.status, 'active')
    ))
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
      // Refresh token
      const refreshToken = decrypt(conn.refreshToken!);
      const tokenUrl = process.env.LS_TOKEN_URL || process.env.LIGHTSPEED_TOKEN_URL || 'https://cloud.lightspeedapp.com/auth/oauth/token';
      const clientId = process.env.LS_CLIENT_ID || process.env.LIGHTSPEED_CLIENT_ID || '';
      const clientSecret = process.env.LS_CLIENT_SECRET || process.env.LIGHTSPEED_CLIENT_SECRET || '';
      
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Token refresh failed with status:', response.status, 'Error:', errorText);
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = await response.json();
      const newExpiresAt = new Date(Date.now() + (data.expires_in - 120) * 1000);

      // Update tokens
      await db.update(connectionManager)
        .set({
          accessToken: encrypt(data.access_token),
          refreshToken: data.refresh_token ? encrypt(data.refresh_token) : conn.refreshToken,
          expiresAt: newExpiresAt,
          updatedAt: new Date(),
        })
        .where(eq(connectionManager.id, conn.id));

      return {
        accessToken: data.access_token,
        accountId: conn.accountId!,
      };
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Mark connection as unhealthy but don't immediately revoke - might be temporary
      await db.update(connectionManager)
        .set({ 
          healthStatus: 'unhealthy',
          lastHealthCheck: new Date()
        })
        .where(eq(connectionManager.id, conn.id));
      return null;
    }
  }

  return {
    accessToken: decrypt(conn.accessToken!),
    accountId: conn.accountId!,
  };
}

// GET /api/lightspeed/test - Test connection
router.get('/lightspeed/test', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const tokenData = await ensureLightspeedToken(userId);
  if (!tokenData) {
    return res.status(404).json({ error: 'No active Lightspeed connection found' });
  }

  try {
    // Test API call
    const apiUrl = `${process.env.LS_API_BASE || 'https://api.lightspeedapp.com'}/API/Account/${tokenData.accountId}.json`;
    let response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${tokenData.accessToken}`,
        'Accept': 'application/json',
      },
    });

    // If 401, try refreshing token once
    if (response.status === 401) {
      const newTokenData = await ensureLightspeedToken(userId);
      if (!newTokenData) {
        return res.status(502).json({ error: 'Failed to refresh token' });
      }

      response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${newTokenData.accessToken}`,
          'Accept': 'application/json',
        },
      });
    }

    if (!response.ok) {
      throw new Error(`API test failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Update health check
    await db.update(connectionManager)
      .set({
        lastHealthCheck: new Date(),
        healthStatus: 'healthy',
        lastUsedAt: new Date(),
      })
      .where(and(
        eq(connectionManager.userId, userId),
        eq(connectionManager.provider, 'lightspeed')
      ));

    res.json({
      ok: true,
      accountId: tokenData.accountId,
      name: data.Account?.name || 'Unknown',
    });
  } catch (error) {
    console.error('Lightspeed test failed:', error);
    res.status(502).json({ error: 'Failed to connect to Lightspeed API' });
  }
});

// DELETE /api/connections/lightspeed - Disconnect
router.delete('/connections/lightspeed', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  await db.update(connectionManager)
    .set({
      status: 'revoked',
      revokedAt: new Date(),
      accessToken: null,
      refreshToken: null,
      updatedAt: new Date(),
    })
    .where(and(
      eq(connectionManager.userId, userId),
      eq(connectionManager.provider, 'lightspeed')
    ));

  res.json({ ok: true });
});

export default router;