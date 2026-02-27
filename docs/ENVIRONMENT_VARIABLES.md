# 🔐 Ask Euno MVP - Environment Variables Guide

**Last Updated**: February 27, 2026  
**Target**: Production deployment (AWS App Runner)

---

## 📋 Quick Checklist

Use this checklist when configuring environment variables in AWS App Runner:

### Critical (Required for MVP)
- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` (PostgreSQL connection string)
- [ ] `ENCRYPTION_KEY` (64 hex characters)
- [ ] `SESSION_SECRET` (32+ random characters)
- [ ] `OPENAI_API_KEY` (OpenAI API key)
- [ ] `AWS_ACCESS_KEY_ID` (AWS S3 access)
- [ ] `AWS_SECRET_ACCESS_KEY` (AWS S3 secret)
- [ ] `AWS_REGION` (AWS region, e.g., `us-east-1`)
- [ ] `AWS_S3_BUCKET` (S3 bucket name)
- [ ] `LS_CLIENT_ID` (Lightspeed OAuth client ID)
- [ ] `LS_CLIENT_SECRET` (Lightspeed OAuth client secret)
- [ ] `LS_REDIRECT_URI` (Lightspeed OAuth redirect URI)
- [ ] `APP_URL` (Application URL, e.g., `https://askeuno.com`)
- [ ] `FRONTEND_URL` (Frontend URL, e.g., `https://askeuno.com`)

### Optional (Recommended)
- [ ] `SENTRY_DSN` (Error monitoring)
- [ ] `VITE_SENTRY_DSN` (Frontend error monitoring)
- [ ] `STRIPE_SECRET_KEY` (If using payments)
- [ ] `STRIPE_PUBLISHABLE_KEY` (If using payments)
- [ ] `STRIPE_WEBHOOK_SECRET` (If using payments)
- [ ] `SENDGRID_API_KEY` (If using email)
- [ ] `SENDGRID_FROM_EMAIL` (If using email)

---

## 📝 Detailed Variable Descriptions

### Core Configuration

#### `NODE_ENV`
- **Type**: String
- **Required**: Yes
- **Value**: `production`
- **Description**: Sets the application environment mode
- **Example**: `NODE_ENV=production`

#### `PORT`
- **Type**: Number
- **Required**: No (defaults to 5000)
- **Description**: Port the application listens on (App Runner sets this automatically)
- **Note**: App Runner will set this automatically, but you can override if needed

---

### Database Configuration

#### `DATABASE_URL`
- **Type**: String (PostgreSQL connection string)
- **Required**: Yes
- **Description**: Full PostgreSQL connection string for production database
- **Format**: `postgresql://user:password@host:port/database?sslmode=require`
- **Example**: `postgresql://user:pass@db.example.com:5432/askeuno?sslmode=require`
- **Security**: ⚠️ Contains sensitive credentials - store securely
- **Where to get**: Neon.tech, Supabase, or AWS RDS console

#### `PGDATABASE`, `PGHOST`, `PGPASSWORD`, `PGPORT`, `PGUSER`
- **Type**: String/Number
- **Required**: No (if `DATABASE_URL` is set)
- **Description**: Alternative PostgreSQL connection parameters
- **Note**: Use `DATABASE_URL` instead if possible

---

### Security Configuration

#### `ENCRYPTION_KEY`
- **Type**: String (64 hex characters)
- **Required**: Yes
- **Description**: Encryption key for sensitive data (64 hex characters)
- **Generate**: `openssl rand -hex 32`
- **Example**: `fd770bf5224dc13cdf76706a0200e51108518eb6fc057aaf58a7a7f355424690`
- **Security**: ⚠️ Critical - must be unique and secret

#### `SESSION_SECRET`
- **Type**: String (32+ characters)
- **Required**: Yes
- **Description**: Secret key for session encryption
- **Generate**: `openssl rand -base64 32`
- **Example**: `f2asz2qXmRajcW4gpEV2sWnUKhmnd8S0rlPxEVLQAeo=`
- **Security**: ⚠️ Critical - must be unique and secret

---

### AI / OpenAI Configuration

#### `OPENAI_API_KEY`
- **Type**: String
- **Required**: Yes (for AI features)
- **Description**: OpenAI API key for AI chat features
- **Format**: `sk-...`
- **Example**: `sk-proj-abc123...`
- **Where to get**: https://platform.openai.com/api-keys
- **Security**: ⚠️ Contains sensitive API key

