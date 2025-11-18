import { Router, Request, Response } from 'express';
import { db } from '../db';
import { connectionManager } from '@shared/schema';
import crypto from 'crypto';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// PKCE helpers
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// Generate state for CSRF protection
function generateState(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Encryption helpers (reuse from connections.ts)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// OAuth endpoints for each provider

// Google Sheets OAuth
router.get('/auth/google_sheets/connect', requireAuth, (req, res) => {

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Store state and verifier in session for validation
  req.session.oauthState = state;
  req.session.codeVerifier = codeVerifier;
  req.session.oauthProvider = 'google_sheets';

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: `${process.env.APP_URL}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  res.redirect(authUrl);
});

// QuickBooks OAuth
router.get('/auth/quickbooks/connect', (req, res) => {
  if (!req.user) {
    return res.redirect('/signin?error=unauthorized');
  }

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  req.session.oauthState = state;
  req.session.codeVerifier = codeVerifier;
  req.session.oauthProvider = 'quickbooks';

  const params = new URLSearchParams({
    client_id: process.env.QUICKBOOKS_CLIENT_ID || '',
    redirect_uri: `${process.env.APP_URL}/api/auth/quickbooks/callback`,
    response_type: 'code',
    scope: 'com.intuit.quickbooks.accounting.read',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const authUrl = `https://appcenter.intuit.com/connect/oauth2?${params}`;
  res.redirect(authUrl);
});

// Lightspeed OAuth
router.get('/auth/lightspeed/connect', (req, res) => {
  if (!req.user) {
    return res.redirect('/signin?error=unauthorized');
  }

  // Get store URL from query parameter
  const storeUrl = req.query.store_url as string;
  if (!storeUrl) {
    return res.redirect('/lightspeed-setup?error=missing_store_url');
  }

  const state = generateState();
  req.session.oauthState = state;
  req.session.oauthProvider = 'lightspeed';
  req.session.lightspeedStoreUrl = storeUrl; // Store for later use

  const params = new URLSearchParams({
    client_id: process.env.LIGHTSPEED_CLIENT_ID || '',
    redirect_uri: `${process.env.APP_URL}/api/auth/lightspeed/callback`,
    response_type: 'code',
    scope: 'employee:reports employee:inventory employee:customers',
    state: state,
  });

  // Use the user's specific store URL
  const authUrl = `https://${storeUrl}/oauth/authorize?${params}`;
  console.log('Lightspeed OAuth initiated', { userId: req.user.id, storeUrl });
  res.redirect(authUrl);
});

// Stripe OAuth (uses Stripe Connect)
router.get('/auth/stripe/connect', (req, res) => {
  if (!req.user) {
    return res.redirect('/signin?error=unauthorized');
  }

  const state = generateState();
  req.session.oauthState = state;
  req.session.oauthProvider = 'stripe';

  const params = new URLSearchParams({
    client_id: process.env.STRIPE_CLIENT_ID || '',
    redirect_uri: `${process.env.APP_URL}/api/auth/stripe/callback`,
    response_type: 'code',
    scope: 'read_only',
    state: state,
  });

  const authUrl = `https://connect.stripe.com/oauth/authorize?${params}`;
  res.redirect(authUrl);
});

// Generic OAuth callback handler
router.get('/auth/:provider/callback', async (req, res) => {
  if (!req.user) {
    return res.redirect('/signin?error=unauthorized');
  }

  const { provider } = req.params;
  const { code, state, error } = req.query;

  // Handle OAuth errors
  if (error) {
    console.error(`OAuth error for ${provider}:`, error);
    return res.redirect(`/connections?error=${error}`);
  }

  // Verify state for CSRF protection
  if (state !== req.session.oauthState) {
    console.error('State mismatch in OAuth callback');
    return res.redirect('/connections?error=state_mismatch');
  }

  // Verify provider matches
  if (provider !== req.session.oauthProvider) {
    console.error('Provider mismatch in OAuth callback');
    return res.redirect('/connections?error=provider_mismatch');
  }

  try {
    let tokenData: any = {};
    let accountLabel = '';
    let scopes: string[] = [];

    // Exchange code for tokens based on provider
    switch (provider) {
      case 'google':
        tokenData = await exchangeGoogleCode(code as string, req.session.codeVerifier || '');
        accountLabel = 'Google Sheets';
        scopes = ['spreadsheets.readonly', 'drive.readonly'];
        break;
      
      case 'quickbooks':
        tokenData = await exchangeQuickBooksCode(code as string, req.session.codeVerifier || '');
        accountLabel = 'QuickBooks Online';
        scopes = ['accounting.read'];
        break;
      
      case 'lightspeed':
        tokenData = await exchangeLightspeedCode(code as string, req.session.lightspeedStoreUrl);
        accountLabel = `Lightspeed (${req.session.lightspeedStoreUrl})`;
        scopes = ['reports', 'inventory', 'customers'];
        break;
      
      case 'stripe':
        tokenData = await exchangeStripeCode(code as string);
        accountLabel = 'Stripe';
        scopes = ['read_only'];
        break;
      
      default:
        throw new Error('Unknown provider');
    }

    // Encrypt tokens before storing
    const encryptedTokens = encrypt(JSON.stringify({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_at,
    }));

    // Store connection in database
    await db.insert(connectionManager).values({
      userId: req.user.id,
      provider: provider === 'google' ? 'google_sheets' : provider,
      accountLabel: accountLabel,
      scopesGranted: scopes,
      tokenMetadata: encryptedTokens,
      status: 'active',
      healthStatus: 'healthy',
      expiresAt: tokenData.expires_at ? new Date(tokenData.expires_at) : null,
    });

    // Clean up session
    delete req.session.oauthState;
    delete req.session.codeVerifier;
    delete req.session.oauthProvider;

    res.redirect(`/chat?source=${provider}`);
  } catch (error) {
    console.error(`Error in OAuth callback for ${provider}:`, error);
    res.redirect('/connections?error=token_exchange_failed');
  }
});

// Token exchange functions for each provider
async function exchangeGoogleCode(code: string, codeVerifier: string): Promise<any> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: `${process.env.APP_URL}/api/auth/google/callback`,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange Google code');
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in * 1000),
  };
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
      redirect_uri: `${process.env.APP_URL}/api/auth/quickbooks/callback`,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange QuickBooks code');
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in * 1000),
  };
}

async function exchangeLightspeedCode(code: string, storeUrl?: string): Promise<any> {
  // Use the store URL if provided, otherwise use the default cloud URL
  const tokenUrl = storeUrl 
    ? `https://${storeUrl}/oauth/access_token`
    : 'https://cloud.lightspeedapp.com/oauth/access_token';
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.LIGHTSPEED_CLIENT_ID || '',
      client_secret: process.env.LIGHTSPEED_CLIENT_SECRET || '',
      redirect_uri: `${process.env.APP_URL}/api/auth/lightspeed/callback`,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange Lightspeed code');
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in * 1000),
    store_url: storeUrl, // Store for later API calls
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
    throw new Error('Failed to exchange Stripe code');
  }

  const data = await response.json();
  return {
    access_token: data.stripe_user_id, // Stripe uses account ID as identifier
    refresh_token: data.refresh_token,
    expires_at: null, // Stripe tokens don't expire
  };
}

export default router;