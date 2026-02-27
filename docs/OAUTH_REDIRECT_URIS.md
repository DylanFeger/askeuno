# OAuth Redirect URIs - Production Configuration

**Production Domain**: `askeuno.com`  
**Last Updated**: February 27, 2026

This document lists all OAuth redirect URIs that must be configured in each provider's developer portal for production deployment.

---

## Summary Table

| Provider | Redirect URI | Status | Portal |
|----------|-------------|--------|--------|
| **Lightspeed** | `https://askeuno.com/api/oauth/callback/lightspeed` | ✅ Configured | [Lightspeed Developer Portal](https://developers.lightspeedhq.com/) |
| **Google Sheets** | `https://askeuno.com/api/oauth/callback/google-sheets` | ✅ Configured | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| **Stripe Connect** | `https://askeuno.com/api/auth/stripe/callback` | ✅ Configured | [Stripe Dashboard](https://dashboard.stripe.com/settings/applications) |
| **QuickBooks** | `https://askeuno.com/api/auth/quickbooks/callback` | ✅ Configured | [Intuit Developer](https://developer.intuit.com/) |

---

## Lightspeed OAuth

### Redirect URI
```
https://askeuno.com/api/oauth/callback/lightspeed
```

### Configuration Steps

1. **Go to Lightspeed Developer Portal**
   - URL: https://developers.lightspeedhq.com/
   - Navigate to your R-Series application

2. **Add Redirect URI**
   - Go to OAuth settings
   - Add redirect URI: `https://askeuno.com/api/oauth/callback/lightspeed`
   - **Important**: Must match exactly (including `https://`, no trailing slash)

3. **Environment Variable**
   ```bash
   LS_REDIRECT_URI=https://askeuno.com/api/oauth/callback/lightspeed
   ```

### Implementation
- **File**: `server/routes/lightspeed.ts`
- **Variable**: `LS_REDIRECT_URI` (required, no fallback)
- **Validation**: Script validates exact match

---

## Google OAuth (Google Sheets)

### Redirect URI
```
https://askeuno.com/api/oauth/callback/google-sheets
```

### Configuration Steps

1. **Go to Google Cloud Console**
   - URL: https://console.cloud.google.com/apis/credentials
   - Select your project

2. **Edit OAuth 2.0 Client**
   - Click on your OAuth 2.0 Client ID
   - Under "Authorized redirect URIs", click "ADD URI"
   - Add: `https://askeuno.com/api/oauth/callback/google-sheets`
   - Save

3. **Environment Variable** (Optional)
   ```bash
   GOOGLE_REDIRECT_URI=https://askeuno.com/api/oauth/callback/google-sheets
   ```
   If not set, it will be constructed from `APP_URL`.

### Implementation
- **File**: `server/services/googleSheetsConnector.ts`
- **Variable**: `GOOGLE_REDIRECT_URI` (optional, falls back to `APP_URL`)
- **Fallback**: `${APP_URL}/api/oauth/callback/google-sheets`

### Required Scopes
- `https://www.googleapis.com/auth/spreadsheets.readonly`
- `https://www.googleapis.com/auth/drive.readonly`
- `https://www.googleapis.com/auth/userinfo.email`

---

## Stripe Connect OAuth

### Redirect URI
```
https://askeuno.com/api/auth/stripe/callback
```

### Configuration Steps

1. **Go to Stripe Dashboard**
   - URL: https://dashboard.stripe.com/settings/applications
   - Navigate to Connect settings

2. **Add Redirect URI** (if using Stripe Connect)
   - Add redirect URI: `https://askeuno.com/api/auth/stripe/callback`
   - Save

3. **Environment Variable**
   - Constructed from `APP_URL` environment variable
   - No separate redirect URI variable needed

### Implementation
- **File**: `server/routes/oauth-handlers.ts`
- **Variable**: Constructed from `APP_URL`
- **Pattern**: `${APP_URL}/api/auth/stripe/callback`

---

## QuickBooks OAuth

### Redirect URI
```
https://askeuno.com/api/auth/quickbooks/callback
```

### Configuration Steps

1. **Go to Intuit Developer**
   - URL: https://developer.intuit.com/
   - Navigate to your app

2. **Add Redirect URI**
   - Go to Keys & OAuth
   - Add redirect URI: `https://askeuno.com/api/auth/quickbooks/callback`
   - Save

3. **Environment Variable**
   - Constructed from `APP_URL` environment variable

### Implementation
- **File**: `server/routes/oauth-handlers.ts`
- **Variable**: Constructed from `APP_URL`
- **Pattern**: `${APP_URL}/api/auth/quickbooks/callback`

---

## Local Development Redirect URIs

For local development, use these redirect URIs:

| Provider | Local Redirect URI |
|----------|-------------------|
| **Lightspeed** | `http://localhost:5000/api/oauth/callback/lightspeed` |
| **Google Sheets** | `http://localhost:5000/api/oauth/callback/google-sheets` |
| **Stripe Connect** | `http://localhost:5000/api/auth/stripe/callback` |
| **QuickBooks** | `http://localhost:5000/api/auth/quickbooks/callback` |

**Note**: Add both production and local redirect URIs in each provider's portal for flexibility.

---

## Validation

### Check Redirect URIs

Run the validation script to verify all redirect URIs:
```bash
node scripts/validate-credentials.cjs
```

This will check:
- ✅ Lightspeed redirect URI matches exactly
- ✅ Google redirect URI is set or can be constructed
- ✅ All redirect URIs use production domain

### Common Issues

**"Invalid redirect_uri" Error**
- **Cause**: Redirect URI doesn't match exactly in provider's portal
- **Fix**: Verify redirect URI in provider's developer portal matches exactly (including https/http, no trailing slash)

**"LS_REDIRECT_URI must be set" Error**
- **Cause**: Lightspeed redirect URI not set in environment
- **Fix**: Set `LS_REDIRECT_URI=https://askeuno.com/api/oauth/callback/lightspeed`

**OAuth Flow Redirects to Wrong URL**
- **Cause**: `APP_URL` environment variable not set correctly
- **Fix**: Set `APP_URL=https://askeuno.com` in production

---

## Security Notes

1. **HTTPS Required**: All production redirect URIs must use `https://`
2. **Exact Match**: Redirect URIs must match exactly (case-sensitive, no trailing slashes)
3. **No Wildcards**: Most providers don't support wildcards in redirect URIs
4. **Multiple URIs**: You can add multiple redirect URIs (production + local) in most portals

---

## Testing

### Test OAuth Flows

1. **Lightspeed**
   ```bash
   node scripts/test-lightspeed-oauth.mjs
   ```

2. **Google Sheets**
   - Navigate to `/connections` page
   - Click "Connect Google Sheets"
   - Complete OAuth flow

3. **Stripe**
   - Navigate to `/connections` page
   - Click "Connect Stripe"
   - Complete OAuth flow

### Verify Redirect URIs

After configuring redirect URIs in provider portals:
1. Test OAuth initiation
2. Verify callback URL matches
3. Check for "invalid redirect_uri" errors
4. Confirm successful token exchange

---

## Quick Reference

### Environment Variables

```bash
# Required
APP_URL=https://askeuno.com
LS_REDIRECT_URI=https://askeuno.com/api/oauth/callback/lightspeed

# Optional (will be constructed from APP_URL if not set)
GOOGLE_REDIRECT_URI=https://askeuno.com/api/oauth/callback/google-sheets
```

### Provider Portals

- **Lightspeed**: https://developers.lightspeedhq.com/
- **Google**: https://console.cloud.google.com/apis/credentials
- **Stripe**: https://dashboard.stripe.com/settings/applications
- **QuickBooks**: https://developer.intuit.com/

---

**Last Updated**: February 27, 2026  
**Maintained By**: Credentials & Security Configuration Specialist
