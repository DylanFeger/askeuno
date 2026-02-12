# Lightspeed R-Series vs X-Series

## Overview

Lightspeed has **two different platforms** that require **separate OAuth applications**:

- **R-Series** (Retail) - Legacy platform, uses `cloud.lightspeedapp.com`
- **X-Series** (Retail) - Newer platform, uses `secure.retail.lightspeed.app`

---

## Differences

| Feature | R-Series | X-Series |
|---------|----------|----------|
| **Developer Portal** | https://developers.lightspeedhq.com/ | https://developers.retail.lightspeed.app/ |
| **OAuth Auth URL** | `https://cloud.lightspeedapp.com/auth/oauth/authorize` | `https://secure.retail.lightspeed.app/oauth/authorize` |
| **OAuth Token URL** | `https://cloud.lightspeedapp.com/auth/oauth/token` | `https://secure.retail.lightspeed.app/oauth/access_token` |
| **API Base URL** | `https://api.lightspeedapp.com/API` | `https://api.lightspeedapp.com/API` (same) |
| **Application Type** | Separate OAuth app required | Separate OAuth app required |

---

## Current Setup

Based on your screenshot, you have:
- ✅ **X-Series Application** created in `developers.retail.lightspeed.app`
- ❌ **R-Series Application** - **NEEDS TO BE CREATED**

---

## How to Create R-Series Application

### Step 1: Access R-Series Developer Portal

1. Go to: **https://developers.lightspeedhq.com/**
2. Log in with your Lightspeed account (`M2gille@gmail.com`)
3. Navigate to "My Apps" → "Applications"

### Step 2: Create New Application

1. Click **"Add Application"** button
2. Fill in:
   - **Name**: "Ask Euno R-Series" (or similar)
   - **Description**: "AI-powered data analytics for R-Series stores"
   - **Redirect URI**: 
     - Local: `http://localhost:5000/api/oauth/callback/lightspeed`
     - Production: `https://askeuno.com/api/oauth/callback/lightspeed`
   - **Scopes**: Select:
     - `employee:inventory`
     - `employee:reports`
     - `employee:customers`

### Step 3: Save Credentials

- Copy the **Client ID** (different from X-Series)
- Copy the **Client Secret** (different from X-Series)

---

## Environment Configuration

You'll need **separate environment variables** for each:

```env
# ===========================================
# LIGHTSPEED R-SERIES (For your test store)
# ===========================================
LS_CLIENT_ID=your_r_series_client_id
LS_CLIENT_SECRET=your_r_series_client_secret
LS_REDIRECT_URI=http://localhost:5000/api/oauth/callback/lightspeed

# R-Series uses these endpoints (defaults)
LS_AUTH_URL=https://cloud.lightspeedapp.com/auth/oauth/authorize
LS_TOKEN_URL=https://cloud.lightspeedapp.com/auth/oauth/token
LS_API_BASE=https://api.lightspeedapp.com/API

# ===========================================
# LIGHTSPEED X-SERIES (Optional - for future)
# ===========================================
LS_X_CLIENT_ID=your_x_series_client_id
LS_X_CLIENT_SECRET=your_x_series_client_secret
LS_X_REDIRECT_URI=http://localhost:5000/api/oauth/callback/lightspeed-x

# X-Series uses different endpoints
LS_X_AUTH_URL=https://secure.retail.lightspeed.app/oauth/authorize
LS_X_TOKEN_URL=https://secure.retail.lightspeed.app/oauth/access_token
LS_X_API_BASE=https://api.lightspeedapp.com/API
```

---

## Current Code Status

**✅ R-Series Support**: Fully implemented (default)
- Uses `cloud.lightspeedapp.com` endpoints
- Works with R-Series stores

**⚠️ X-Series Support**: Not yet implemented
- Would need separate routes/endpoints
- Uses `secure.retail.lightspeed.app` endpoints

---

## For Your Test Store (R-Series)

Since your test store uses **R-Series**, you need:

1. **Create R-Series OAuth Application**:
   - Portal: https://developers.lightspeedhq.com/
   - Use the same redirect URI as X-Series

2. **Add to `.env`**:
   ```env
   LS_CLIENT_ID=your_r_series_client_id_here
   LS_CLIENT_SECRET=your_r_series_client_secret_here
   LS_REDIRECT_URI=http://localhost:5000/api/oauth/callback/lightspeed
   ```

3. **Test the connection**:
   ```bash
   ./scripts/test-lightspeed.sh
   npm run dev
   ```

---

## Quick Reference

### R-Series Developer Portal
- **URL**: https://developers.lightspeedhq.com/
- **Login**: Use your Lightspeed account
- **Your Current App**: None (needs to be created)

### X-Series Developer Portal  
- **URL**: https://developers.retail.lightspeed.app/
- **Login**: Use your Lightspeed account
- **Your Current App**: "Ask Euno" (Client ID: `ExvDOmrthxsdrxNYrtPOWfOVlopdgn1y`)

---

## Next Steps

1. ✅ Create R-Series application in https://developers.lightspeedhq.com/
2. ✅ Copy R-Series Client ID and Secret
3. ✅ Add to `.env` file
4. ✅ Test with your R-Series test store

---

**Last Updated**: January 31, 2026
