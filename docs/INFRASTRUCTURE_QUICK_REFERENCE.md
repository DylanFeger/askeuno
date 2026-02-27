# Infrastructure Setup - Quick Reference

Quick reference guide for production infrastructure setup.

## 🚀 Quick Start Checklist

- [ ] **Database**: Set up Neon.tech PostgreSQL → Get `DATABASE_URL`
- [ ] **S3 Bucket**: Create `askeuno-uploads` bucket → Get AWS credentials
- [ ] **Secrets**: Generate `ENCRYPTION_KEY` and `SESSION_SECRET`
- [ ] **Sentry**: Create project → Get `SENTRY_DSN`
- [ ] **Test**: Run `node scripts/test-infrastructure.js`

---

## 📋 Required Environment Variables

### Core (Required)
```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
ENCRYPTION_KEY=64_hex_chars
SESSION_SECRET=32+_chars
```

### S3 Storage (Required for production)
```bash
STORAGE_MODE=s3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=askeuno-uploads
```

### Monitoring (Optional but recommended)
```bash
SENTRY_DSN=https://...@sentry.io/...
VITE_SENTRY_DSN=https://...@sentry.io/...
```

---

## 🔧 Quick Commands

### Generate Secrets
```bash
# ENCRYPTION_KEY (64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# SESSION_SECRET (32+ chars)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Test Infrastructure
```bash
# Test all connections
node scripts/test-infrastructure.js
```

### Test Database
```bash
# Using psql
psql "$DATABASE_URL"

# Using Node.js
node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(() => {
  console.log('✅ Connected!');
  client.end();
});
"
```

### Test S3
```bash
# Using AWS CLI
aws s3 ls s3://askeuno-uploads

# Using Node.js (requires @aws-sdk/client-s3)
node -e "
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
const client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});
client.send(new ListBucketsCommand({})).then(() => console.log('✅ S3 OK'));
"
```

---

## 🔗 Service Links

| Service | URL | Purpose |
|---------|-----|---------|
| **Neon.tech** | https://neon.tech | PostgreSQL database |
| **AWS S3** | https://console.aws.amazon.com/s3/ | File storage |
| **AWS IAM** | https://console.aws.amazon.com/iam/ | S3 credentials |
| **Sentry** | https://sentry.io | Error monitoring |
| **OpenAI** | https://platform.openai.com/api-keys | AI API keys |

---

## 📝 Setup Steps Summary

### 1. Database (5 minutes)
1. Go to https://neon.tech
2. Create project: `askeuno-production`
3. Copy connection string → `DATABASE_URL`

### 2. S3 Bucket (10 minutes)
1. AWS Console → S3 → Create bucket: `askeuno-uploads`
2. Configure CORS (see `docs/INFRASTRUCTURE_SETUP.md`)
3. IAM → Create user: `askeuno-s3-user`
4. Attach `AmazonS3FullAccess` policy
5. Create access keys → Save credentials

### 3. Secrets (2 minutes)
1. Generate `ENCRYPTION_KEY` (64 hex)
2. Generate `SESSION_SECRET` (32+ base64)

### 4. Sentry (5 minutes)
1. Go to https://sentry.io
2. Create project → Node.js
3. Copy DSN → `SENTRY_DSN`

### 5. Test (1 minute)
1. Set environment variables
2. Run: `node scripts/test-infrastructure.js`

---

## ⚠️ Common Issues

### Database Connection Failed
- ✅ Check `DATABASE_URL` format
- ✅ Verify SSL mode: `?sslmode=require`
- ✅ Check firewall/network access

### S3 Access Denied
- ✅ Verify IAM user has S3 permissions
- ✅ Check bucket name matches `AWS_S3_BUCKET`
- ✅ Verify AWS region is correct

### Sentry Not Working
- ✅ Check `SENTRY_DSN` format
- ✅ Verify DSN is from correct project
- ✅ Check Sentry dashboard for errors

---

## 📚 Full Documentation

- **Complete Setup Guide**: `docs/INFRASTRUCTURE_SETUP.md`
- **Secrets Template**: `PRODUCTION_SECRETS_TEMPLATE.md`
- **Environment Template**: `.env.production.template`

---

**Last Updated**: February 27, 2026
