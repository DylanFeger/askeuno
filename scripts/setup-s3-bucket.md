# S3 Bucket Setup for Euno

## Overview
Your AWS user account has limited permissions and cannot create S3 buckets directly. This is a security best practice. You'll need to create the bucket using an AWS admin account or the AWS Console.

## Required Bucket Configuration

### Bucket Name
```
euno-user-uploads
```

### Region
```
us-east-2
```

### Bucket Policy
The bucket needs the following policy to allow the euno-admin user to upload, download, and delete files:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "EunoAppAccess",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::800097198013:user/euno-admin"
            },
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::euno-user-uploads",
                "arn:aws:s3:::euno-user-uploads/*"
            ]
        }
    ]
}
```

## How to Create the Bucket

### Option 1: AWS Console
1. Go to [AWS S3 Console](https://s3.console.aws.amazon.com/)
2. Click "Create bucket"
3. Enter bucket name: `euno-user-uploads`
4. Select region: `US East (Ohio) us-east-2`
5. Keep default settings for now
6. Click "Create bucket"
7. Go to the bucket → Permissions → Bucket Policy
8. Paste the policy above and save

### Option 2: AWS CLI (if you have admin access)
```bash
# Create the bucket
aws s3 mb s3://euno-user-uploads --region us-east-2

# Apply the bucket policy
aws s3api put-bucket-policy --bucket euno-user-uploads --policy file://bucket-policy.json
```

## Testing the Setup
Once the bucket is created, you can test it by running:

```bash
cd server
node -e "
const AWS = require('@aws-sdk/client-s3');
const s3 = new AWS.S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function testS3() {
  try {
    const putCommand = new AWS.PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: 'test-connection.txt',
      Body: 'Euno S3 test - ' + new Date().toISOString(),
      ContentType: 'text/plain'
    });
    
    await s3.send(putCommand);
    console.log('✅ S3 upload successful!');
    
    const deleteCommand = new AWS.DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: 'test-connection.txt'
    });
    
    await s3.send(deleteCommand);
    console.log('✅ S3 is fully configured and working!');
  } catch (error) {
    console.error('❌ S3 error:', error.message);
  }
}

testS3();
"
```

## What This Enables
Once the S3 bucket is set up, Euno users will be able to:
- Upload CSV, Excel, and JSON files up to 500MB
- Files will be securely stored with encryption
- Each business gets isolated storage (business-{userId}/ folders)
- AI can analyze uploaded files for insights
- Files can be downloaded and managed through the interface

## Security Features
- All uploads are encrypted at rest (AES256)
- Each user's files are isolated in separate folders
- Access is restricted to the euno-admin user only
- No public access to any files