---

### AWS S3 Configuration

#### `STORAGE_MODE`
- **Type**: String
- **Required**: No (defaults to `s3` in production)
- **Value**: `s3`
- **Description**: File storage mode (use `s3` for production)

#### `AWS_ACCESS_KEY_ID`
- **Type**: String
- **Required**: Yes
- **Description**: AWS access key ID for S3 access
- **Example**: `AKIAIOSFODNN7EXAMPLE`
- **Where to get**: AWS IAM Console → Users → Security credentials
- **Security**: ⚠️ Contains sensitive credentials

#### `AWS_SECRET_ACCESS_KEY`
- **Type**: String
- **Required**: Yes
- **Description**: AWS secret access key for S3 access
- **Example**: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`
- **Where to get**: AWS IAM Console → Users → Security credentials
- **Security**: ⚠️ Contains sensitive credentials - store securely

#### `AWS_REGION`
- **Type**: String
- **Required**: Yes
- **Description**: AWS region where S3 bucket is located
- **Example**: `us-east-1`, `us-west-2`, `eu-west-1`
- **Common values**: `us-east-1` (N. Virginia), `us-west-2` (Oregon)

#### `AWS_S3_BUCKET`
- **Type**: String
- **Required**: Yes
- **Description**: Name of the S3 bucket for file uploads
- **Example**: `askeuno-uploads`, `askeuno-production-files`
- **Note**: Bucket must exist and have proper permissions

---

### Lightspeed R-Series OAuth

#### `LS_CLIENT_ID`
- **Type**: String
- **Required**: Yes (if using Lightspeed integration)
- **Description**: Lightspeed R-Series OAuth client ID
- **Example**: `b16a2df414bee9070b564b7cd7a46326024d6078f4b130cbbd329abed254a398`
- **Where to get**: Lightspeed Developer Portal

#### `LS_CLIENT_SECRET`
- **Type**: String
- **Required**: Yes (if using Lightspeed integration)
- **Description**: Lightspeed R-Series OAuth client secret
- **Example**: `fc0b95186042228d2ea9e7608723a58bdd176c1a2e9a76bca3f6f4c6c340fe0e`
- **Where to get**: Lightspeed Developer Portal
- **Security**: ⚠️ Contains sensitive credentials

#### `LS_REDIRECT_URI`
- **Type**: String (URL)
- **Required**: Yes (if using Lightspeed integration)
- **Description**: OAuth redirect URI (must match Lightspeed app configuration)
- **Example**: `https://askeuno.com/api/oauth/callback/lightspeed`
- **Note**: Must be HTTPS in production

---

### Application URLs

#### `APP_URL`
- **Type**: String (URL)
- **Required**: Yes
- **Description**: Full application URL (used for OAuth redirects, emails, etc.)
- **Example**: `https://askeuno.com`
- **Note**: Must be HTTPS in production

#### `FRONTEND_URL`
- **Type**: String (URL)
- **Required**: Yes
- **Description**: Frontend URL (used for CORS, redirects)
- **Example**: `https://askeuno.com`
- **Note**: Usually same as `APP_URL` for full-stack deployment

---

### Error Monitoring (Sentry)

#### `SENTRY_DSN`
- **Type**: String (URL)
- **Required**: No (but recommended)
- **Description**: Sentry DSN for backend error monitoring
- **Format**: `https://key@sentry.io/project-id`
- **Example**: `https://abc123@o123456.ingest.sentry.io/123456`
- **Where to get**: https://sentry.io → Project Settings → Client Keys (DSN)

#### `VITE_SENTRY_DSN`
- **Type**: String (URL)
- **Required**: No (but recommended)
- **Description**: Sentry DSN for frontend error monitoring
- **Format**: `https://key@sentry.io/project-id`
- **Example**: `https://abc123@o123456.ingest.sentry.io/123456`
- **Note**: Must have `VITE_` prefix for Vite to expose it to frontend
- **Where to get**: https://sentry.io → Project Settings → Client Keys (DSN)

---

### Payments (Stripe) - Optional

#### `STRIPE_SECRET_KEY`
- **Type**: String
- **Required**: No (only if using payments)
- **Description**: Stripe secret key (live mode)
- **Format**: `sk_live_...`
- **Example**: `sk_live_51Abc123...`
- **Where to get**: https://dashboard.stripe.com/apikeys
- **Security**: ⚠️ Contains sensitive API key

