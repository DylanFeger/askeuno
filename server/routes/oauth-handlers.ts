import { Router, Request, Response } from 'express';
import { db } from '../db';
import { connectionManager, dataSources } from '@shared/schema';
import crypto from 'crypto';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { eq, and } from 'drizzle-orm';

const router = Router();

// Enhanced encryption with environment-based key
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

// PKCE helpers
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

function generateState(): string {
  return crypto.randomBytes(32).toString('hex');
}

// OAuth initiation endpoints
router.get('/auth/google_sheets/connect', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Store in session for CSRF protection
  req.session.oauthState = state;
  req.session.codeVerifier = codeVerifier;
  req.session.oauthProvider = 'google_sheets';

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: `${process.env.APP_URL || 'http://localhost:5000'}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  logger.info('Initiating Google OAuth', { userId: req.user.id });
  res.redirect(authUrl);
});

router.get('/auth/quickbooks/connect', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  req.session.oauthState = state;
  req.session.codeVerifier = codeVerifier;
  req.session.oauthProvider = 'quickbooks';

  const params = new URLSearchParams({
    client_id: process.env.QUICKBOOKS_CLIENT_ID || '',
    redirect_uri: `${process.env.APP_URL || 'http://localhost:5000'}/api/auth/quickbooks/callback`,
    response_type: 'code',
    scope: 'com.intuit.quickbooks.accounting',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const authUrl = `https://appcenter.intuit.com/connect/oauth2?${params}`;
  logger.info('Initiating QuickBooks OAuth', { userId: req.user.id });
  res.redirect(authUrl);
});

router.get('/auth/lightspeed/connect', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const state = generateState();
  req.session.oauthState = state;
  req.session.oauthProvider = 'lightspeed';

  const params = new URLSearchParams({
    client_id: process.env.LIGHTSPEED_CLIENT_ID || '',
    redirect_uri: `${process.env.APP_URL || 'http://localhost:5000'}/api/auth/lightspeed/callback`,
    response_type: 'code',
    scope: 'employee:reports employee:inventory employee:customers',
    state: state,
  });

  const authUrl = `https://cloud.lightspeedapp.com/oauth/authorize?${params}`;
  logger.info('Initiating Lightspeed OAuth', { userId: req.user.id });
  res.redirect(authUrl);
});

router.get('/auth/stripe/connect', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const state = generateState();
  req.session.oauthState = state;
  req.session.oauthProvider = 'stripe';

  const params = new URLSearchParams({
    client_id: process.env.STRIPE_CONNECT_CLIENT_ID || '',
    redirect_uri: `${process.env.APP_URL || 'http://localhost:5000'}/api/auth/stripe/callback`,
    response_type: 'code',
    scope: 'read_only',
    state: state,
  });

  const authUrl = `https://connect.stripe.com/oauth/authorize?${params}`;
  logger.info('Initiating Stripe OAuth', { userId: req.user.id });
  res.redirect(authUrl);
});

