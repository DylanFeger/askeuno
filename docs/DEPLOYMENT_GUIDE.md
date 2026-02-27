# 🚀 Ask Euno MVP - Complete Deployment Guide

**Target**: Production deployment to AWS App Runner  
**Domain**: askeuno.com  
**Last Updated**: February 27, 2026

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Deployment Platform](#deployment-platform)
4. [Step-by-Step Deployment](#step-by-step-deployment)
5. [Post-Deployment](#post-deployment)
6. [Additional Resources](#additional-resources)

---

## 📖 Overview

This guide provides complete instructions for deploying Ask Euno MVP to production using AWS App Runner.

### What You'll Deploy

- **Frontend**: React application (served by Express)
- **Backend**: Express.js API server
- **Database**: PostgreSQL (external - Neon/Supabase/RDS)
- **Storage**: AWS S3 for file uploads
- **Domain**: askeuno.com with SSL

### Deployment Architecture

```
┌─────────────────────────────────────┐
│      AWS App Runner Container       │
│  ┌───────────────────────────────┐  │
│  │   Express Server (Port 5000)  │  │
│  │   ├── API Routes (/api/*)     │  │
│  │   └── Static Files (/*)       │  │
│  └───────────────────────────────┘  │
│         │                            │
│         ├──> PostgreSQL (Neon/RDS)   │
│         ├──> AWS S3 (File Storage)   │
│         └──> OpenAI API              │
└─────────────────────────────────────┘
         │
         └──> askeuno.com (Custom Domain)
```

---

## ✅ Prerequisites

Before starting, ensure you have:

- [ ] **AWS Account** with App Runner access
- [ ] **Production Database** configured (Neon/Supabase/RDS)
- [ ] **AWS S3 Bucket** created and configured
- [ ] **Domain** `askeuno.com` registered (or DNS access)
- [ ] **Git Repository** with code (GitHub/Bitbucket/CodeCommit)
- [ ] **Environment Variables** documented (see [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md))
- [ ] **Build tested locally** (see Testing section)

---

## 🎯 Deployment Platform

### Recommended: AWS App Runner

**Why App Runner?**
- ✅ Single container for full-stack app
- ✅ Automatic scaling
- ✅ Built-in SSL certificates
- ✅ Easy custom domain setup
- ✅ Git integration for auto-deploy

**Alternative**: AWS Amplify (for frontend-only) + App Runner (for backend)

See [DEPLOYMENT_ANALYSIS.md](./DEPLOYMENT_ANALYSIS.md) for detailed comparison.

---

## 🚀 Step-by-Step Deployment

### Step 1: Prepare Repository

1. **Verify Build Works Locally**
   ```bash
   # Install dependencies
   npm ci
   
   # Build application
   npm run build
   
   # Verify build output
   ls -la dist/
   ls -la dist/public/
   ```

2. **Test Docker Build** (if using container deployment)
   ```bash
   # Build Docker image
   docker build -t askeuno:test .
   
   # Test container
   docker run -p 5000:5000 \
     -e DATABASE_URL="your-db-url" \
     -e SESSION_SECRET="test-secret" \
     askeuno:test
   
   # Test health endpoint
   curl http://localhost:5000/api/health
   ```

3. **Push to Repository**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

---

### Step 2: Create App Runner Service

1. **Navigate to AWS App Runner Console**
   - Go to https://console.aws.amazon.com/apprunner
   - Click **"Create service"**

2. **Configure Source**
   - **Source type**: Choose one:
     - **Source code repository** (recommended for auto-deploy)
     - **Container registry** (ECR) - if using Docker images
   
   **For Source Code Repository**:
   - Connect your Git provider (GitHub/Bitbucket)
   - Select repository: `your-org/ask-euno`
   - Select branch: `main`
   - **Deployment trigger**: `Automatic` (deploy on every push)

3. **Configure Build**
   - **Build configuration**: `Use a configuration file` (uses `apprunner.yaml`)
   - Or: `Configure build settings` (manual configuration)
   - **Runtime**: `Node.js 20`
   - **Build command**: Auto-detected from `apprunner.yaml`

4. **Configure Service**
   - **Service name**: `ask-euno-production`
   - **Port**: `5000`
   - **Health check path**: `/api/health`
   - **Health check interval**: `30` seconds
   - **Health check timeout**: `10` seconds
   - **Health check healthy threshold**: `1`
   - **Health check unhealthy threshold**: `5`

5. **Configure Environment Variables**
   - Add all required environment variables (see [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md))
   - Use [DEPLOYMENT_VARIABLES_CHECKLIST.md](./DEPLOYMENT_VARIABLES_CHECKLIST.md) as reference

6. **Configure Auto-Scaling** (Optional)
   - **Min instances**: `1`
   - **Max instances**: `10`
   - **Concurrency**: `100` requests per instance

7. **Review and Create**
   - Review all settings
   - Click **"Create & deploy"**

---

### Step 3: Configure Custom Domain

1. **Add Custom Domain**
   - Go to App Runner service → **"Custom domains"** tab
   - Click **"Add domain"**
   - Enter: `askeuno.com`
   - Click **"Add"**

2. **Configure DNS**
   - Copy CNAME record from App Runner
   - Add CNAME record in your DNS provider:
     - **Type**: `CNAME`
     - **Name**: `@` (for root) or `www` (for subdomain)
     - **Value**: `xyz123.us-east-1.awsapprunner.com` (from App Runner)
   
   See [CUSTOM_DOMAIN_SETUP.md](./CUSTOM_DOMAIN_SETUP.md) for detailed instructions.

3. **Wait for SSL Certificate**
   - SSL certificate provisions automatically
   - Takes 5-30 minutes
   - Status changes to "Active" when ready

---

### Step 4: Verify Deployment

1. **Check Deployment Status**
   - Go to App Runner service → **"Deployments"** tab
   - Verify deployment status: "Successful"
   - Review deployment logs for errors

2. **Test Application**
   - Visit: `https://askeuno.com`
   - Test health endpoint: `https://askeuno.com/api/health`
   - Verify application loads correctly
   - Test critical features

3. **Check Logs**
   - Go to App Runner service → **"Logs"** tab
   - Review application logs
   - Check for errors or warnings

---

## 🎉 Post-Deployment

### 1. Verify Everything Works

- [ ] Application accessible at `https://askeuno.com`
- [ ] Health check passes: `https://askeuno.com/api/health`
- [ ] Frontend loads correctly
- [ ] API endpoints work
- [ ] Database connection works
- [ ] File uploads work (S3)
- [ ] OAuth flows work (Lightspeed)
- [ ] AI chat works (OpenAI)

### 2. Configure Monitoring

- [ ] Set up Sentry error monitoring (if configured)
- [ ] Set up CloudWatch alarms
- [ ] Configure uptime monitoring (UptimeRobot, etc.)
- [ ] Set up deployment notifications

### 3. Enable Auto-Deployment

- [ ] Verify auto-deploy is enabled
- [ ] Test auto-deploy with small change
- [ ] Configure branch protection (for production)
- [ ] Set up deployment notifications

See [AUTO_DEPLOYMENT.md](./AUTO_DEPLOYMENT.md) for detailed instructions.

### 4. Document Deployment

- [ ] Document deployment process
- [ ] Create runbook for common issues
- [ ] Share access with team
- [ ] Document rollback procedure

---

## 🔧 Testing Deployment

### Local Testing

Before deploying, test locally:

```bash
# 1. Install dependencies
npm ci

# 2. Build application
npm run build

# 3. Test with production-like environment
NODE_ENV=production \
DATABASE_URL="your-db-url" \
SESSION_SECRET="test-secret" \
npm start

# 4. Test health endpoint
curl http://localhost:5000/api/health

# 5. Test Docker build (if using containers)
docker build -t askeuno:test .
docker run -p 5000:5000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="your-db-url" \
  askeuno:test
```

### Post-Deployment Testing

After deployment:

1. **Smoke Tests**
   - Application loads
   - Health check passes
   - API endpoints respond
   - Frontend renders

2. **Functional Tests**
   - User registration/login
   - File upload
   - Data source connections
   - AI chat interface
   - Dashboard creation

3. **Performance Tests**
   - Response times acceptable
   - No memory leaks
   - Database queries optimized

---

## 🚨 Troubleshooting

If you encounter issues:

1. **Check Logs**
   - App Runner console → Logs tab
   - Review build logs
   - Check application logs

2. **Common Issues**
   - See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for solutions

3. **Rollback**
   - Go to Deployments tab
   - Select previous successful deployment
   - Click "Deploy"

---

## 📚 Additional Resources

### Documentation

- [Deployment Analysis](./DEPLOYMENT_ANALYSIS.md) - Platform comparison
- [Environment Variables](./ENVIRONMENT_VARIABLES.md) - Complete variable guide
- [Environment Variables Checklist](./DEPLOYMENT_VARIABLES_CHECKLIST.md) - Quick checklist
- [Custom Domain Setup](./CUSTOM_DOMAIN_SETUP.md) - Domain configuration
- [Auto-Deployment](./AUTO_DEPLOYMENT.md) - CI/CD setup
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and solutions

### AWS Resources

- [AWS App Runner Documentation](https://docs.aws.amazon.com/apprunner)
- [AWS App Runner Pricing](https://aws.amazon.com/apprunner/pricing/)
- [AWS Certificate Manager](https://docs.aws.amazon.com/acm)

### External Resources

- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html)
- [AWS S3 Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)

---

## ✅ Deployment Checklist

Use this checklist for each deployment:

### Pre-Deployment
- [ ] Code reviewed and approved
- [ ] Tests pass locally
- [ ] Build succeeds locally
- [ ] Environment variables updated (if needed)
- [ ] Database migrations tested
- [ ] Documentation updated

### Deployment
- [ ] App Runner service created/updated
- [ ] Environment variables configured
- [ ] Custom domain configured (if first deployment)
- [ ] Deployment triggered
- [ ] Deployment status: Successful

### Post-Deployment
- [ ] Application accessible
- [ ] Health check passes
- [ ] Critical features tested
- [ ] Logs reviewed (no errors)
- [ ] Monitoring configured
- [ ] Team notified

---

## 🎯 Success Criteria

Your deployment is successful when:

- ✅ Application accessible at `https://askeuno.com`
- ✅ SSL certificate active (HTTPS works)
- ✅ Health check endpoint returns 200
- ✅ All critical features work
- ✅ Database connections work
- ✅ File uploads work (S3)
- ✅ OAuth flows work
- ✅ AI chat works
- ✅ No critical errors in logs
- ✅ Auto-deployment configured (optional)
- ✅ Monitoring active

---

## 🔄 Next Steps

After successful deployment:

1. **Monitor Application**
   - Set up error monitoring (Sentry)
   - Configure uptime monitoring
   - Set up performance monitoring

2. **Optimize Performance**
   - Review database queries
   - Add caching where appropriate
   - Optimize build process

3. **Scale as Needed**
   - Monitor traffic
   - Adjust auto-scaling settings
   - Optimize resource allocation

4. **Maintain and Update**
   - Regular security updates
   - Monitor for issues
   - Update dependencies

---

**Status**: Complete ✅  
**Last Updated**: February 27, 2026  
**Ready for Production**: Yes 🚀
