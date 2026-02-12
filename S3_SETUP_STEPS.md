# Step 3: AWS S3 Setup - Step-by-Step Guide

**Time**: ~15 minutes  
**What you'll create**: S3 bucket and AWS credentials for file storage

---

## ✅ What You'll Get

After completing these steps, you'll have:
- S3 bucket: `askeuno-uploads`
- AWS Access Key ID
- AWS Secret Access Key
- These will be added to AWS Amplify in Step 4

---

## Part 1: Create S3 Bucket (5 minutes)

### Step 1.1: Open AWS S3 Console
1. Go to: **https://console.aws.amazon.com/s3/**
2. Sign in with your AWS account
3. You should see the S3 dashboard

### Step 1.2: Create Bucket
1. Click the orange **"Create bucket"** button (top right)
2. Fill in the form:

   **Bucket name**: 
   ```
   askeuno-uploads
   ```
   - If this name is taken, try: `askeuno-uploads-[your-name]` or add numbers
   
   **AWS Region**: 
   ```
   US East (N. Virginia) us-east-1
   ```
   - Select from dropdown
   - Same region as your Neon database (good for performance)

### Step 1.3: Configure Settings
1. **Object Ownership**: Leave default (ACLs disabled)

2. **Block Public Access settings**: 
   - **Uncheck** the box "Block all public access"
   - A warning will appear
   - Check the box: "I acknowledge that the current settings might result in this bucket and objects becoming public"
   - (Don't worry - we'll use private access with signed URLs)

3. **Bucket Versioning**: 
   - Select **"Enable"**
   - (Helps recover deleted files)

4. **Default encryption**: 
   - Leave default (SSE-S3 is fine)

5. Scroll down and click **"Create bucket"**

✅ **Bucket created!** You should see a success message.

---

## Part 2: Configure CORS (2 minutes)

### Step 2.1: Open Your Bucket
1. Click on the bucket name: **`askeuno-uploads`**
2. You're now inside the bucket

### Step 2.2: Configure CORS
1. Click the **"Permissions"** tab (top of page)
2. Scroll down to **"Cross-origin resource sharing (CORS)"**
3. Click **"Edit"**
4. Delete any existing content in the editor
5. Paste this exactly:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedOrigins": [
            "https://askeuno.com",
            "http://localhost:5000"
        ],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
    }
]
```

6. Click **"Save changes"** at bottom

✅ **CORS configured!**

---

## Part 3: Create IAM User (5 minutes)

### Step 3.1: Open IAM Console
1. Go to: **https://console.aws.amazon.com/iam/**
2. Click **"Users"** in the left sidebar
3. Click **"Create user"** button (top right)

### Step 3.2: Set User Name
1. **User name**: 
   ```
   askeuno-s3-user
   ```
2. Click **"Next"**

### Step 3.3: Set Permissions
1. Select **"Attach policies directly"** (should be selected by default)
2. In the search box, type: `S3`
3. Find **"AmazonS3FullAccess"** in the list
4. **Check the box** next to `AmazonS3FullAccess`
5. Click **"Next"**

### Step 3.4: Review and Create
1. Review the settings:
   - User name: `askeuno-s3-user`
   - Permission: `AmazonS3FullAccess`
2. Click **"Create user"**

✅ **User created!** You should see a success message.

---

## Part 4: Create Access Keys (3 minutes)

### Step 4.1: Open User
1. Click on the user name: **`askeuno-s3-user`**
2. Click the **"Security credentials"** tab
3. Scroll down to **"Access keys"** section

### Step 4.2: Create Access Key
1. Click **"Create access key"** button
2. Select **"Application running outside AWS"**
3. Click **"Next"**
4. (Optional) Description: `Ask Euno production file storage`
5. Click **"Create access key"**

### Step 4.3: Save Credentials ⚠️ IMPORTANT!

**⚠️ COPY THESE NOW - You won't see them again!**

You'll see two values:

1. **Access key ID**: 
   - Looks like: `AKIAIOSFODNN7EXAMPLE`
   - Starts with `AKIA`
   - **Copy this**

2. **Secret access key**: 
   - Long string of random characters
   - **Copy this**

3. Click **"Done"** (after copying both)

✅ **Access keys created!**

---

## Part 5: Save Your Credentials

Create a file to save these (don't commit to git!):

1. Open a text editor
2. Create file: `s3-credentials.txt` in your project folder
3. Paste this template and fill in your values:

```
# AWS S3 Credentials for Ask Euno Production
# Generated: [today's date]

AWS_ACCESS_KEY_ID=[paste your Access Key ID here]
AWS_SECRET_ACCESS_KEY=[paste your Secret Access Key here]
AWS_REGION=us-east-1
AWS_S3_BUCKET=askeuno-uploads
```

**Example** (with fake values):
```
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
AWS_S3_BUCKET=askeuno-uploads
```

4. Save the file

✅ **Credentials saved!**

---

## ✅ Verification Checklist

Before moving to Step 4, verify:

- [ ] S3 bucket `askeuno-uploads` exists
- [ ] CORS is configured (can see the JSON in Permissions tab)
- [ ] IAM user `askeuno-s3-user` exists
- [ ] Access keys created and saved
- [ ] Credentials saved to `s3-credentials.txt`

---

## 🎯 What You Have Now

After completing these steps, you should have:

1. **S3 Bucket**: `askeuno-uploads`
2. **AWS Access Key ID**: `AKIA...` (starts with AKIA)
3. **AWS Secret Access Key**: `...` (long string)
4. **Region**: `us-east-1`
5. **Bucket Name**: `askeuno-uploads`

---

## ➡️ Next Step

Once you have these credentials, tell me and we'll move to **Step 4: Configure AWS Amplify** where we'll add all these values to your production environment.

---

## 🆘 Troubleshooting

### "Bucket name already taken"
- Try: `askeuno-uploads-[your-name]` 
- Or: `askeuno-uploads-12345`
- Bucket names must be globally unique

### "Can't find IAM"
- Make sure you're logged into AWS Console
- IAM is in the main AWS services menu (top left)
- Or go directly to: https://console.aws.amazon.com/iam/

### "Lost my access keys"
- Go back to IAM → Users → `askeuno-s3-user`
- Security credentials tab
- Delete the old key
- Create a new access key

### "CORS not saving"
- Make sure JSON is valid (check for commas, brackets)
- Try copying the JSON again
- Make sure you clicked "Save changes"

---

**Ready? Start with Part 1!** 🚀
