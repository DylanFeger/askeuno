# Lightspeed R-Series Credentials - Ready to Add

## ✅ Your R-Series Credentials

I've received your R-Series OAuth credentials. Here's how to add them to your `.env` file:

---

## 📝 Manual Steps

### Step 1: Open Your .env File

```bash
# Open .env in your editor
code .env
# or
nano .env
# or
vim .env
```

### Step 2: Add/Update These Lines

Find the Lightspeed section (around line 62-70) and update it with:

```env
# ===========================================
# LIGHTSPEED R-SERIES (Retail - Legacy)
# ===========================================
LS_CLIENT_ID=b16a2df414bee9070b564b7cd7a46326024d6078f4b130cbbd329abed254a398
LS_CLIENT_SECRET=fc0b95186042228d2ea9e7608723a58bdd176c1a2e9a76bca3f6f4c6c340fe0e
LS_REDIRECT_URI=http://localhost:5000/api/oauth/callback/lightspeed
```

**Or** if those lines don't exist, add them anywhere in the file.

### Step 3: Save and Test

```bash
# Test configuration
./scripts/test-lightspeed.sh

# Start server
npm run dev
```

---

## 🔍 Quick Verification

After adding, verify with:

```bash
# Check if credentials are set
grep "LS_CLIENT_ID" .env
grep "LS_CLIENT_SECRET" .env
```

You should see:
- `LS_CLIENT_ID=b16a2df414bee9070b564b7cd7a46326024d6078f4b130cbbd329abed254a398`
- `LS_CLIENT_SECRET=fc0b95186042228d2ea9e7608723a58bdd176c1a2e9a76bca3f6f4c6c340fe0e`

---

## ✅ What's Configured

- ✅ **Client ID**: `b16a2df414bee9070b564b7cd7a46326024d6078f4b130cbbd329abed254a398`
- ✅ **Client Secret**: `fc0b95186042228d2ea9e7608723a58bdd176c1a2e9a76bca3f6f4c6c340fe0e`
- ✅ **Redirect URI**: `http://localhost:5000/api/oauth/callback/lightspeed`
- ✅ **Platform**: R-Series (for your test store)

---

## 🚀 Next Steps

1. ✅ Add credentials to `.env` (see above)
2. ✅ Test configuration: `./scripts/test-lightspeed.sh`
3. ✅ Start server: `npm run dev`
4. ✅ Open: http://localhost:5000/connections
5. ✅ Click "Connect Lightspeed" button
6. ✅ Authorize in Lightspeed
7. ✅ Data will sync automatically!

---

## 🔐 Security Note

These credentials are now in your `.env` file, which is:
- ✅ Already in `.gitignore` (won't be committed)
- ✅ Local to your machine
- ✅ Secure for development

**Never commit these credentials to git!**

---

**Last Updated**: January 31, 2026
