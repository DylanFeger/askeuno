# AWS Amplify Production Setup Guide

## Overview

This guide walks you through setting up Ask Euno for production deployment on AWS Amplify at **askeuno.com**.

---

## Prerequisites

- ✅ AWS Account
- ✅ Domain: askeuno.com (connected to AWS)
- ✅ GitHub/GitLab repository with your code
- ✅ Production database (Neon, Supabase, or AWS RDS)

---

## Step 1: Set Up Production Database

### Option A: Neon (Recommended - Easy)

1. Go to: https://neon.tech
2. Create account
3. Create new project: "Ask Euno Production"
4. Copy connection string (looks like: `postgresql://user:pass@host.neon.tech/dbname`)
5. Save this as your `DATABASE_URL`

### Option B: Supabase

1. Go to: https://supabase.com
2. Create project
3. Get connection string from Settings → Database
4. Save as `DATABASE_URL`

### Option C: AWS RDS

1. AWS Console → RDS
2. Create PostgreSQL database
3. Get connection string
4. Save as `DATABASE_URL`

**Action**: Get your production `DATABASE_URL` and save it.

---

## Step 2: Create AWS S3 Bucket

### 2.1 Create Bucket

1. Go to: https://console.aws.amazon.com/s3/
2. Click "Create bucket"
3. Name: `askeuno-uploads` (or your preferred name)
4. Region: `us-east-1` (or your preferred)
5. **Uncheck** "Block all public access" (we'll use private with signed URLs)
6. Click "Create bucket"

### 2.2 Configure CORS

1. Select your bucket
2. Go to "Permissions" tab
3. Scroll to "Cross-origin resource sharing (CORS)"
4. Click "Edit" and add:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://askeuno.com"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

### 2.3 Create IAM User for S3 Access

1. Go to: https://console.aws.amazon.com/iam/
2. Click "Users" → "Create user"
3. Name: `askeuno-s3-user`
4. Select "Programmatic access"
5. Click "Next: Permissions"
6. Click "Attach policies directly"
7. Search for "AmazonS3FullAccess" and select it
8. Click "Next" → "Create user"
9. **IMPORTANT**: Copy the Access Key ID and Secret Access Key (only shown once!)

**Save these credentials** - you'll need them for environment variables.

---

## Step 3: Configure AWS Amplify

### 3.1 Connect Repository

1. Go to: https://console.aws.amazon.com/amplify
2. Click "New app" → "Host web app"
3. Select your Git provider (GitHub/GitLab)
4. Authorize AWS Amplify
5. Select your repository
6. Select branch: `main` (or your production branch)
7. Click "Next"

### 3.2 Configure Build Settings

Amplify should auto-detect your `amplify.yml`. If not, verify it exists in your repo root.

**Current amplify.yml** (frontend-only):
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
```

**Note**: If you're running a Node.js backend on Amplify, you may need to update this. For now, this should work if your backend is separate.

### 3.3 Add Environment Variables

1. In Amplify Console, go to your app
2. Click "App settings" → "Environment variables"
3. Click "Manage variables"
4. Add each variable:

**Core Variables**:
```
NODE_ENV = production
DATABASE_URL = postgresql://user:pass@host/dbname
ENCRYPTION_KEY = [generate: openssl rand -hex 32]
SESSION_SECRET = [generate: openssl rand -base64 32]
```

**AI**:
```
OPENAI_API_KEY = sk-your-production-key
```

**Lightspeed**:
```
LS_CLIENT_ID = b16a2df414bee9070b564b7cd7a46326024d6078f4b130cbbd329abed254a398
LS_CLIENT_SECRET = fc0b95186042228d2ea9e7608723a58bdd176c1a2e9a76bca3f6f4c6c340fe0e
LS_REDIRECT_URI = https://askeuno.com/api/oauth/callback/lightspeed
```

**File Storage (S3)**:
```
STORAGE_MODE = s3
AWS_ACCESS_KEY_ID = [from IAM user]
AWS_SECRET_ACCESS_KEY = [from IAM user]
AWS_REGION = us-east-1
AWS_S3_BUCKET = askeuno-uploads
```

**Application URLs**:
```
APP_URL = https://askeuno.com
FRONTEND_URL = https://askeuno.com
```

**Error Monitoring** (if using Sentry):
```
SENTRY_DSN = https://...@sentry.io/...
VITE_SENTRY_DSN = https://...@sentry.io/...
```

5. Click "Save"

---

## Step 4: Connect Custom Domain

### 4.1 Add Domain in Amplify

1. In Amplify Console → Your app
2. Click "Domain management"
3. Click "Add domain"
4. Enter: `askeuno.com`
5. Click "Configure domain"

### 4.2 Configure DNS

Amplify will provide DNS records to add:

1. Copy the DNS records (usually CNAME)
2. Go to your domain registrar (where you bought askeuno.com)
3. Add the DNS records
4. Wait for DNS propagation (can take up to 48 hours, usually faster)

### 4.3 SSL Certificate

AWS Amplify automatically provisions SSL certificates via AWS Certificate Manager (ACM). No action needed - it happens automatically when domain is verified.

---

## Step 5: Update Lightspeed Redirect URI

1. Go to: https://developers.lightspeedhq.com/
2. Log in
3. Find your R-Series application
4. Click "Edit"
5. Add redirect URI: `https://askeuno.com/api/oauth/callback/lightspeed`
6. Save

**Important**: Keep both localhost and production URIs if you want to test locally.

---

## Step 6: Deploy

### 6.1 First Deployment

1. Make sure all code is committed:
   ```bash
   git add .
   git commit -m "Production ready"
   git push origin main
   ```

2. AWS Amplify will automatically:
   - Detect the push
   - Start building
   - Deploy to production

3. Monitor the build:
   - Go to Amplify Console
   - Click "Deployments" tab
   - Watch build progress
   - Check logs if it fails

### 6.2 Verify Deployment

1. Visit: https://askeuno.com
2. Test signup/login
3. Test file upload
4. Test Lightspeed connection
5. Test AI chat
6. Check Sentry for errors

---

## Step 7: Run Database Migrations

### Option A: From Local Machine

```bash
# Set production DATABASE_URL temporarily
export DATABASE_URL="your-production-database-url"

# Run migrations
npm run db:push
```

### Option B: From AWS CloudShell

1. Go to: https://console.aws.amazon.com/cloudshell/
2. Clone your repo
3. Install Node.js
4. Run migrations

### Option C: Add to Build Process

Add to `amplify.yml`:
```yaml
preBuild:
  commands:
    - npm ci
    - npm run db:push  # Run migrations
```

**Note**: Only do this if migrations are idempotent (safe to run multiple times).

---

## Step 8: Set Up Monitoring

### 8.1 Sentry (Error Monitoring)

1. Go to: https://sentry.io
2. Create project: "Ask Euno Production"
3. Get DSN
4. Add to Amplify environment variables
5. Test error reporting

### 8.2 Uptime Monitoring

1. Go to: https://uptimerobot.com (free)
2. Add monitor:
   - URL: `https://askeuno.com/api/health`
   - Interval: 5 minutes
3. Set up email alerts

---

## Step 9: Set Up Backups

### Option A: Automated Script (AWS Lambda)

1. Create Lambda function
2. Schedule daily execution
3. Use backup script: `scripts/backup-database.sh`
4. Store backups in S3

### Option B: Database Provider Backups

- **Neon**: Automatic daily backups (included)
- **Supabase**: Automatic backups (included)
- **AWS RDS**: Enable automated backups in console

---

## Troubleshooting

### Build Fails

**Check**:
1. Build logs in Amplify Console
2. Test `npm run build` locally
3. Verify all dependencies are in `package.json`

**Fix**:
```bash
# Test locally first
npm run build

# Fix any errors
# Then commit and push
```

### Environment Variables Not Working

**Check**:
1. Variables are set in Amplify Console
2. Variable names match code exactly
3. No typos or extra spaces

**Fix**:
1. Double-check variable names
2. Restart build after adding variables

### Database Connection Fails

**Check**:
1. `DATABASE_URL` is correct
2. Database allows connections from AWS IPs
3. Database is running

**Fix**:
1. Test connection from local machine
2. Whitelist AWS Amplify IPs if needed
3. Check database firewall rules

### File Uploads Not Working

**Check**:
1. S3 bucket exists
2. IAM credentials are correct
3. CORS is configured
4. `STORAGE_MODE=s3` is set

**Fix**:
1. Verify S3 bucket permissions
2. Test S3 access with AWS CLI
3. Check CORS configuration

---

## Post-Deployment Checklist

- [ ] Site loads at https://askeuno.com
- [ ] SSL certificate active (green lock)
- [ ] Signup/login works
- [ ] File upload works (S3)
- [ ] Lightspeed OAuth works
- [ ] AI chat works
- [ ] Database connected
- [ ] Error monitoring active (Sentry)
- [ ] Health check endpoint works
- [ ] No errors in Sentry
- [ ] Backups configured

---

## Quick Reference

### Generate Production Secrets

```bash
# ENCRYPTION_KEY (64 hex chars)
openssl rand -hex 32

# SESSION_SECRET (32+ chars)
openssl rand -base64 32
```

### Test Production Build Locally

```bash
npm run build
npm start
# Visit http://localhost:5000
```

### Deploy Command

```bash
git add .
git commit -m "Your changes"
git push origin main
# Amplify auto-deploys
```

---

**Last Updated**: January 31, 2026
