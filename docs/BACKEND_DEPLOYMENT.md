# Backend Deployment Guide for Ask Euno

## Problem
AWS Amplify Hosting only serves static files. Your Express.js backend needs to run separately to handle API requests.

## Solution: Deploy Backend to AWS App Runner

AWS App Runner is the easiest way to deploy a Node.js backend on AWS - it's fully managed and auto-scales.

### Step 1: Create App Runner Service

1. Go to: https://console.aws.amazon.com/apprunner
2. Click "Create service"
3. Choose "Source code repository"
4. Connect your GitHub repository: `DylanFeger/askeuno`
5. Select branch: `main`

### Step 2: Configure Build

**Build settings:**
- Build command: `npm ci --include=dev && npm run build`
- Start command: `NODE_ENV=production node dist/index.js`
- Port: `5000`

### Step 3: Add Environment Variables

Add all your environment variables (same ones from Amplify):
- `NODE_ENV=production`
- `PORT=5000`
- `DATABASE_URL=...`
- `ENCRYPTION_KEY=...`
- `SESSION_SECRET=...`
- `S3_ACCESS_KEY_ID=...`
- `S3_SECRET_ACCESS_KEY=...`
- `S3_REGION=us-east-1`
- `S3_BUCKET=askeuno-uploads`
- `LS_CLIENT_ID=...`
- `LS_CLIENT_SECRET=...`
- `LS_REDIRECT_URI=https://askeuno.com/api/oauth/callback/lightspeed`
- `APP_URL=https://askeuno.com`
- `FRONTEND_URL=https://askeuno.com`
- `OPENAI_API_KEY=...` (when you have it)

### Step 4: Get Backend URL

After deployment, App Runner will give you a URL like:
`https://xxxxx.us-east-1.awsapprunner.com`

### Step 5: Update Frontend to Use Backend URL

We need to configure the frontend to call this backend URL instead of relative paths.

**Option A: Use environment variable (recommended)**

Add to Amplify environment variables:
- `VITE_API_URL=https://your-apprunner-url.awsapprunner.com`

Then update the frontend code to use this.

**Option B: Use Amplify rewrites**

Configure Amplify to proxy `/api/*` requests to your App Runner backend.

---

## Alternative: Quick EC2 Setup

If you prefer more control:

1. Launch EC2 instance (t3.small or t3.medium)
2. SSH into it
3. Install Node.js 20
4. Clone your repo
5. Set environment variables
6. Run `npm run build && npm start`
7. Use PM2 to keep it running

---

## Next Steps

1. Deploy backend to App Runner (or EC2)
2. Get the backend URL
3. Configure frontend to use that URL
4. Test account creation

Let me know which option you prefer and I'll guide you through it!
