# AWS S3 Manual Setup Guide

## Step-by-Step: Create S3 Bucket and IAM User

Since AWS CLI is not installed, we'll do this through the AWS Console (web interface).

---

## Part 1: Create S3 Bucket (5 minutes)

### Step 1: Go to S3 Console
1. Go to: https://console.aws.amazon.com/s3/
2. Sign in with your AWS account
3. Click **"Create bucket"** button (orange button, top right)

### Step 2: Configure Bucket
1. **Bucket name**: `askeuno-uploads`
   - Must be globally unique (if taken, try `askeuno-uploads-[your-name]`)
   
2. **AWS Region**: `US East (N. Virginia) us-east-1`
   - Same region as your Neon database (good for performance)

3. **Object Ownership**: Leave default (ACLs disabled)

4. **Block Public Access settings**: 
   - **Uncheck** "Block all public access"
   - We'll use private buckets with signed URLs (more secure)
   - Click "I acknowledge that the current settings might result in this bucket and objects becoming public"
   
5. **Bucket Versioning**: 
   - **Enable** (recommended for production)
   
6. **Default encryption**: 
   - Leave default (SSE-S3 is fine)

7. Click **"Create bucket"** at bottom

✅ **Bucket created!**

---

## Part 2: Configure CORS (2 minutes)

### Step 1: Select Your Bucket
1. Click on the bucket name: `askeuno-uploads`

### Step 2: Configure CORS
1. Click **"Permissions"** tab
2. Scroll down to **"Cross-origin resource sharing (CORS)"**
3. Click **"Edit"**
4. Paste this configuration:

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

5. Click **"Save changes"**

✅ **CORS configured!**

---

## Part 3: Create IAM User for S3 Access (5 minutes)

### Step 1: Go to IAM Console
1. Go to: https://console.aws.amazon.com/iam/
2. Click **"Users"** in left sidebar
3. Click **"Create user"** button

### Step 2: Set User Details
1. **User name**: `askeuno-s3-user`
2. Click **"Next"**

### Step 3: Set Permissions
1. Select **"Attach policies directly"**
2. Search for: `AmazonS3FullAccess`
3. **Check the box** next to `AmazonS3FullAccess`
4. Click **"Next"**

### Step 4: Review and Create
1. Review the settings
2. Click **"Create user"**

✅ **User created!**

---

## Part 4: Create Access Keys (3 minutes)

### Step 1: Open User
1. Click on the user: `askeuno-s3-user`
2. Click **"Security credentials"** tab
3. Scroll to **"Access keys"** section

### Step 2: Create Access Key
1. Click **"Create access key"**
2. Select **"Application running outside AWS"**
3. Click **"Next"**
4. (Optional) Add description: "Ask Euno production file storage"
5. Click **"Create access key"**

### Step 3: Save Credentials
**⚠️ IMPORTANT: Save these NOW - you won't see them again!**

You'll see:
- **Access key ID**: `AKIA...` (starts with AKIA)
- **Secret access key**: `...` (long string)

**Copy both of these** - you'll need them for AWS Amplify!

✅ **Access keys created!**

---

## Part 5: Save Your Credentials

Create a file to save your credentials (don't commit to git!):

```bash
# Create credentials file
cat > s3-credentials.txt << EOF
# AWS S3 Credentials for Ask Euno Production
# Generated: $(date)

AWS_ACCESS_KEY_ID=[paste your access key ID here]
AWS_SECRET_ACCESS_KEY=[paste your secret access key here]
AWS_REGION=us-east-1
AWS_S3_BUCKET=askeuno-uploads
EOF
```

Or manually create `s3-credentials.txt` with:
```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=askeuno-uploads
```

---

## Verification Checklist

After completing all steps:

- [ ] S3 bucket `askeuno-uploads` created
- [ ] CORS configured
- [ ] IAM user `askeuno-s3-user` created
- [ ] Access keys created and saved
- [ ] Credentials saved to `s3-credentials.txt`

---

## Next Steps

Once you have your AWS credentials:

1. **Add to AWS Amplify** (Step 4):
   - `AWS_ACCESS_KEY_ID` = your access key ID
   - `AWS_SECRET_ACCESS_KEY` = your secret access key
   - `AWS_REGION` = `us-east-1`
   - `AWS_S3_BUCKET` = `askeuno-uploads`
   - `STORAGE_MODE` = `s3`

2. **Test in production** after deployment

---

## Troubleshooting

### "Bucket name already taken"
- Try: `askeuno-uploads-[your-name]` or `askeuno-uploads-[random-number]`

### "Can't find IAM"
- Make sure you're logged into AWS Console
- IAM is in the main AWS services menu

### "Access key not showing"
- Make sure you copied it immediately after creation
- If lost, delete the key and create a new one

---

**Last Updated**: January 31, 2026
