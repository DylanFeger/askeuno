# Production Secrets Template

**⚠️ SECURITY WARNING: This file contains TEMPLATES only. Never commit actual secrets to git!**

This document provides templates for all production secrets needed for Ask Euno MVP.

---

## Generated Production Secrets

The following secrets have been generated for production use. **Replace the placeholders with your actual values.**

### ENCRYPTION_KEY

**Purpose**: Encrypts sensitive data in the database (AES-256 encryption)  
**Format**: 64 hexadecimal characters (32 bytes)  
**Required**: Yes

**Template** (replace with your generated value):
```
ENCRYPTION_KEY=YOUR_64_CHAR_HEX_STRING_HERE
```

**How to Generate**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Example** (DO NOT USE THIS - Generate your own):
```
ENCRYPTION_KEY=88d7a0aa6b665fe21c9d798e5c9915d499cfa42f66c0a001d074ab9b7dffc741
```

---

### SESSION_SECRET

**Purpose**: Signs and verifies session cookies  
**Format**: Base64 string, minimum 32 characters  
**Required**: Yes

**Template** (replace with your generated value):
```
SESSION_SECRET=YOUR_BASE64_SECRET_HERE
```

**How to Generate**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Example** (DO NOT USE THIS - Generate your own):
```
SESSION_SECRET=6kNnmRplVWMQ1OjUVv1wIGF7tOvXPrOiizoAPFg0B84=
```

---

## Database Connection

### DATABASE_URL

**Purpose**: PostgreSQL connection string for production database  
**Format**: `postgresql://user:password@host:port/database?sslmode=require`  
**Required**: Yes

**Template**:
```
DATABASE_URL=postgresql://USERNAME:PASSWORD@HOST:5432/DATABASE?sslmode=require
```

**Where to Get**:
- **Neon.tech**: Dashboard → Connection String
- **Supabase**: Settings → Database → Connection String
- **AWS RDS**: RDS Console → Endpoint

**Example** (DO NOT USE - Replace with your actual connection):
```
DATABASE_URL=postgresql://askeuno_user:secure_password@ep-cool-darkness-123456.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**Security Notes**:
- Always use SSL (`sslmode=require`) in production
- Never commit this to git
- Store in secure environment variable management system

---

## AWS S3 Credentials

### AWS_ACCESS_KEY_ID

**Purpose**: AWS IAM user access key for S3 bucket access  
**Format**: Starts with `AKIA...`  
**Required**: Yes (if using S3 storage)

**Template**:
```
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
```

**Where to Get**:
1. AWS Console → IAM → Users → `askeuno-s3-user`
2. Security credentials tab → Access keys
3. Copy the Access Key ID

**Example** (DO NOT USE - Replace with your actual key):
```
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
```

---

### AWS_SECRET_ACCESS_KEY

**Purpose**: AWS IAM user secret key for S3 bucket access  
**Format**: Long random string  
**Required**: Yes (if using S3 storage)

**Template**:
```
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
```

**Where to Get**:
1. AWS Console → IAM → Users → `askeuno-s3-user`
2. Security credentials tab → Access keys
3. Copy the Secret Access Key (only shown once!)

**Example** (DO NOT USE - Replace with your actual key):
```
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**⚠️ Security Warning**: This key is only shown once. Save it securely!

---

### AWS_REGION

**Purpose**: AWS region where S3 bucket is located  
**Format**: AWS region code  
**Required**: Yes (if using S3 storage)

**Template**:
```
AWS_REGION=us-east-1
```

**Common Regions**:
- `us-east-1` (N. Virginia)
- `us-east-2` (Ohio)
- `us-west-1` (N. California)
- `us-west-2` (Oregon)
- `eu-west-1` (Ireland)
- `ap-southeast-1` (Singapore)

---

### AWS_S3_BUCKET

**Purpose**: Name of S3 bucket for file storage  
**Format**: Bucket name (must be globally unique)  
**Required**: Yes (if using S3 storage)

**Template**:
```
AWS_S3_BUCKET=askeuno-uploads
```

**Note**: Replace with your actual bucket name if different.

---

## Sentry Configuration

### SENTRY_DSN

**Purpose**: Sentry DSN for backend error monitoring  
**Format**: `https://xxx@xxx.ingest.sentry.io/xxx`  
**Required**: No (but highly recommended)

**Template**:
```
SENTRY_DSN=https://YOUR_DSN@sentry.io/YOUR_PROJECT_ID
```

**Where to Get**:
1. Go to https://sentry.io
2. Create project → Node.js
3. Copy the DSN from project settings

