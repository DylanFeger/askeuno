# Lightspeed Setup - Quick Reference

## 🎯 Your Situation

- ✅ **X-Series App**: Already created (Client ID: `ExvDOmrthxsdrxNYrtPOWfOVlopdgn1y`)
- ❌ **R-Series App**: **NEEDS TO BE CREATED** (for your test store)
- ✅ **Test Store**: Uses R-Series (needs R-Series credentials)

---

## ✅ What To Do Right Now

### 1. Create R-Series Application

**Go to**: https://developers.lightspeedhq.com/ (NOT the X-Series portal)

**Login**: 
- Email: `M2gille@gmail.com`
- Password: `tiqbiv-nefKav-7gupzu`

**Create App**:
- Name: "Ask Euno R-Series"
- Redirect URI: `http://localhost:5000/api/oauth/callback/lightspeed`
- Scopes: `employee:inventory`, `employee:reports`, `employee:customers`

**Copy**:
- Client ID (R-Series)
- Client Secret (R-Series)

### 2. Add to .env

```env
# R-Series (for your test store)
LS_CLIENT_ID=paste_r_series_client_id_here
LS_CLIENT_SECRET=paste_r_series_client_secret_here
LS_REDIRECT_URI=http://localhost:5000/api/oauth/callback/lightspeed
```

### 3. Test

```bash
./scripts/test-lightspeed.sh
npm run dev
```

---

## 📋 Portal Comparison

| Platform | Developer Portal | Your App Status |
|----------|------------------|-----------------|
| **R-Series** | https://developers.lightspeedhq.com/ | ❌ **Create Now** |
| **X-Series** | https://developers.retail.lightspeed.app/ | ✅ Already Created |

---

## 🔑 Credentials Summary

| Type | Client ID | Where to Get |
|------|-----------|--------------|
| **R-Series** | (create new) | https://developers.lightspeedhq.com/ |
| **X-Series** | `ExvDOmrthxsdrxNYrtPOWfOVlopdgn1y` | Already have (not needed for test store) |

---

## 📚 Full Documentation

- **R-Series Setup**: `docs/LIGHTSPEED_R_SERIES_SETUP.md`
- **R vs X Differences**: `docs/LIGHTSPEED_R_VS_X_SERIES.md`
- **General Setup**: `docs/LIGHTSPEED_SETUP.md`

---

**Last Updated**: January 31, 2026
