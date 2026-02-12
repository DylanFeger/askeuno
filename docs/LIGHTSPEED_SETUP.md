# Lightspeed Integration Setup Guide

## Overview

Ask Euno uses OAuth 2.0 to connect to Lightspeed Retail (R-Series and X-Series). This guide will help you set up the integration for testing.

---

## 🔑 Required Credentials

For OAuth integration, you need **OAuth Client Credentials** from Lightspeed, NOT your login credentials.

### What You Need:

1. **LS_CLIENT_ID** - OAuth Client ID (from Lightspeed Developer Portal)
2. **LS_CLIENT_SECRET** - OAuth Client Secret (from Lightspeed Developer Portal)
3. **LS_REDIRECT_URI** - Your callback URL (e.g., `http://localhost:5000/api/oauth/callback/lightspeed`)

### What You DON'T Need:

- ❌ Your Lightspeed login username/password (those are for web login only)
- ❌ Store URL (handled automatically)

---

## 📋 Step-by-Step Setup

### Step 1: Get OAuth Credentials from Lightspeed

1. **Log into Lightspeed** (using your provided credentials: `M2gille@gmail.com`)
2. **Navigate to Developer Portal**:
   - Go to: https://developers.lightspeedhq.com/
   - Or: Settings → Integrations → Developer Portal
3. **Create a New Application**:
   - Click "Create Application" or "New App"
   - Fill in:
     - **Name**: "Ask Euno" (or your app name)
     - **Description**: "AI-powered data analytics platform"
     - **Redirect URI**: `http://localhost:5000/api/oauth/callback/lightspeed` (for local testing)
     - **Scopes**: Select:
       - `employee:inventory` (read products)
       - `employee:reports` (read sales data)
       - `employee:customers` (read customer data)
4. **Save Your Credentials**:
   - Copy the **Client ID**
   - Copy the **Client Secret** (only shown once!)

### Step 2: Configure Environment Variables

Add to your `.env` file:

```env
# Lightspeed OAuth Credentials
LS_CLIENT_ID=your_client_id_from_lightspeed_portal
LS_CLIENT_SECRET=your_client_secret_from_lightspeed_portal
LS_REDIRECT_URI=http://localhost:5000/api/oauth/callback/lightspeed

# Optional: Custom API endpoints (usually not needed)
# LS_AUTH_URL=https://cloud.lightspeedapp.com/auth/oauth/authorize
# LS_TOKEN_URL=https://cloud.lightspeedapp.com/auth/oauth/token
# LS_API_BASE=https://api.lightspeedapp.com/API
```

### Step 3: Test the Integration

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to Connections Page**:
   - Open: http://localhost:5000/connections
   - Or: http://localhost:5000/settings/connections

3. **Click "Connect Lightspeed"**:
   - This will initiate the OAuth flow
   - You'll be redirected to Lightspeed
   - Log in and authorize the app
   - You'll be redirected back to Ask Euno

4. **Verify Connection**:
   - Check that data appears in your data sources
   - Try asking Euno questions about your Lightspeed data

---

## 🧪 Testing Credentials

**For Testing Lightspeed Account Access:**
- **Email**: `M2gille@gmail.com`
- **Password**: `tiqbiv-nefKav-7gupzu`

**⚠️ Security Note**: These credentials are for testing only. Never commit them to git or share them publicly.

---

## 🔍 Troubleshooting

### "LS_CLIENT_ID must be set"
- Make sure you've added `LS_CLIENT_ID` to your `.env` file
- Restart your development server after adding environment variables

### "LS_REDIRECT_URI must be set"
- Add `LS_REDIRECT_URI` to your `.env` file
- Make sure it matches exactly what you registered in Lightspeed Developer Portal

### "Invalid redirect_uri"
- The redirect URI in `.env` must match exactly what's in Lightspeed Developer Portal
- Check for trailing slashes, `http` vs `https`, port numbers

### "Failed to exchange code for tokens"
- Verify your `LS_CLIENT_SECRET` is correct
- Check that the redirect URI matches exactly
- Make sure you're using the correct Lightspeed environment (R-Series vs X-Series)

### OAuth Flow Completes But No Data Appears
- Check server logs for errors
- Verify the Lightspeed account has data
- Check that the required scopes were granted

---

## 📊 What Data Gets Synced

Once connected, Ask Euno will sync:

1. **Sales Data**:
   - Sale IDs, dates, totals
   - Customer information
   - Payment methods
   - Line items

2. **Product Data**:
   - Product IDs, SKUs, descriptions
   - Prices, costs
   - Categories, brands
   - Inventory levels

3. **Customer Data**:
   - Customer IDs, names
   - Contact information
   - Purchase history

---

## 🔐 Security Best Practices

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Rotate secrets regularly** - Especially if shared
3. **Use different credentials for production** - Don't use test credentials in production
4. **Store secrets securely** - Use environment variables, not hardcoded values

---

## 🚀 Production Setup

For production deployment:

1. **Update Redirect URI** in Lightspeed Developer Portal:
   - Change from `http://localhost:5000/...` 
   - To: `https://askeuno.com/api/oauth/callback/lightspeed`

2. **Update `.env`** (or your hosting platform's environment variables):
   ```env
   LS_REDIRECT_URI=https://askeuno.com/api/oauth/callback/lightspeed
   ```

3. **Consider separate OAuth apps** for development and production

---

## 📞 Support

If you encounter issues:

1. Check server logs: `logs/combined.log`
2. Check browser console for frontend errors
3. Verify OAuth credentials are correct
4. Test OAuth flow step-by-step

---

**Last Updated**: January 31, 2026