#### `STRIPE_PUBLISHABLE_KEY`
- **Type**: String
- **Required**: No (only if using payments)
- **Description**: Stripe publishable key (live mode)
- **Format**: `pk_live_...`
- **Example**: `pk_live_51Abc123...`
- **Where to get**: https://dashboard.stripe.com/apikeys
- **Note**: This can be exposed to frontend (less sensitive)

#### `STRIPE_WEBHOOK_SECRET`
- **Type**: String
- **Required**: No (only if using Stripe webhooks)
- **Description**: Stripe webhook signing secret
- **Format**: `whsec_...`
- **Example**: `whsec_abc123...`
- **Where to get**: Stripe Dashboard → Developers → Webhooks → Signing secret

---

### Email (SendGrid) - Optional

#### `SENDGRID_API_KEY`
- **Type**: String
- **Required**: No (only if using email)
- **Description**: SendGrid API key for sending emails
- **Format**: `SG....`
- **Example**: `SG.abc123...`
- **Where to get**: https://app.sendgrid.com/settings/api_keys
- **Security**: ⚠️ Contains sensitive API key

#### `SENDGRID_FROM_EMAIL`
- **Type**: String (Email)
- **Required**: No (only if using email)
- **Description**: Default "from" email address
- **Example**: `noreply@askeuno.com`
- **Note**: Must be verified in SendGrid

---

## 🔒 Security Best Practices

### 1. **Never Commit Secrets**
- ✅ Use environment variables
- ✅ Use `.env.example` for templates
- ❌ Never commit `.env` files
- ❌ Never hardcode secrets in code

### 2. **Use Strong Secrets**
- Generate `ENCRYPTION_KEY`: `openssl rand -hex 32`
- Generate `SESSION_SECRET`: `openssl rand -base64 32`
- Use long, random strings (32+ characters)

### 3. **Rotate Secrets Regularly**
- Rotate `SESSION_SECRET` every 90 days
- Rotate API keys if compromised
- Update `ENCRYPTION_KEY` only if necessary (requires re-encryption)

### 4. **Use HTTPS in Production**
- All URLs must use `https://`
- OAuth redirect URIs must be HTTPS
- Cookies should be secure in production

### 5. **Limit Access**
- Use IAM roles with least privilege
- Restrict S3 bucket access
- Use separate AWS credentials for production

---

## 📦 Environment Variable Template

Copy this template and fill in your values:

```bash
# Core Configuration
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Security
ENCRYPTION_KEY=your-64-hex-character-key
SESSION_SECRET=your-32-plus-character-secret

# AI
OPENAI_API_KEY=sk-your-openai-key

# AWS S3
STORAGE_MODE=s3
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=askeuno-uploads

# Lightspeed
LS_CLIENT_ID=your-lightspeed-client-id
LS_CLIENT_SECRET=your-lightspeed-client-secret
LS_REDIRECT_URI=https://askeuno.com/api/oauth/callback/lightspeed

# URLs
APP_URL=https://askeuno.com
FRONTEND_URL=https://askeuno.com

# Sentry (Optional)
SENTRY_DSN=https://your-sentry-dsn
VITE_SENTRY_DSN=https://your-sentry-dsn

# Stripe (Optional)
# STRIPE_SECRET_KEY=sk_live_your_key
# STRIPE_PUBLISHABLE_KEY=pk_live_your_key
# STRIPE_WEBHOOK_SECRET=whsec_your_secret

# SendGrid (Optional)
# SENDGRID_API_KEY=SG.your_key
# SENDGRID_FROM_EMAIL=noreply@askeuno.com
```

---

## ✅ Validation

After setting environment variables, validate them:

1. **Check Required Variables**: Ensure all required variables are set
2. **Test Database Connection**: Verify `DATABASE_URL` works
3. **Test S3 Access**: Verify AWS credentials can access S3 bucket
4. **Test OpenAI**: Verify `OPENAI_API_KEY` is valid
5. **Test OAuth**: Verify Lightspeed OAuth redirect URI matches

---

## 📚 Additional Resources

- [AWS App Runner Environment Variables](https://docs.aws.amazon.com/apprunner/latest/dg/manage-configure.html)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [OpenAI API Keys](https://platform.openai.com/api-keys)

---

**Status**: Complete ✅  
**Next**: Configure variables in AWS App Runner Console
