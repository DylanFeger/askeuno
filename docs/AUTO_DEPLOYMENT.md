# 🔄 Ask Euno MVP - Auto-Deployment Setup Guide

**Platform**: AWS App Runner  
**Last Updated**: February 27, 2026

---

## 📋 Overview

This guide explains how to configure automatic deployments for Ask Euno when code is pushed to your Git repository.

---

## 🎯 Deployment Strategy

### Recommended Branch Strategy

```
main (production)
  └── Auto-deploy to production
  └── Protected branch (requires PR)

staging (optional)
  └── Auto-deploy to staging environment
  └── For testing before production

feature/* (development)
  └── No auto-deploy
  └── Manual testing only
```

### Deployment Flow

1. **Development**: Work on feature branches
2. **Testing**: Merge to `staging` (if configured)
3. **Production**: Merge to `main` → Auto-deploy to production

---

## 🚀 AWS App Runner Auto-Deployment Setup

### Option 1: Source-Based Deployment (Recommended)

AWS App Runner can connect directly to your Git repository and auto-deploy on push.

#### Step 1: Connect Repository

1. **Create App Runner Service**
   - Go to AWS App Runner Console
   - Click **"Create service"**

2. **Select Source**
   - Choose **"Source code repository"**
   - Select your Git provider:
     - GitHub
     - Bitbucket
     - CodeCommit

3. **Connect Repository**
   - **GitHub**: Authorize AWS App Runner
   - **Bitbucket**: Authorize AWS App Runner
   - **CodeCommit**: Use IAM credentials

4. **Select Repository**
   - Choose repository: `your-org/ask-euno` (or your repo name)
   - Select branch: `main` (or your production branch)

#### Step 2: Configure Build Settings

1. **Build Configuration**
   - **Deployment trigger**: `Automatic` (deploy on every push)
   - **Build command**: Uses `apprunner.yaml` or auto-detects
   - **Runtime**: Node.js 20

2. **Service Configuration**
   - **Port**: `5000`
   - **Environment variables**: Configure all required variables
   - **Health check**: `/api/health`

#### Step 3: Enable Auto-Deploy

1. **Automatic Deployments**
   - ✅ **Enable automatic deployments**
   - Select branch: `main`
   - Deploy on: `Every push`

2. **Manual Deployments** (Optional)
   - You can also trigger manual deployments
   - Useful for testing specific commits

---

### Option 2: Container-Based Deployment (Alternative)

If you prefer container-based deployments:

1. **Build Docker Image**
   - Build image: `docker build -t askeuno:latest .`
   - Push to ECR: `docker push askeuno:latest`

2. **Configure App Runner**
   - Select **"Container registry"** as source
   - Choose ECR repository
   - Configure auto-deploy on image push

3. **CI/CD Pipeline** (GitHub Actions example)
   ```yaml
   # .github/workflows/deploy.yml
   name: Deploy to App Runner
   
   on:
     push:
       branches: [main]
   
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Build and push
           run: |
             docker build -t askeuno .
             # Push to ECR
   ```

---

## 🔧 GitHub Actions CI/CD (Advanced)

For more control, use GitHub Actions:

### Create Workflow File

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to AWS App Runner

on:
  push:
    branches:
      - main
  workflow_dispatch: # Allow manual trigger

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Deploy to App Runner
        run: |
          # Trigger App Runner deployment
          aws apprunner start-deployment \
            --service-arn ${{ secrets.APP_RUNNER_SERVICE_ARN }}
