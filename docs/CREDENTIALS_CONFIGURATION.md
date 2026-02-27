# Credentials & Security Configuration Guide

**Production Domain**: `askeuno.com`  
**Last Updated**: February 27, 2026

This document provides comprehensive guidance for configuring all API keys, OAuth credentials, and service tokens for Ask Euno MVP production deployment.

---

## Table of Contents

1. [Core Configuration](#core-configuration)
2. [Lightspeed OAuth](#lightspeed-oauth)
3. [OpenAI API](#openai-api)
4. [Stripe Configuration](#stripe-configuration)
5. [Google OAuth](#google-oauth)
6. [AWS Credentials](#aws-credentials)
7. [Error Monitoring](#error-monitoring)
8. [Security Best Practices](#security-best-practices)
9. [Validation & Testing](#validation--testing)

---

## Core Configuration

### Required Environment Variables

```bash
# Application URL
APP_URL=https://askeuno.com
FRONTEND_URL=https://askeuno.com

# Database
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Security
SESSION_SECRET=<generate-random-64-char-string>
ENCRYPTION_KEY=<generate-64-hex-characters>
```

### Generating Secrets

**SESSION_SECRET**: Generate a random 32+ character string:
```bash
openssl rand -base64 32
```

**ENCRYPTION_KEY**: Generate exactly 64 hex characters (32 bytes for AES-256):
```bash
openssl rand -hex 32
```

---

## Lightspeed OAuth

### Required Credentials

- **LS_CLIENT_ID**: Lightspeed R-Series OAuth Client ID
- **LS_CLIENT_SECRET**: Lightspeed R-Series OAuth Client Secret
- **LS_REDIRECT_URI**: OAuth callback URL (must match exactly)

### Configuration

```bash
LS_CLIENT_ID=your_lightspeed_client_id
LS_CLIENT_SECRET=your_lightspeed_client_secret
LS_REDIRECT_URI=https://askeuno.com/api/oauth/callback/lightspeed
```

### Setup Steps

1. **Get Credentials from Lightspeed Developer Portal**
   - Go to: https://developers.lightspeedhq.com/
   - Navigate to your R-Series application
   - Copy Client ID and Client Secret

2. **Configure Redirect URI**
   - In Lightspeed Developer Portal, add redirect URI:
     ```
     https://askeuno.com/api/oauth/callback/lightspeed
     ```
   - **Important**: The redirect URI must match exactly (including https, no trailing slash)

3. **Optional Environment Variables**
   ```bash
   LS_AUTH_URL=https://cloud.lightspeedapp.com/auth/oauth/authorize
   LS_TOKEN_URL=https://cloud.lightspeedapp.com/auth/oauth/token
   LS_API_BASE=https://api.lightspeedapp.com/API
   ```

### Validation

Run the validation script:
```bash
node scripts/validate-credentials.js
```

Or test Lightspeed connection:
```bash
node scripts/test-lightspeed-oauth.mjs
```

---

## OpenAI API

### Required Credentials

- **OPENAI_API_KEY**: OpenAI API key (starts with `sk-`)

### Configuration

```bash
OPENAI_API_KEY=sk-your-openai-api-key
```

### Setup Steps

1. **Get API Key**
   - Go to: https://platform.openai.com/api-keys
   - Create a new API key
   - Copy the key (starts with `sk-`)

2. **Set Environment Variable**
   ```bash
   OPENAI_API_KEY=sk-...
   ```

### Notes

- OpenAI API key is **optional** but recommended for AI features
- Keys are prefixed with `sk-` for secret keys
- Never commit API keys to version control
- Rotate keys if exposed

### Validation

The validation script checks:
- Key format (starts with `sk-`)
- Key length (minimum 20 characters)

---

## Stripe Configuration

### Required Credentials (if using payments)

- **STRIPE_SECRET_KEY**: Stripe secret key (starts with `sk_live_` or `sk_test_`)
- **VITE_STRIPE_PUBLIC_KEY**: Stripe publishable key (for frontend, starts with `pk_live_` or `pk_test_`)
- **STRIPE_WEBHOOK_SECRET**: Webhook signing secret (starts with `whsec_`)

### Configuration

```bash
# Backend (server-side)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key

# Frontend (client-side, exposed in browser)
VITE_STRIPE_PUBLIC_KEY=pk_live_your_stripe_publishable_key

# Webhook verification
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### Setup Steps

1. **Get Stripe Keys**
   - Go to: https://dashboard.stripe.com/apikeys
   - Copy Secret Key and Publishable Key
   - Use **Live** keys for production

2. **Configure Webhook**
   - Go to: https://dashboard.stripe.com/webhooks
   - Add endpoint: `https://askeuno.com/api/subscription/webhook`
   - Copy webhook signing secret

3. **Price IDs** (if using subscriptions)
   ```bash
   STRIPE_PRICE_PROFESSIONAL_MONTHLY=price_xxx
   STRIPE_PRICE_PROFESSIONAL_ANNUAL=price_xxx
   STRIPE_PRICE_ENTERPRISE_MONTHLY=price_xxx
   STRIPE_PRICE_ENTERPRISE_ANNUAL=price_xxx
   ```

### OAuth Redirect URI

If using Stripe Connect:
```
https://askeuno.com/api/auth/stripe/callback
```

---

## Google OAuth

### Required Credentials (for Google Sheets integration)

- **GOOGLE_CLIENT_ID**: Google OAuth 2.0 Client ID
- **GOOGLE_CLIENT_SECRET**: Google OAuth 2.0 Client Secret
- **GOOGLE_REDIRECT_URI**: OAuth callback URL

### Configuration

```bash
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://askeuno.com/api/oauth/callback/google-sheets
```

### Setup Steps

1. **Create OAuth 2.0 Credentials**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Create OAuth 2.0 Client ID
   - Application type: Web application

2. **Configure Authorized Redirect URIs**
   - Add redirect URI:
     ```
     https://askeuno.com/api/oauth/callback/google-sheets
     ```
   - Also add for local development:
     ```
     http://localhost:5000/api/oauth/callback/google-sheets
     ```

3. **Required Scopes**
   - `https://www.googleapis.com/auth/spreadsheets.readonly`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`

### Validation

The Google OAuth redirect URI should be:
```
https://askeuno.com/api/oauth/callback/google-sheets
```

---

## AWS Credentials

### Required Credentials (for S3 file storage)

- **AWS_ACCESS_KEY_ID** or **S3_ACCESS_KEY_ID**: AWS Access Key ID
- **AWS_SECRET_ACCESS_KEY** or **S3_SECRET_ACCESS_KEY**: AWS Secret Access Key
- **AWS_REGION** or **S3_REGION**: AWS region (e.g., `us-east-1`)
- **AWS_S3_BUCKET** or **S3_BUCKET**: S3 bucket name

### Configuration

```bash
# Option 1: AWS_ prefixed variables
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=askeuno-uploads

# Option 2: S3_ prefixed variables (alternative)
S3_ACCESS_KEY_ID=AKIA...
S3_SECRET_ACCESS_KEY=your_secret_key
S3_REGION=us-east-1
S3_BUCKET=askeuno-uploads
```

### Setup Steps

1. **Create IAM User**
   - Go to: https://console.aws.amazon.com/iam/
   - Create user with S3 access
   - Attach policy: `AmazonS3FullAccess` (or custom policy)

2. **Create Access Keys**
   - Generate Access Key ID and Secret Access Key
   - Save securely (secret key shown only once)

3. **Create S3 Bucket**
   - Go to: https://console.aws.amazon.com/s3/
   - Create bucket: `askeuno-uploads`
   - Configure CORS if needed

4. **Storage Mode**
   ```bash
   STORAGE_MODE=s3
   ```

### AWS SES (if using email)

```bash
AWS_SES_REGION=us-east-1
SES_FROM_EMAIL=noreply@askeuno.com
```

---

## Error Monitoring

### Sentry Configuration

```bash
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

### Setup Steps

1. **Create Sentry Project**
   - Go to: https://sentry.io/
   - Create new project
   - Copy DSN

2. **Set Environment Variables**
   - Use same DSN for both backend and frontend

---

## Security Best Practices

### ✅ DO

- Store all credentials in environment variables
- Use `.env` files for local development (never commit)
- Use `.env.example` or `.env.production.template` for documentation
- Rotate credentials regularly
- Use strong, randomly generated secrets
- Validate credentials before deployment
- Use separate credentials for development and production

### ❌ DON'T

- Hardcode credentials in source code
- Commit `.env` files to version control
- Share credentials in chat/email
- Use production credentials in development
- Store credentials in client-side code (except publishable keys)
- Log credentials in application logs

### Credential Storage

**Local Development:**
- Use `.env` file (in `.gitignore`)

**Production:**
- AWS Amplify: Environment Variables in Console
- AWS App Runner: Environment Variables in Service Configuration
- Docker: Use secrets or environment variables
- Kubernetes: Use Secrets

---

## Validation & Testing

### Validate All Credentials

Run the comprehensive validation script:
```bash
node scripts/validate-credentials.js
```

This checks:
- ✅ All required credentials are set
- ✅ Credential formats are valid
- ✅ OAuth redirect URIs match production
- ⚠️  Optional credentials are documented

### Security Audit

Scan for hardcoded credentials:
```bash
node scripts/audit-hardcoded-credentials.js
```

This scans the codebase for:
- Hardcoded API keys
- Database connection strings
- OAuth secrets
- Private keys
- Passwords

### Individual Service Tests

**Lightspeed:**
```bash
node scripts/test-lightspeed-oauth.mjs
```

**OpenAI:**
```bash
# Check health endpoint
curl https://askeuno.com/api/health
```

**Stripe:**
```bash
# Test webhook endpoint
curl -X POST https://askeuno.com/api/subscription/webhook
```

---

## OAuth Redirect URIs Summary

All OAuth redirect URIs for production (`askeuno.com`):

| Provider | Redirect URI |
|----------|-------------|
| **Lightspeed** | `https://askeuno.com/api/oauth/callback/lightspeed` |
| **Google Sheets** | `https://askeuno.com/api/oauth/callback/google-sheets` |
| **Stripe Connect** | `https://askeuno.com/api/auth/stripe/callback` |
| **QuickBooks** | `https://askeuno.com/api/auth/quickbooks/callback` |

**Important**: These URIs must be configured in each provider's developer portal.

---

## Environment Variable Template

See `.env.production.template` for a complete template with all required variables.

---

## Troubleshooting

### "LS_REDIRECT_URI must be set"
- Add `LS_REDIRECT_URI` to your environment variables
- Ensure it matches exactly what's in Lightspeed Developer Portal

### "Invalid redirect_uri" (OAuth errors)
- Check redirect URI matches exactly (including https/http, trailing slashes)
- Verify redirect URI is added in provider's developer portal

### "Missing Lightspeed credentials"
- Ensure `LS_CLIENT_ID` and `LS_CLIENT_SECRET` are set
- Verify credentials are from Lightspeed R-Series application

### "ENCRYPTION_KEY must be exactly 64 hex characters"
- Generate new key: `openssl rand -hex 32`
- Ensure it's exactly 64 characters (no spaces, newlines)

---

## Support

For issues with credential configuration:
1. Check this documentation
2. Run validation scripts
3. Review provider-specific documentation
4. Check application logs for detailed error messages

---

**Last Updated**: February 27, 2026  
**Maintained By**: Credentials & Security Configuration Specialist
