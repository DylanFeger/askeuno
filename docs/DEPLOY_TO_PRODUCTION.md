# Deploy to Production (askeuno.com)

## Overview

Your app is currently deployed to **askeuno.com** using **AWS Amplify**. Unlike Replit's one-click deploy, you'll need to push changes to git, and Amplify will automatically build and deploy.

---

## Quick Deploy Process

### Step 1: Make Your Changes
Edit files in Cursor as needed.

### Step 2: Commit Changes to Git
```bash
# Check what changed
git status

# Add all changes
git add .

# Commit with a message
git commit -m "Fix Lightspeed integration"

# Push to your repository
git push origin main
```

### Step 3: AWS Amplify Auto-Deploys
AWS Amplify automatically:
1. ✅ Detects the git push
2. ✅ Runs `npm ci` (installs dependencies)
3. ✅ Runs `npm run build` (builds the app)
4. ✅ Deploys to askeuno.com
5. ✅ Updates the live site

**That's it!** Your changes will be live in 2-5 minutes.

---

## How It Works

### AWS Amplify Configuration

Your `amplify.yml` file tells Amplify how to build:

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

This means:
- Install dependencies with `npm ci`
- Build with `npm run build`
- Deploy everything from the `dist` folder

### Environment Variables

Environment variables are set in **AWS Amplify Console**:
1. Go to AWS Amplify Console
2. Select your app
3. Go to "Environment variables"
4. Add/update variables there

**Required variables:**
- `DATABASE_URL`
- `SESSION_SECRET`
- `ENCRYPTION_KEY`
- `OPENAI_API_KEY`
- `LS_CLIENT_ID` (for Lightspeed)
- `LS_CLIENT_SECRET` (for Lightspeed)
- `LS_REDIRECT_URI` (should be `https://askeuno.com/api/oauth/callback/lightspeed`)
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- And any others your app needs

---

## Deployment Methods

### Method 1: Git Push (Recommended - Automatic)

**Best for**: Regular updates, code changes

```bash
git add .
git commit -m "Your change description"
git push origin main
```

Amplify automatically deploys in 2-5 minutes.

### Method 2: Manual Deploy in Amplify Console

**Best for**: Re-deploying without code changes, rollbacks

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify)
2. Select your app
3. Click "Redeploy this version" on any previous build
4. Or trigger a new build manually

### Method 3: Amplify CLI (Advanced)

**Best for**: CI/CD pipelines, automation

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Configure (one-time)
amplify configure

# Deploy
amplify publish
```

---

## Checking Deployment Status

### In AWS Amplify Console
1. Go to AWS Amplify Console
2. Select your app
3. View the "Deployments" tab
4. See build logs, status, and timing

### Via Email/Notifications
- AWS Amplify can send email notifications on deploy success/failure
- Configure in Amplify Console → App settings → Notifications

### Check Live Site
- Visit `https://askeuno.com`
- Check if your changes are live
- Test the functionality

---

## Troubleshooting Deployments

### Build Fails

**Check build logs in Amplify Console:**
1. Go to the failed build
2. Click "View logs"
3. Look for error messages

**Common issues:**
- **Missing environment variables**: Add them in Amplify Console
- **Build errors**: Check `npm run build` works locally first
- **TypeScript errors**: Run `npm run check` locally to catch them

**Fix:**
```bash
# Test build locally first
npm run build

# Fix any errors
# Then commit and push again
git add .
git commit -m "Fix build errors"
git push
```

### Changes Not Appearing

1. **Wait a few minutes** - Deployment takes 2-5 minutes
2. **Clear browser cache** - Hard refresh (`Cmd+Shift+R` or `Ctrl+Shift+R`)
3. **Check build succeeded** - Verify in Amplify Console
4. **Check the right branch** - Make sure you pushed to the branch Amplify is watching

### Rollback to Previous Version

1. Go to AWS Amplify Console
2. Select your app
3. Go to "Deployments" tab
4. Find a previous successful build
5. Click "Redeploy this version"

---

## Pre-Deployment Checklist

Before pushing to production:

- [ ] **Test locally** - Run `npm run dev` and test your changes
- [ ] **Build works** - Run `npm run build` successfully
- [ ] **No TypeScript errors** - Run `npm run check`
- [ ] **Environment variables set** - Check Amplify Console
- [ ] **Database migrations** - Run `npm run db:push` if schema changed
- [ ] **Test critical features** - Login, upload, chat, etc.

---

## Deployment Best Practices

### 1. Commit Often, Deploy When Ready
```bash
# Make small, focused commits
git commit -m "Fix: Lightspeed OAuth callback creates dataSource"

# Not one giant commit
# git commit -m "Everything"
```

### 2. Test Before Deploying
```bash
# Always test locally first
npm run dev
# Test in browser at http://localhost:5000
```

### 3. Use Meaningful Commit Messages
```bash
# Good
git commit -m "Fix: Lightspeed integration creates dataSource entry"

# Bad
git commit -m "fix"
```

### 4. Monitor Deployments
- Check Amplify Console after each deploy
- Monitor Sentry for errors in production
- Check application logs

### 5. Staging Environment (Optional)
Consider setting up a staging branch:
- `main` → Production (askeuno.com)
- `staging` → Staging (staging.askeuno.com)

---

## Comparison: Replit vs AWS Amplify

| Feature | Replit | AWS Amplify |
|---------|--------|-------------|
| **Deploy Button** | ✅ One-click | ❌ Git push required |
| **Auto-Deploy** | ✅ Instant | ✅ 2-5 minutes |
| **Build Process** | Automatic | Configurable (amplify.yml) |
| **Environment Vars** | Secrets tab | Console settings |
| **Custom Domain** | ✅ Easy | ✅ Easy |
| **SSL Certificate** | ✅ Auto | ✅ Auto |
| **Cost** | Paid plans | Pay-as-you-go |
| **Scalability** | Limited | Highly scalable |

---

## Quick Reference

### Deploy Command
```bash
git add . && git commit -m "Your message" && git push origin main
```

### Check Deployment
- AWS Amplify Console: https://console.aws.amazon.com/amplify
- Live site: https://askeuno.com

### View Logs
- Build logs: AWS Amplify Console → Your app → Deployments
- Application logs: Check your logging service (CloudWatch, etc.)

---

## Need Help?

### Build Failing?
1. Check build logs in Amplify Console
2. Test `npm run build` locally
3. Fix errors and push again

### Changes Not Live?
1. Wait 2-5 minutes
2. Clear browser cache
3. Check build succeeded

### Environment Variables?
1. Go to Amplify Console
2. App settings → Environment variables
3. Add/update variables

---

**Remember**: Unlike Replit's instant deploy, Amplify takes 2-5 minutes. But it's more reliable and scalable for production!