**Example** (DO NOT USE - Replace with your actual DSN):
```
SENTRY_DSN=https://abc123def456@o123456.ingest.sentry.io/1234567
```

---

### VITE_SENTRY_DSN

**Purpose**: Sentry DSN for frontend error monitoring  
**Format**: `https://xxx@xxx.ingest.sentry.io/xxx`  
**Required**: No (but recommended)

**Template**:
```
VITE_SENTRY_DSN=https://YOUR_DSN@sentry.io/YOUR_PROJECT_ID
```

**Where to Get**:
1. Go to https://sentry.io
2. Create project → React (or use same project as backend)
3. Copy the DSN from project settings

**Note**: Can be the same as `SENTRY_DSN` if using one project for both.

---

## OpenAI Configuration

### OPENAI_API_KEY

**Purpose**: OpenAI API key for AI chat features  
**Format**: Starts with `sk-...`  
**Required**: No (but required for AI features)

**Template**:
```
OPENAI_API_KEY=sk-YOUR_OPENAI_API_KEY
```

**Where to Get**:
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Copy the key (only shown once!)

**Example** (DO NOT USE - Replace with your actual key):
```
OPENAI_API_KEY=sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

---

## Lightspeed OAuth (Already Configured)

### LS_CLIENT_ID

**Purpose**: Lightspeed R-Series OAuth client ID  
**Format**: Hex string  
**Required**: Yes (for Lightspeed integration)

**Already Configured**:
```
LS_CLIENT_ID=b16a2df414bee9070b564b7cd7a46326024d6078f4b130cbbd329abed254a398
```

---

### LS_CLIENT_SECRET

**Purpose**: Lightspeed R-Series OAuth client secret  
**Format**: Hex string  
**Required**: Yes (for Lightspeed integration)

**Already Configured**:
```
LS_CLIENT_SECRET=fc0b95186042228d2ea9e7608723a58bdd176c1a2e9a76bca3f6f4c6c340fe0e
```

---

### LS_REDIRECT_URI

**Purpose**: OAuth redirect URI for Lightspeed  
**Format**: Full URL  
**Required**: Yes (for Lightspeed integration)

**Production Value**:
```
LS_REDIRECT_URI=https://askeuno.com/api/oauth/callback/lightspeed
```

---

## Complete Secrets Checklist

Use this checklist to ensure all secrets are configured:

### Required Secrets
- [ ] `ENCRYPTION_KEY` - Generated (64 hex chars)
- [ ] `SESSION_SECRET` - Generated (32+ chars)
- [ ] `DATABASE_URL` - From Neon/Supabase/RDS
- [ ] `LS_CLIENT_ID` - Already configured
- [ ] `LS_CLIENT_SECRET` - Already configured
- [ ] `LS_REDIRECT_URI` - Set to production URL

### Optional but Recommended
- [ ] `SENTRY_DSN` - From Sentry project
- [ ] `VITE_SENTRY_DSN` - From Sentry project (frontend)
- [ ] `OPENAI_API_KEY` - From OpenAI dashboard
- [ ] `AWS_ACCESS_KEY_ID` - From AWS IAM user
- [ ] `AWS_SECRET_ACCESS_KEY` - From AWS IAM user
- [ ] `AWS_REGION` - Set to bucket region
- [ ] `AWS_S3_BUCKET` - Set to bucket name

---

## Security Best Practices

1. **Never commit secrets to git**
   - Use `.gitignore` to exclude `.env` files
   - Use environment variables in deployment platform

2. **Use different secrets for each environment**
   - Development secrets ≠ Production secrets
   - Staging secrets ≠ Production secrets

3. **Rotate secrets periodically**
   - Rotate every 90 days (recommended)
   - Rotate immediately if compromised

4. **Store secrets securely**
   - Use AWS Secrets Manager (for AWS deployments)
   - Use environment variables in deployment platform
   - Never hardcode in source code

5. **Limit access to secrets**
   - Only give access to trusted team members
   - Use IAM roles when possible (instead of access keys)

6. **Monitor secret usage**
   - Set up alerts for unusual access patterns
   - Review access logs regularly

---

## How to Use This Template

1. **Copy the template values** to your deployment platform's environment variables
2. **Replace placeholders** with actual values from:
   - Database provider (Neon/Supabase/RDS)
   - AWS Console (S3 credentials)
   - Sentry dashboard (DSN)
   - OpenAI dashboard (API key)
3. **Generate new secrets** for `ENCRYPTION_KEY` and `SESSION_SECRET`
4. **Test all connections** before deploying
5. **Verify secrets are working** after deployment

---

**Last Updated**: February 27, 2026  
**Maintained By**: Production Infrastructure Specialist
