# Production Readiness - Immediate Action Plan

**Created:** February 14, 2026  
**Goal:** Get Ask Euno production-ready for businesses  
**Status:** 🔴 Critical items remaining

---

## 🎯 What We're Working On

Making Ask Euno production-ready so businesses can use it reliably. We'll tackle the most critical items first.

---

## 🔴 CRITICAL - Do These First (Blocks Launch)

### 1. Production Database Setup ⏱️ 1-2 hours
**Why:** All user data, connections, and chats need a production database.

**Steps:**
1. **Choose provider:**
   - **Neon** (recommended - free tier, easy setup): https://neon.tech
   - **Supabase**: https://supabase.com
   - **AWS RDS**: https://console.aws.amazon.com/rds

2. **Create database:**
   - Sign up/login to chosen provider
   - Create new PostgreSQL database
   - Copy the `DATABASE_URL` connection string

3. **Test connection:**
   ```bash
   # Update .env with production DATABASE_URL temporarily
   DATABASE_URL=postgresql://...
   npm run db:push
   ```

4. **Set up backups:**
   - Most providers offer automated backups
   - Verify backup schedule is enabled

**Output:** Production `DATABASE_URL` ready to add to Amplify

---

### 2. Generate Production Secrets ⏱️ 15 minutes
**Why:** Security - production needs unique, secure keys.

**Steps:**
```bash
# Generate ENCRYPTION_KEY (64 hex characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate SESSION_SECRET (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Save these securely** - you'll add them to AWS Amplify environment variables.

**Output:** Two secure random strings for production

---

### 3. AWS S3 Setup for File Storage ⏱️ 1 hour
**Why:** Users need to upload files (CSV, Excel, etc.) - S3 stores them securely.

**Steps:**
1. **Create S3 bucket:**
   - Go to: https://console.aws.amazon.com/s3/
   - Click "Create bucket"
   - Name: `askeuno-uploads` (or your preference)
   - Region: `us-east-1` (or same as Amplify)
   - Block all public access: ✅ Enabled (private bucket)
   - Click "Create bucket"

2. **Create IAM user for S3 access:**
   - Go to: https://console.aws.amazon.com/iam/
   - Click "Users" → "Create user"
   - Name: `askeuno-s3-user`
   - Select "Attach policies directly"
   - Search and select: `AmazonS3FullAccess` (or create custom policy)
   - Click "Create user"

3. **Get access credentials:**
   - Click on the user → "Security credentials" tab
   - Click "Create access key"
   - Select "Application running outside AWS"
   - Copy `Access Key ID` and `Secret Access Key` (save securely!)

4. **Configure CORS (if needed for direct uploads):**
   - In S3 bucket → "Permissions" tab → "CORS"
   - Add CORS configuration (see S3_SETUP_STEPS.md)

**Output:** S3 bucket name, Access Key ID, Secret Access Key

---

### 4. Update Lightspeed Redirect URI ⏱️ 15 minutes
**Why:** OAuth requires the exact production URL.

**Steps:**
1. Go to: https://developers.lightspeedhq.com/
2. Log in to your developer account
3. Find your R-Series application
4. Edit application settings
5. Add redirect URI: `https://askeuno.com/api/oauth/callback/lightspeed`
6. Save changes

**Output:** Lightspeed OAuth configured for production

---

### 5. Configure AWS Amplify Environment Variables ⏱️ 30 minutes
**Why:** Production needs all these variables to work.

**Steps:**
1. Go to: https://console.aws.amazon.com/amplify
2. Select your `askeuno` app
3. Go to "App settings" → "Environment variables"
4. Click "Manage variables"
5. Add each variable:

```env
# Core (REQUIRED)
NODE_ENV=production
DATABASE_URL=postgresql://... (from step 1)
ENCRYPTION_KEY=... (from step 2)
SESSION_SECRET=... (from step 2)

# Application URLs
APP_URL=https://askeuno.com
FRONTEND_URL=https://askeuno.com

# Lightspeed (R-Series)
LS_CLIENT_ID=b16a2df414bee9070b564b7cd7a46326024d6078f4b130cbbd329abed254a398
LS_CLIENT_SECRET=fc0b95186042228d2ea9e7608723a58bdd176c1a2e9a76bca3f6f4c6c340fe0e
LS_REDIRECT_URI=https://askeuno.com/api/oauth/callback/lightspeed

# S3 Storage (REQUIRED)
STORAGE_MODE=s3
S3_ACCESS_KEY_ID=... (from step 3)
S3_SECRET_ACCESS_KEY=... (from step 3)
S3_REGION=us-east-1
S3_BUCKET=askeuno-uploads

# AI (if using)
OPENAI_API_KEY=sk-... (your production OpenAI key)

# Error Monitoring (optional but recommended)
SENTRY_DSN=https://...@sentry.io/... (if using Sentry)
VITE_SENTRY_DSN=https://...@sentry.io/... (if using Sentry)
```

