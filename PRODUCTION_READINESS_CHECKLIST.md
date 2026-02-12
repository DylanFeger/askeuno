# Ask Euno - Production Readiness Checklist

**Target**: askeuno.com  
**Deployment Platform**: AWS Amplify  
**Status**: 🟡 In Progress

---

## ✅ COMPLETED (What We've Done)

### Infrastructure & Code
- ✅ **Docker setup** for local development
- ✅ **Replaced all Replit dependencies** (storage, Google Sheets, etc.)
- ✅ **Database connection pooling** implemented
- ✅ **Sentry error monitoring** configured
- ✅ **Environment variable validation** implemented
- ✅ **Local file storage** (ready for S3 switch)
- ✅ **Google Sheets OAuth** (standard implementation)
- ✅ **Lightspeed R-Series** credentials configured
- ✅ **Health check endpoint** enhanced
- ✅ **Automated backup script** created

### Code Quality
- ✅ **Logger integration** (replaced console.*)
- ✅ **Error handling** improvements
- ✅ **TypeScript** strict mode
- ✅ **Code organization** cleanup

---

## 🔴 CRITICAL - Must Do Before Launch

### 1. Production Database Setup
**Status**: ❌ Not Done  
**Priority**: CRITICAL  
**Effort**: 1-2 hours

**Action Items**:
- [ ] Set up production PostgreSQL database (Neon, Supabase, or AWS RDS)
- [ ] Get production `DATABASE_URL`
- [ ] Run migrations: `npm run db:push`
- [ ] Test connection from production environment
- [ ] Set up database backups (automated)

**Where**: AWS Amplify Console → Environment Variables

---

### 2. Production Environment Variables
**Status**: ❌ Not Done  
**Priority**: CRITICAL  
**Effort**: 30 minutes

**Required Variables for AWS Amplify**:
```env
# Core
NODE_ENV=production
DATABASE_URL=postgresql://... (production database)
ENCRYPTION_KEY=... (generate new for production)
SESSION_SECRET=... (generate new for production)

# AI
OPENAI_API_KEY=sk-... (production key)

# Lightspeed (R-Series)
LS_CLIENT_ID=b16a2df414bee9070b564b7cd7a46326024d6078f4b130cbbd329abed254a398
LS_CLIENT_SECRET=fc0b95186042228d2ea9e7608723a58bdd176c1a2e9a76bca3f6f4c6c340fe0e
LS_REDIRECT_URI=https://askeuno.com/api/oauth/callback/lightspeed

# File Storage (S3)
STORAGE_MODE=s3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=askeuno-uploads

# Stripe (if using payments)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Error Monitoring
SENTRY_DSN=https://...@sentry.io/...
VITE_SENTRY_DSN=https://...@sentry.io/...

# Application URLs
APP_URL=https://askeuno.com
FRONTEND_URL=https://askeuno.com
```

**Action Items**:
- [ ] Generate production `ENCRYPTION_KEY` (64 hex chars)
- [ ] Generate production `SESSION_SECRET` (32+ chars)
- [ ] Update `LS_REDIRECT_URI` to `https://askeuno.com/api/oauth/callback/lightspeed`
- [ ] Set up AWS S3 bucket for file storage
- [ ] Add all variables to AWS Amplify Console

**Where**: AWS Amplify Console → App Settings → Environment Variables

---

### 3. AWS S3 Setup for File Storage
**Status**: ❌ Not Done  
**Priority**: CRITICAL  
**Effort**: 1 hour

**Action Items**:
- [ ] Create S3 bucket: `askeuno-uploads` (or your preferred name)
- [ ] Configure bucket permissions (private by default)
- [ ] Set up CORS for file uploads
- [ ] Create IAM user with S3 access
- [ ] Get AWS credentials (Access Key ID, Secret Access Key)
- [ ] Add credentials to Amplify environment variables
- [ ] Test file upload in production

**AWS Console**: https://console.aws.amazon.com/s3/

---

### 4. Update Lightspeed Redirect URI
**Status**: ❌ Not Done  
**Priority**: CRITICAL  
**Effort**: 15 minutes

**Action Items**:
- [ ] Log into Lightspeed Developer Portal: https://developers.lightspeedhq.com/
- [ ] Edit your R-Series application
- [ ] Add production redirect URI: `https://askeuno.com/api/oauth/callback/lightspeed`
- [ ] Save changes
- [ ] Update `.env` in Amplify to use production URI

---

### 5. SSL/HTTPS Configuration
**Status**: ✅ Usually Auto (AWS Amplify)  
**Priority**: CRITICAL  
**Effort**: Automatic

**Action Items**:
- [ ] Verify SSL certificate is auto-provisioned by Amplify
- [ ] Test HTTPS: `https://askeuno.com`
- [ ] Ensure all redirects use HTTPS
- [ ] Check mixed content warnings

**Note**: AWS Amplify automatically provisions SSL certificates for custom domains.

---

### 6. Domain Configuration
**Status**: ⚠️ Check  
**Priority**: CRITICAL  
**Effort**: 30 minutes

**Action Items**:
- [ ] Verify `askeuno.com` is connected in AWS Amplify
- [ ] Check DNS records are correct
- [ ] Test domain resolves correctly
- [ ] Verify SSL certificate is active

**Where**: AWS Amplify Console → App Settings → Domain Management

---

## 🟠 HIGH PRIORITY - Do Soon After Launch

### 7. Production Build & Deploy Test
**Status**: ❌ Not Done  
**Priority**: HIGH  
**Effort**: 1 hour

