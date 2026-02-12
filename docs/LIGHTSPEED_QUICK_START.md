# Lightspeed Integration - Quick Start

## Overview

This guide will help you quickly set up Lightspeed OAuth integration for testing.

---

## What You Need

1. **OAuth Credentials** from Lightspeed Developer Portal (NOT your login credentials)
2. **Test Account** (for logging into Lightspeed to set up OAuth)

---

## Quick Setup (5 minutes)

### Step 1: Get OAuth Credentials

1. Log into Lightspeed Developer Portal: https://developers.lightspeedhq.com/
   - Use your Lightspeed account credentials
2. Create a new application:
   - **Redirect URI**: `http://localhost:5000/api/oauth/callback/lightspeed`
   - **Scopes**: `employee:inventory`, `employee:reports`, `employee:customers`
3. Copy the **Client ID** and **Client Secret**

### Step 2: Add to .env

```bash
# Edit your .env file and add:
LS_CLIENT_ID=your_client_id_here
LS_CLIENT_SECRET=your_client_secret_here
LS_REDIRECT_URI=http://localhost:5000/api/oauth/callback/lightspeed
```

### Step 3: Test

```bash
# Test configuration
./scripts/test-lightspeed.sh

# Start server
npm run dev

# Open browser
open http://localhost:5000/connections
```

### Step 4: Connect

1. Click "Connect Lightspeed" button
2. Authorize the app in Lightspeed
3. You'll be redirected back
4. Data will start syncing automatically

---

## Troubleshooting

- **"LS_CLIENT_ID must be set"**: Add it to your `.env` file
- **"Invalid redirect_uri"**: Make sure it matches exactly in Developer Portal
- **No data appears**: Check server logs and verify scopes were granted

---

## See Also

- `docs/LIGHTSPEED_SETUP.md` - Complete detailed guide
- `scripts/test-lightspeed.sh` - Configuration test script

---

**Last Updated**: January 31, 2026