// OAuth callback handler
router.get('/auth/:provider/callback', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { provider } = req.params;
  const { code, state, error } = req.query;

  // Handle OAuth errors
  if (error) {
    logger.warn('OAuth error', { provider, error, userId: req.user.id });
    return res.redirect(`/connections?error=${encodeURIComponent(error as string)}`);
  }

  // Verify CSRF state
  if (state !== req.session.oauthState) {
    logger.error('OAuth state mismatch', { provider, userId: req.user.id });
    return res.redirect('/connections?error=invalid_state');
  }

  try {
    let tokenData: any = {};
    let accountLabel = '';
    let scopes: string[] = [];

    // Exchange authorization code for tokens
    switch (provider) {
      case 'google':
        tokenData = await exchangeGoogleCode(code as string, req.session.codeVerifier);
        accountLabel = await getGoogleAccountLabel(tokenData.access_token);
        scopes = ['spreadsheets.readonly', 'drive.readonly'];
        break;
      
      case 'quickbooks':
        tokenData = await exchangeQuickBooksCode(code as string, req.session.codeVerifier);
        accountLabel = 'QuickBooks Account';
        scopes = ['accounting'];
        break;
      
      case 'lightspeed':
        tokenData = await exchangeLightspeedCode(code as string);
        accountLabel = 'Lightspeed Account';
        scopes = ['reports', 'inventory', 'customers'];
        break;
      
      case 'stripe':
        tokenData = await exchangeStripeCode(code as string);
        accountLabel = `Stripe Account ${tokenData.stripe_user_id}`;
        scopes = ['read_only'];
        break;
      
      default:
        throw new Error('Unknown provider');
    }

    // Check for existing connection
    const existingConnection = await db
      .select()
      .from(connectionManager)
      .where(and(
        eq(connectionManager.userId, req.user.id),
        eq(connectionManager.provider, provider === 'google' ? 'google_sheets' : provider),
        eq(connectionManager.status, 'active')
      ))
      .limit(1);

    if (existingConnection.length > 0) {
      // Update existing connection
      await db
        .update(connectionManager)
        .set({
          tokenMetadata: encrypt(JSON.stringify(tokenData)),
          accountLabel,
          healthStatus: 'healthy',
          lastHealthCheck: new Date(),
          expiresAt: tokenData.expires_at ? new Date(tokenData.expires_at) : null,
        })
        .where(eq(connectionManager.id, existingConnection[0].id));
    } else {
      // Create new connection
      await db.insert(connectionManager).values({
        userId: req.user.id,
        provider: provider === 'google' ? 'google_sheets' : provider,
        accountLabel,
        scopesGranted: scopes,
        tokenMetadata: encrypt(JSON.stringify(tokenData)),
        status: 'active',
        healthStatus: 'healthy',
        lastHealthCheck: new Date(),
        expiresAt: tokenData.expires_at ? new Date(tokenData.expires_at) : null,
      });
    }

    // Clean up session
    delete req.session.oauthState;
    delete req.session.codeVerifier;
    delete req.session.oauthProvider;

    logger.info('OAuth connection successful', { provider, userId: req.user.id });
    res.redirect('/connections?success=true');
  } catch (error: any) {
    logger.error('OAuth callback error', { provider, error: error.message, userId: req.user.id });
    res.redirect(`/connections?error=${encodeURIComponent('Failed to connect. Please try again.')}`);
  }
});

// Token exchange functions
async function exchangeGoogleCode(code: string, codeVerifier: string): Promise<any> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: `${process.env.APP_URL || 'http://localhost:5000'}/api/auth/google/callback`,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google token exchange failed: ${error}`);
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in * 1000),
  };
}

async function getGoogleAccountLabel(accessToken: string): Promise<string> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.email || 'Google Account';
    }
  } catch (error) {
    logger.warn('Failed to get Google account info', { error });
  }
  return 'Google Account';
}

async function exchangeQuickBooksCode(code: string, codeVerifier: string): Promise<any> {
  const credentials = Buffer.from(
    `${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      code,
      redirect_uri: `${process.env.APP_URL || 'http://localhost:5000'}/api/auth/quickbooks/callback`,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`QuickBooks token exchange failed: ${error}`);
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in * 1000),
    realm_id: data.realmId,
  };
}

async function exchangeLightspeedCode(code: string): Promise<any> {
  const response = await fetch('https://cloud.lightspeedapp.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.LIGHTSPEED_CLIENT_ID || '',
      client_secret: process.env.LIGHTSPEED_CLIENT_SECRET || '',
      redirect_uri: `${process.env.APP_URL || 'http://localhost:5000'}/api/auth/lightspeed/callback`,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Lightspeed token exchange failed: ${error}`);
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in * 1000),
    account_id: data.account_id,
  };
}

async function exchangeStripeCode(code: string): Promise<any> {
  const response = await fetch('https://connect.stripe.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_secret: process.env.STRIPE_CLIENT_SECRET || '',
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Stripe token exchange failed: ${error}`);
  }

  const data = await response.json();
  return {
    stripe_user_id: data.stripe_user_id,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: null, // Stripe tokens don't expire
  };
}

export default router;