**Action Items**:
- [ ] Test production build locally: `npm run build`
- [ ] Verify build succeeds without errors
- [ ] Check `dist/` folder contains all necessary files
- [ ] Test production build: `npm start`
- [ ] Push to git and verify Amplify auto-deploys
- [ ] Monitor build logs in Amplify Console

**Command**:
```bash
npm run build
npm start  # Test production build locally
```

---

### 8. Database Migrations in Production
**Status**: ❌ Not Done  
**Priority**: HIGH  
**Effort**: 30 minutes

**Action Items**:
- [ ] Connect to production database
- [ ] Run migrations: `npm run db:push`
- [ ] Verify all tables created
- [ ] Test database connection from production
- [ ] Set up migration automation (optional)

**Note**: May need to run migrations manually first time, then automate.

---

### 9. Monitoring & Alerts Setup
**Status**: ⚠️ Partial (Sentry configured, needs production DSN)  
**Priority**: HIGH  
**Effort**: 1 hour

**Action Items**:
- [ ] Create Sentry project for production
- [ ] Get production Sentry DSN
- [ ] Add to Amplify environment variables
- [ ] Configure alert notifications (email/Slack)
- [ ] Set up UptimeRobot or similar for uptime monitoring
- [ ] Test error reporting works

**Sentry**: https://sentry.io/

---

### 10. Backup Strategy
**Status**: ⚠️ Script exists, needs automation  
**Priority**: HIGH  
**Effort**: 2 hours

**Action Items**:
- [ ] Test backup script: `scripts/backup-database.sh`
- [ ] Set up automated daily backups (cron job or AWS Lambda)
- [ ] Configure S3 backup storage
- [ ] Test restore process
- [ ] Document restore procedure

---

## 🟡 MEDIUM PRIORITY - First Month

### 11. Performance Optimization
**Status**: ⚠️ Partial  
**Priority**: MEDIUM  
**Effort**: 1-2 days

**Action Items**:
- [ ] Enable CDN for static assets (Amplify auto)
- [ ] Optimize images and assets
- [ ] Implement caching headers
- [ ] Monitor response times
- [ ] Optimize database queries

---

### 12. Security Hardening
**Status**: ⚠️ Partial  
**Priority**: MEDIUM  
**Effort**: 1 day

**Action Items**:
- [ ] Review and update security headers
- [ ] Enable rate limiting (already implemented)
- [ ] Review OAuth implementations
- [ ] Audit dependencies for vulnerabilities: `npm audit`
- [ ] Set up security monitoring

---

### 13. Error Handling & User Experience
**Status**: ⚠️ Partial  
**Priority**: MEDIUM  
**Effort**: 1-2 days

**Action Items**:
- [ ] Add user-friendly error messages
- [ ] Implement error boundaries in React
- [ ] Add loading states
- [ ] Improve error recovery flows
- [ ] Add retry mechanisms

---

## 📋 Pre-Launch Checklist

### Before Going Live

- [ ] **Production database** set up and tested
- [ ] **All environment variables** configured in Amplify
- [ ] **S3 bucket** created and configured
- [ ] **Lightspeed redirect URI** updated to production
- [ ] **Domain** connected and SSL active
- [ ] **Build succeeds** without errors
- [ ] **Database migrations** run
- [ ] **Sentry** configured with production DSN
- [ ] **Backups** automated
- [ ] **Health check** endpoint working
- [ ] **Test signup/login** flow
- [ ] **Test file upload** (S3)
- [ ] **Test Lightspeed connection** (OAuth)
- [ ] **Test AI chat** functionality
- [ ] **Monitor logs** for errors

---

## 🚀 Deployment Process

### Step 1: Prepare
```bash
# Test build locally
npm run build

# Check for errors
npm run check

# Test production build
npm start
```

### Step 2: Commit & Push
```bash
git add .
git commit -m "Ready for production deployment"
git push origin main
```

### Step 3: Monitor
- Watch AWS Amplify Console for build status
- Check build logs for errors
- Verify deployment succeeds

### Step 4: Verify
- Visit https://askeuno.com
- Test critical features
- Check Sentry for errors
- Monitor health endpoint

---

## 🔧 AWS Amplify Configuration

### Build Settings (amplify.yml)
Your current `amplify.yml` is configured for frontend-only. For full-stack, you may need to update it.

**Current**: Frontend build only  
**Needed**: Full-stack build (if running Node.js backend on Amplify)

**Options**:
1. **Keep current** (if using separate backend)
2. **Update for full-stack** (if running Node.js on Amplify)

---

## 📊 Success Metrics

### Week 1 Goals
- ✅ Site accessible at https://askeuno.com
- ✅ SSL certificate active
- ✅ Database connected
- ✅ File uploads working (S3)
- ✅ Lightspeed OAuth working
- ✅ Error monitoring active

### Month 1 Goals
- ✅ 99.9% uptime
- ✅ < 2 second response times (p95)
- ✅ < 0.1% error rate
- ✅ Automated backups running
- ✅ Monitoring alerts configured

---

## 🆘 Troubleshooting

### Build Fails
1. Check build logs in Amplify Console
2. Test `npm run build` locally
3. Fix errors and push again

### Environment Variables Not Working
1. Verify variables in Amplify Console
2. Check variable names match code
3. Restart build after adding variables

### Database Connection Fails
1. Verify `DATABASE_URL` is correct
2. Check database allows connections from Amplify IPs
3. Test connection from local machine

---

## 📞 Next Immediate Steps

1. **Set up production database** (Neon/Supabase/RDS)
2. **Configure AWS Amplify environment variables**
3. **Set up S3 bucket for file storage**
4. **Update Lightspeed redirect URI**
5. **Test production build**
6. **Deploy and verify**

---

**Last Updated**: January 31, 2026  
**Next Review**: After completing Critical items
