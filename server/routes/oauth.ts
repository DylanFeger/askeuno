import { Router } from 'express';
import { storage } from '../storage';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const router = Router();

// OAuth configuration for different providers
const OAUTH_CONFIG = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: {
      sheets: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      ads: ['https://www.googleapis.com/auth/adwords'],
      analytics: ['https://www.googleapis.com/auth/analytics.readonly'],
      drive: ['https://www.googleapis.com/auth/drive.readonly'],
    }
  },
  quickbooks: {
    authUrl: 'https://appcenter.intuit.com/connect/oauth2',
    tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    scopes: ['com.intuit.quickbooks.accounting']
  },
  xero: {
    authUrl: 'https://login.xero.com/identity/connect/authorize',
    tokenUrl: 'https://identity.xero.com/connect/token',
    scopes: ['accounting.transactions.read', 'accounting.reports.read']
  },
  stripe: {
    authUrl: 'https://connect.stripe.com/oauth/authorize',
    tokenUrl: 'https://connect.stripe.com/oauth/token',
    scopes: ['read_only']
  },
  facebook: {
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    scopes: ['pages_show_list', 'pages_read_engagement', 'read_insights']
  },
  instagram: {
    authUrl: 'https://api.instagram.com/oauth/authorize',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
    scopes: ['business_basic', 'business_manage_messages', 'business_manage_comments']
  }
};

// Store OAuth states temporarily (in production, use Redis or database)
const oauthStates = new Map<string, { userId: number; service: string; redirect: string; timestamp: number }>();

// Clean up old states periodically
setInterval(() => {
  const now = Date.now();
  oauthStates.forEach((data, state) => {
    if (now - data.timestamp > 600000) { // 10 minutes
      oauthStates.delete(state);
    }
  });
}, 60000); // Check every minute

// Generic OAuth initiation handler
router.get('/auth/:provider/:service', async (req, res) => {
  try {
    const { provider, service } = req.params;
    const { redirect } = req.query;
    
    // Get user from session
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.redirect('/signin?error=auth_required');
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    oauthStates.set(state, {
      userId,
      service: `${provider}/${service}`,
      redirect: redirect as string || '/connections',
      timestamp: Date.now()
    });

    // Get OAuth configuration
    const config = OAUTH_CONFIG[provider as keyof typeof OAUTH_CONFIG];
    if (!config) {
      logger.error('Unknown OAuth provider', { provider });
      return res.redirect('/connections?error=unknown_provider');
    }

    // Build authorization URL based on provider
    let authUrl = config.authUrl;
    const params = new URLSearchParams();

    // Get client credentials from environment
    const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
    const redirectUri = `${process.env.VITE_APP_URL || 'http://localhost:5173'}/auth/callback/${provider}`;

    if (!clientId) {
      logger.error('Missing OAuth client ID', { provider });
      return res.redirect('/connections?error=config_error');
    }

    // Common OAuth parameters
    params.append('client_id', clientId);
    params.append('redirect_uri', redirectUri);
    params.append('state', state);
    params.append('response_type', 'code');
    
    // Add scopes based on service
    const serviceScopes = config.scopes && config.scopes[service as keyof typeof config.scopes];
    const scopes = serviceScopes || [];
    if (Array.isArray(scopes) && scopes.length > 0) {
      params.append('scope', scopes.join(' '));
    }

    // Provider-specific parameters
    if (provider === 'google') {
      params.append('access_type', 'offline');
      params.append('prompt', 'consent');
    } else if (provider === 'quickbooks') {
      params.append('response_type', 'code');
    } else if (provider === 'xero') {
      params.append('response_type', 'code');
    }

    // Redirect to OAuth provider
    const fullAuthUrl = `${authUrl}?${params.toString()}`;
    res.redirect(fullAuthUrl);

  } catch (error) {
    logger.error('OAuth initiation error', { error });
    res.redirect('/connections?error=oauth_init_failed');
  }
});

// OAuth callback handler
router.get('/callback/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state, error } = req.query;

    // Handle OAuth errors
    if (error) {
      logger.error('OAuth callback error', { provider, error });
      return res.redirect('/connections?error=oauth_denied');
    }

    // Verify state
    const stateData = oauthStates.get(state as string);
    if (!stateData) {
      logger.error('Invalid OAuth state', { state });
      return res.redirect('/connections?error=invalid_state');
    }

    // Clean up state
    oauthStates.delete(state as string);

    // Exchange code for token
    const config = OAUTH_CONFIG[provider as keyof typeof OAUTH_CONFIG];
    if (!config) {
      return res.redirect('/connections?error=unknown_provider');
    }

    const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
    const clientSecret = process.env[`${provider.toUpperCase()}_CLIENT_SECRET`];
    const redirectUri = `${process.env.VITE_APP_URL || 'http://localhost:5173'}/auth/callback/${provider}`;

    if (!clientId || !clientSecret) {
      logger.error('Missing OAuth credentials', { provider });
      return res.redirect('/connections?error=config_error');
    }

    // Exchange authorization code for access token
    const tokenParams = new URLSearchParams();
    tokenParams.append('grant_type', 'authorization_code');
    tokenParams.append('code', code as string);
    tokenParams.append('redirect_uri', redirectUri);
    tokenParams.append('client_id', clientId);
    tokenParams.append('client_secret', clientSecret);

    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logger.error('Token exchange failed', { provider, error: errorText });
      return res.redirect('/connections?error=token_exchange_failed');
    }

    const tokenData = await tokenResponse.json();

    // Store the connection in the database
    const [serviceName] = stateData.service.split('/');
    await storage.createDataSource({
      userId: stateData.userId,
      name: `${serviceName.charAt(0).toUpperCase() + serviceName.slice(1)} Connection`,
      type: serviceName,
      connectionType: 'live',
      connectionData: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : null,
        scope: tokenData.scope
      },
      status: 'active'
    });

    logger.info('OAuth connection established', { provider, userId: stateData.userId });

    // Redirect back to connections page with success
    res.redirect(`${stateData.redirect}?success=connected`);

  } catch (error) {
    logger.error('OAuth callback processing error', { error });
    res.redirect('/connections?error=oauth_callback_failed');
  }
});

export default router;