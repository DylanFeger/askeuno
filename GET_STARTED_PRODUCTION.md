# 🚀 Get Started: Production Setup for Ask Euno

**Goal**: Get askeuno.com live and ready for businesses to use

---

## Quick Start (30 minutes)

### Step 1: Generate Production Secrets

```bash
./scripts/setup-production.sh
```

This will:
- ✅ Generate secure `ENCRYPTION_KEY` and `SESSION_SECRET`
- ✅ Create `.env.production.template` with all variables
- ✅ Show you exactly what to do next

**Time**: 2 minutes

---

### Step 2: Set Up Production Database

**Option A: Neon (Recommended - Easiest)**
1. Go to: https://neon.tech
2. Sign up (free tier available)
3. Create project: "Ask Euno Production"
4. Copy connection string
5. Add to `.env.production.template` as `DATABASE_URL`

**Option B: Supabase**
1. Go to: https://supabase.com
2. Create project
3. Get connection string from Settings → Database
4. Add to template

**Time**: 10 minutes

---

### Step 3: Set Up AWS S3 for File Storage

**Option A: Automated Script**
```bash
# Requires AWS CLI configured
./scripts/create-s3-bucket.sh
```

**Option B: Manual Setup**
1. Go to: https://console.aws.amazon.com/s3/
2. Create bucket: `askeuno-uploads`
3. Configure CORS (see docs/AWS_AMPLIFY_PRODUCTION_SETUP.md)
4. Create IAM user with S3 access
5. Copy credentials to template

**Time**: 15 minutes

---

### Step 4: Configure AWS Amplify

1. **Go to**: https://console.aws.amazon.com/amplify
2. **Connect Repository** (if not already connected)
3. **Add Environment Variables**:
   - Open `.env.production.template`
   - Copy ALL variables to Amplify Console
   - App Settings → Environment Variables → Manage variables

**Time**: 10 minutes

---

### Step 5: Update Lightspeed Redirect URI

1. Go to: https://developers.lightspeedhq.com/
2. Edit your R-Series application
3. Add redirect URI: `https://askeuno.com/api/oauth/callback/lightspeed`
4. Save

**Time**: 2 minutes

---

### Step 6: Deploy!

```bash
git add .
git commit -m "Production ready"
git push origin main
```

AWS Amplify will automatically:
- ✅ Build your app
- ✅ Deploy to production
- ✅ Make it live at askeuno.com

**Time**: 5 minutes (build time)

---

## Verification Checklist

After deployment, verify:

- [ ] Site loads at https://askeuno.com
- [ ] SSL certificate active (green lock)
- [ ] Can sign up / log in
- [ ] File upload works
- [ ] Lightspeed connection works
- [ ] AI chat works
- [ ] No errors in browser console
- [ ] Health check works: https://askeuno.com/api/health

---

## What Each Step Does

| Step | What It Does | Why It's Needed |
|------|--------------|-----------------|
| **Secrets** | Generates encryption keys | Security - encrypts sensitive data |
| **Database** | Production PostgreSQL | Stores all user data, connections, chats |
| **S3** | File storage | Stores uploaded files (CSV, Excel, etc.) |
| **Amplify** | Hosting & deployment | Makes your app accessible on the web |
| **Lightspeed** | OAuth redirect | Allows businesses to connect their Lightspeed accounts |
| **Deploy** | Pushes code live | Makes changes available to users |

---

## Troubleshooting

### Build Fails
- Check build logs in Amplify Console
- Test locally: `npm run build`
- Fix errors and push again

### Environment Variables Not Working
- Verify variables in Amplify Console
- Check variable names match exactly
- Restart build after adding variables

### Database Connection Fails
- Verify `DATABASE_URL` is correct
- Check database allows connections from AWS
- Test connection from local machine

---

## Next Steps After Launch

1. **Monitor**: Set up Sentry for error tracking
2. **Backups**: Configure automated database backups
3. **Uptime**: Set up UptimeRobot monitoring
4. **Analytics**: Add user analytics (PostHog, etc.)
5. **Support**: Set up customer support system

---

## Need Help?

- **Detailed Guide**: `docs/AWS_AMPLIFY_PRODUCTION_SETUP.md`
- **Checklist**: `PRODUCTION_READINESS_CHECKLIST.md`
- **Troubleshooting**: Check build logs in Amplify Console

---

**Let's get Ask Euno live! 🚀**