6. Click "Save" after adding all variables
7. **Redeploy** the app (Amplify will rebuild with new variables)

**Output:** All production environment variables configured

---

### 6. Run Database Migrations ⏱️ 30 minutes
**Why:** Production database needs tables created.

**Steps:**
1. **Option A: Run from local machine (if DATABASE_URL allows external connections)**
   ```bash
   # Temporarily set production DATABASE_URL
   export DATABASE_URL=postgresql://... (production URL)
   npm run db:push
   ```

2. **Option B: Run from AWS CloudShell or EC2**
   - Connect to AWS CloudShell
   - Clone your repo
   - Set DATABASE_URL environment variable
   - Run `npm run db:push`

3. **Verify tables created:**
   - Connect to production database
   - Check that tables exist (users, data_sources, chats, etc.)

**Output:** Production database schema created

---

## 🟠 HIGH PRIORITY - Do Soon After Launch

### 7. Set Up Error Monitoring (Sentry) ⏱️ 1 hour
**Why:** Need to know when things break in production.

**Steps:**
1. Sign up at: https://sentry.io (free tier available)
2. Create new project → Select "Node.js" and "React"
3. Copy DSNs (backend and frontend)
4. Add to Amplify environment variables (see step 5)
5. Configure alerts (email/Slack notifications)

**Output:** Real-time error tracking active

---

### 8. Set Up Automated Backups ⏱️ 2 hours
**Why:** Data loss prevention.

**Steps:**
1. Check if your database provider offers automated backups (most do)
2. If not, set up AWS Lambda function to run daily backups
3. Store backups in S3
4. Test restore process

**Output:** Daily automated backups running

---

### 9. Set Up Uptime Monitoring ⏱️ 30 minutes
**Why:** Know immediately if site goes down.

**Steps:**
1. Sign up at: https://uptimerobot.com (free tier)
2. Add monitor:
   - URL: `https://askeuno.com`
   - Type: HTTP(s)
   - Interval: 5 minutes
3. Add alert email
4. Test alert

**Output:** Uptime monitoring active

---

## 🟡 MEDIUM PRIORITY - First Month

### 10. Security Audit ⏱️ 1 day
- Run `npm audit` and fix vulnerabilities
- Review security headers
- Audit OAuth implementations
- Set up security monitoring

### 11. Performance Optimization ⏱️ 1-2 days
- Optimize database queries
- Implement caching
- Optimize bundle size
- Monitor response times

### 12. Error Handling & UX ⏱️ 1-2 days
- Add user-friendly error messages
- Implement error boundaries
- Add loading states
- Improve error recovery

---

## ✅ Pre-Launch Verification Checklist

Before going live, verify:

- [ ] Production database connected and tested
- [ ] All environment variables set in Amplify
- [ ] S3 bucket created and file upload tested
- [ ] Lightspeed redirect URI updated
- [ ] Database migrations run
- [ ] Domain connected and SSL active
- [ ] Build succeeds without errors
- [ ] Health check endpoint works: `https://askeuno.com/api/health`
- [ ] Test signup/login flow
- [ ] Test file upload
- [ ] Test Lightspeed OAuth connection
- [ ] Test AI chat functionality
- [ ] Error monitoring active (Sentry)
- [ ] Uptime monitoring active

---

## 🚀 Quick Start - What to Do Right Now

**If you have 2 hours:**
1. ✅ Set up production database (Neon is fastest)
2. ✅ Generate production secrets
3. ✅ Configure Amplify environment variables

**If you have 4 hours:**
1. ✅ All of above
2. ✅ Set up S3 bucket
3. ✅ Update Lightspeed redirect URI
4. ✅ Run database migrations

**If you have 6+ hours:**
1. ✅ All critical items
2. ✅ Set up Sentry monitoring
3. ✅ Set up uptime monitoring
4. ✅ Test everything end-to-end

---

## 📝 Notes

- **Backend Deployment:** Currently working on AWS App Runner deployment (see `DEPLOYMENT_STATUS.md`)
- **Frontend:** Already deployed on AWS Amplify
- **Database:** Need production instance
- **Storage:** Need S3 setup

---

## 🆘 Need Help?

- **Database setup:** See `docs/PRODUCTION_DATABASE_MIGRATIONS.md`
- **S3 setup:** See `S3_SETUP_STEPS.md`
- **Amplify config:** See `docs/AWS_AMPLIFY_PRODUCTION_SETUP.md`
- **Full checklist:** See `PRODUCTION_READINESS_CHECKLIST.md`

---

**Let's get Ask Euno production-ready! 🚀**