```

### GitHub Secrets Required

Add these secrets in GitHub repository settings:

- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `APP_RUNNER_SERVICE_ARN` - App Runner service ARN

---

## 🎛️ Branch Strategy Configuration

### Production Branch (main)

**Settings**:
- ✅ Auto-deploy on push
- ✅ Protected branch (require PR)
- ✅ Require code review
- ✅ Require status checks

**Deployment**:
- Automatic on merge to `main`
- Deploys to production environment
- Uses production environment variables

### Staging Branch (staging) - Optional

**Settings**:
- ✅ Auto-deploy on push
- ⚠️ Less strict protection

**Deployment**:
- Automatic on push to `staging`
- Deploys to staging environment
- Uses staging environment variables

### Feature Branches

**Settings**:
- ❌ No auto-deploy
- Manual testing only

**Deployment**:
- Manual deployment if needed
- Use for testing specific features

---

## 🔔 Deployment Notifications

### Configure Notifications

1. **AWS SNS Notifications**
   - Create SNS topic for deployments
   - Subscribe to email/Slack
   - Configure App Runner to send notifications

2. **GitHub Status Checks**
   - App Runner updates GitHub commit status
   - Shows deployment status in PR

3. **Slack Integration** (Optional)
   - Use AWS Chatbot
   - Receive deployment notifications in Slack

---

## 🧪 Testing Deployment Process

### Test Checklist

1. **Local Build Test**
   ```bash
   npm run build
   docker build -t askeuno:test .
   docker run -p 5000:5000 askeuno:test
   ```

2. **Test Deployment**
   - Make small change to `main` branch
   - Push to repository
   - Verify App Runner starts deployment
   - Check deployment logs
   - Verify application works

3. **Rollback Test**
   - Deploy previous version
   - Verify rollback works
   - Test rollback procedure

---

## 🚨 Deployment Safety

### Pre-Deployment Checks

Before deploying to production:

- [ ] All tests pass
- [ ] Code review completed
- [ ] Environment variables updated (if needed)
- [ ] Database migrations tested
- [ ] Build succeeds locally
- [ ] No breaking changes

### Deployment Monitoring

During deployment:

- [ ] Monitor deployment logs
- [ ] Check health endpoint: `/api/health`
- [ ] Verify application loads
- [ ] Test critical features
- [ ] Monitor error rates

### Post-Deployment Verification

After deployment:

- [ ] Application accessible
- [ ] Health check passes
- [ ] API endpoints working
- [ ] Frontend loads correctly
- [ ] No errors in logs
- [ ] Performance acceptable

---

## 🔄 Rollback Procedure

### Quick Rollback

1. **Via App Runner Console**
   - Go to App Runner service
   - Click **"Deployments"** tab
   - Select previous successful deployment
   - Click **"Deploy"**

2. **Via AWS CLI**
   ```bash
   aws apprunner start-deployment \
     --service-arn <service-arn> \
     --source-image-digest <previous-digest>
   ```

3. **Via Git Revert**
   - Revert commit in Git
   - Push to `main`
   - App Runner auto-deploys reverted version

---

## 📊 Deployment Status

### Check Deployment Status

1. **App Runner Console**
   - Go to service → **"Deployments"** tab
   - View deployment history
   - Check deployment status

2. **Deployment States**
   - **Pending**: Deployment queued
   - **In Progress**: Currently deploying
   - **Successful**: Deployment completed
   - **Failed**: Deployment failed (check logs)

3. **Deployment Logs**
   - View build logs
   - View runtime logs
   - Check for errors

---

## 🐛 Troubleshooting Auto-Deploy

### Issue: Auto-deploy not triggering

**Solutions**:
- Verify branch is configured for auto-deploy
- Check repository connection is active
- Verify App Runner service is running
- Check deployment settings

### Issue: Deployment fails

**Solutions**:
- Check build logs for errors
- Verify environment variables are set
- Check Dockerfile/build configuration
- Verify dependencies are available

### Issue: Deployment takes too long

**Solutions**:
- Optimize Dockerfile (multi-stage builds)
- Reduce build dependencies
- Use build cache
- Check App Runner service limits

---

## ✅ Deployment Checklist

Before enabling auto-deploy:

- [ ] Repository connected to App Runner
- [ ] Build configuration tested locally
- [ ] Environment variables configured
- [ ] Health check endpoint working
- [ ] Deployment process tested manually
- [ ] Rollback procedure documented
- [ ] Notifications configured
- [ ] Branch protection enabled (for production)

---

## 📚 Additional Resources

- [AWS App Runner Auto-Deployment](https://docs.aws.amazon.com/apprunner/latest/dg/manage-deploy.html)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS App Runner Best Practices](https://docs.aws.amazon.com/apprunner/latest/dg/best-practices.html)

---

**Status**: Complete ✅  
**Next**: Test deployment process
