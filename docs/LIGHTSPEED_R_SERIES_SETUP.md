# Lightspeed R-Series Setup Guide

## Quick Answer

**YES, you need to create a separate OAuth application for R-Series!**

Your screenshot shows an **X-Series** application. Since your test store uses **R-Series**, you need to create a **separate R-Series application**.

---

## Step-by-Step: Create R-Series Application

### Step 1: Access R-Series Developer Portal

1. **Go to**: https://developers.lightspeedhq.com/
   - ⚠️ **NOT** `developers.retail.lightspeed.app` (that's X-Series)
   - This is the **R-Series** portal

2. **Log in** with:
   - Email: `M2gille@gmail.com`
   - Password: `tiqbiv-nefKav-7gupzu`

### Step 2: Create Application

1. Click **"Add Application"** button
2. Fill in the form:
   - **Application Name**: "Ask Euno R-Series"
   - **Description**: "AI-powered data analytics for R-Series stores"
   - **Redirect URI**: 
     ```
     http://localhost:5000/api/oauth/callback/lightspeed
     ```
     (For production, you'll also need: `https://askeuno.com/api/oauth/callback/lightspeed`)
   - **Scopes**: Check these boxes:
     - ☑ `employee:inventory` (read products)
     - ☑ `employee:reports` (read sales data)
     - ☑ `employee:customers` (read customer data)

3. Click **"Create Application"** or **"Save"**

### Step 3: Copy Credentials

After creating, you'll see:
- **Client ID**: Copy this (will be different from your X-Series Client ID)
- **Client Secret**: Copy this immediately (only shown once!)

---

## Step 4: Add to Your .env File

Open your `.env` file and add/update:

```env
# Lightspeed R-Series (for your test store)
LS_CLIENT_ID=paste_your_r_series_client_id_here
LS_CLIENT_SECRET=paste_your_r_series_client_secret_here
LS_REDIRECT_URI=http://localhost:5000/api/oauth/callback/lightspeed
```

---

## Step 5: Test

```bash
# Test configuration
./scripts/test-lightspeed.sh

# Start server
npm run dev

# Open connections page
open http://localhost:5000/connections
```

---

## Summary

| What You Have | What You Need |
|---------------|---------------|
| ✅ X-Series App (in `developers.retail.lightspeed.app`) | ❌ R-Series App (in `developers.lightspeedhq.com`) |
| ✅ X-Series Client ID: `ExvDOmrthxsdrxNYrtPOWfOVlopdgn1y` | ❌ R-Series Client ID (create new) |
| ✅ Test store uses R-Series | ✅ Need R-Series credentials |

---

## Important Notes

1. **Different Portals**: R-Series and X-Series use different developer portals
2. **Different Credentials**: Each requires separate Client ID/Secret
3. **Same Redirect URI**: You can use the same redirect URI for both
4. **Current Code**: Currently supports R-Series (what you need for test store)

---

## Troubleshooting

### "I can't find the R-Series portal"
- Make sure you're going to: **https://developers.lightspeedhq.com/**
- NOT: `developers.retail.lightspeed.app` (that's X-Series)

### "I see my X-Series app but not R-Series"
- R-Series and X-Series apps are in **different portals**
- You need to create a new app in the R-Series portal

### "The redirect URI doesn't match"
- Make sure the redirect URI in the portal **exactly matches** your `.env` file
- Check for `http` vs `https`, trailing slashes, port numbers

---

**Last Updated**: January 31, 2026
