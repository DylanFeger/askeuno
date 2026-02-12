# 🔗 Connect Your Code to GitHub

**Goal**: Get your Ask Euno code on GitHub so AWS Amplify can deploy it.

---

## Step 1: Create a GitHub Repository

1. **Go to GitHub**: https://github.com
2. **Sign in** (or create account if needed)
3. **Click the "+" icon** (top right) → **"New repository"**
4. **Repository settings**:
   - **Name**: `askeuno`
   - **Description**: `AI-powered data analytics platform for small businesses`
   - **Visibility**: 
     - ✅ **Private** (recommended - contains sensitive configs)
     - Or **Public** (if you want it open source)
   - **DO NOT** check "Initialize with README" (we already have files)
   - **DO NOT** add .gitignore or license (we already have them)
5. **Click "Create repository"**

✅ **You'll see a page with setup instructions - DON'T follow them yet!**

---

## Step 2: Initialize Git in Your Local Project

Open your terminal and run these commands:

```bash
# Navigate to your project
# Note: This is your local folder name - it doesn't need to match the GitHub repo name "askeuno"
cd /Users/dylanfeger/Downloads/AskEunoViaReplit

# Initialize git (if not already done)
git init

# Add all files
git add .

# Create your first commit
git commit -m "Initial commit: Production-ready Ask Euno platform"
```

---

## Step 3: Connect to GitHub

**Copy the repository URL** from GitHub (looks like: `https://github.com/yourusername/askeuno.git`)

Then run:

```bash
# Add GitHub as remote (replace YOUR_USERNAME with your actual GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/askeuno.git

# Verify it's connected
git remote -v

# Push your code
git branch -M main
git push -u origin main
```

**Note**: GitHub will ask for your username and password/token. If you have 2FA enabled, you'll need a **Personal Access Token** instead of a password.

---

## Step 4: Create GitHub Personal Access Token (if needed)

If GitHub asks for authentication:

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. **Settings**:
   - **Note**: `AWS Amplify Deployment`
   - **Expiration**: `90 days` (or your preference)
   - **Scopes**: Check ✅ `repo` (full control of private repositories)
4. Click **"Generate token"**
5. **COPY THE TOKEN** (you won't see it again!)
6. Use this token as your password when pushing

---

## Step 5: Verify Everything is Pushed

1. **Refresh your GitHub repository page**
2. **You should see all your files** (client/, server/, docs/, etc.)
3. **Check that sensitive files are NOT there**:
   - ✅ `.env` should NOT be visible
   - ✅ `s3-credentials.txt` should NOT be visible
   - ✅ `.env.production.template` SHOULD be visible (it's a template)

---

## ✅ Success Checklist

- [ ] GitHub repository created
- [ ] Git initialized locally
- [ ] All files committed
- [ ] Remote added and verified
- [ ] Code pushed to GitHub
- [ ] Files visible on GitHub
- [ ] Sensitive files NOT visible (checked .gitignore)

---

## 🚀 Next Step

Once your code is on GitHub, you can:
1. **Go back to AWS Amplify**
2. **Connect your GitHub repository**
3. **Deploy!**

---

## 🆘 Troubleshooting

### "Repository not found"
- Check the repository URL is correct
- Make sure you're using HTTPS (not SSH)
- Verify the repository name matches exactly

### "Authentication failed"
- Use a Personal Access Token instead of password
- Make sure token has `repo` scope

### "Permission denied"
- Check your GitHub username is correct
- Verify you have access to the repository

### "Files not showing on GitHub"
- Make sure you ran `git add .` and `git commit`
- Check `.gitignore` isn't excluding important files
- Verify `git push` completed successfully

---

**Ready? Let's get your code on GitHub!** 🚀
