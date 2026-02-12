# AWS App Runner Setup - Step-by-Step Guide

## Why App Runner?

✅ **Fully Managed** - No server management needed  
✅ **Auto-Scaling** - Handles traffic spikes automatically  
✅ **Production Ready** - Built for SaaS applications  
✅ **Cost Effective** - Pay only for what you use  
✅ **Easy Setup** - 15 minutes to deploy  

Perfect for Ask Euno as it grows to serve many businesses!

---

## Step 1: Create App Runner Service (10 minutes)

### 1.1 Go to AWS App Runner Console

1. Open: https://console.aws.amazon.com/apprunner
2. Make sure you're in the **same AWS region** as your Amplify app (probably `us-east-2` or `us-east-1`)
3. Click **"Create service"**

### 1.2 Connect Source Code

1. **Source**: Select **"Source code repository"**
2. **Connect to GitHub**: 
   - Click **"Add new"** if you haven't connected GitHub yet
   - Authorize AWS App Runner to access your GitHub
   - Select **"Only select repositories"** → Choose `DylanFeger/askeuno`
   - Click **"Install"**
3. **Repository**: Select `DylanFeger/askeuno`
4. **Branch**: Select `main`
5. **Deployment trigger**: Select **"Automatic"** (deploys on every push)
6. Click **"Next"**

### 1.3 Configure Build Settings

**Configuration file**: Select **"Use a configuration file"**

App Runner will look for an `apprunner.yaml` file. We'll create this next.

**OR** use manual configuration:

**Build command:**
```bash
npm ci --include=dev && npm run build
```

**Start command:**
```bash
NODE_ENV=production node dist/index.js
```

**Port:** `5000`

Click **"Next"**

### 1.4 Configure Service

**Service name:** `askeuno-backend`

**Virtual CPU:** `1 vCPU` (can scale up later)

**Memory:** `2 GB` (can scale up later)

**Auto scaling:**
- **Min capacity:** `1` instance
- **Max capacity:** `10` instances (auto-scales as traffic grows)

Click **"Next"**

### 1.5 Add Environment Variables

Click **"Add environment variable"** and add each one:

**Core:**
- `NODE_ENV` = `production`
- `PORT` = `5000`

**Database:**
- `DATABASE_URL` = `[your Neon database URL from .env file]`

**Security:**
- `ENCRYPTION_KEY` = `[your encryption key from .env file]`
- `SESSION_SECRET` = `[your session secret from .env file]`

**S3 Storage:**
- `STORAGE_MODE` = `s3`
- `S3_ACCESS_KEY_ID` = `[your S3 access key ID from s3-credentials.txt]`
- `S3_SECRET_ACCESS_KEY` = `[your S3 secret access key from s3-credentials.txt]`
- `S3_REGION` = `us-east-1`
- `S3_BUCKET` = `askeuno-uploads`

**Lightspeed:**
- `LS_CLIENT_ID` = `[your Lightspeed client ID from .env file]`
- `LS_CLIENT_SECRET` = `[your Lightspeed client secret from .env file]`
- `LS_REDIRECT_URI` = `https://askeuno.com/api/oauth/callback/lightspeed`

**Application URLs:**
- `APP_URL` = `https://askeuno.com`
- `FRONTEND_URL` = `https://askeuno.com`

**AI (add when you have it):**
- `OPENAI_API_KEY` = `[your OpenAI API key]` (skip for now if you don't have it)

Click **"Next"**

### 1.6 Review and Create

1. Review all settings
2. Click **"Create & deploy"**
3. Wait 5-10 minutes for deployment

---

## Step 2: Get Your Backend URL

After deployment completes:

1. Go to your App Runner service
2. Copy the **Service URL** (looks like: `https://xxxxx.us-east-1.awsapprunner.com`)
3. **Save this URL** - you'll need it next!

---

## Step 3: Update Frontend to Use Backend

### 3.1 Add Backend URL to Amplify

1. Go to AWS Amplify Console: https://console.aws.amazon.com/amplify
2. Select your `askeuno` app
3. Go to **"App settings"** → **"Environment variables"**
4. Click **"Manage variables"**
5. Add new variable:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://your-apprunner-url.awsapprunner.com` (paste the URL from Step 2)
6. Click **"Save"**

### 3.2 Redeploy Frontend

1. In Amplify Console, go to **"Deployments"**
2. Click **"Redeploy this version"** on the latest deployment
3. Wait for deployment to complete (~5 minutes)

---

## Step 4: Test Account Creation

1. Visit your Amplify URL: `https://main.d2zwu04d248eu8.amplifyapp.com`
2. Try creating an account
3. It should work now! 🎉

---

## Step 5: Configure Custom Domain (Optional)

### 5.1 Add Domain to App Runner

1. In App Runner service → **"Custom domains"**
2. Click **"Add domain"**
3. Enter: `api.askeuno.com` (or `backend.askeuno.com`)
4. Follow DNS setup instructions

### 5.2 Update Frontend

Update `VITE_API_URL` in Amplify to use your custom domain:
- `VITE_API_URL` = `https://api.askeuno.com`

---

## ✅ Success Checklist

- [ ] App Runner service created and deployed
- [ ] Backend URL copied
- [ ] `VITE_API_URL` added to Amplify
- [ ] Frontend redeployed
- [ ] Account creation works
- [ ] Login works
- [ ] File upload works

---

## 🚀 What Happens Next?

**Auto-Scaling:**
- App Runner automatically scales up when traffic increases
- Scales down when traffic decreases
- No manual intervention needed

**Monitoring:**
- App Runner provides built-in metrics
- View logs in CloudWatch
- Set up alerts for errors

**Cost:**
- Pay per request/hour
- Very cost-effective for growing SaaS
- Scales with your business

---

## 🆘 Troubleshooting

### "Build failed"
- Check build logs in App Runner
- Verify `npm ci --include=dev` works locally
- Check that all dependencies are in `package.json`

### "Service won't start"
- Check start command: `NODE_ENV=production node dist/index.js`
- Verify `dist/index.js` exists after build
- Check environment variables are set correctly

### "API calls still failing"
- Verify `VITE_API_URL` is set in Amplify
- Check browser console for errors
- Verify backend URL is accessible (try `/health` endpoint)

---

**Ready? Let's deploy your backend!** 🚀
