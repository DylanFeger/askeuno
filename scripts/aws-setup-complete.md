# Complete AWS Setup for Euno

## Current Status
✅ AWS credentials configured
❌ S3 bucket needs to be created by admin
❌ SES needs additional permissions

## AWS User Permissions Analysis
Your current AWS user `euno-admin` has limited permissions. This is good security practice, but requires additional setup.

## 1. S3 Setup Required

### Create S3 Bucket
```bash
# Using AWS CLI with admin account
aws s3 mb s3://euno-user-uploads --region us-east-2

# Or create via AWS Console at https://s3.console.aws.amazon.com/
```

### Required S3 Bucket Policy
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

## 2. SES (Email Service) Setup Required

### Add SES Permissions to euno-admin User
Add this policy to the euno-admin user in IAM:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ses:SendEmail",
                "ses:SendRawEmail",
                "ses:GetSendQuota",
                "ses:GetSendStatistics",
                "ses:ListVerifiedEmailAddresses",
                "ses:VerifyEmailIdentity"
            ],
            "Resource": "*"
        }
    ]
}
```

### Verify Email Addresses
Before sending emails, you need to verify the sender addresses:

```bash
# Via AWS CLI
aws sesv2 put-email-identity --email-identity support@euno.com --region us-east-2

# Or via AWS Console at https://us-east-2.console.aws.amazon.com/sesv2/
```

## 3. Required IAM Policy for euno-admin User

Complete IAM policy that should be attached to the euno-admin user:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
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
        },
        {
            "Effect": "Allow",
            "Action": [
                "ses:SendEmail",
                "ses:SendRawEmail",
                "ses:GetSendQuota",
                "ses:GetSendStatistics",
                "ses:ListVerifiedEmailAddresses",
                "ses:VerifyEmailIdentity"
            ],
            "Resource": "*"
        }
    ]
}
```

## 4. Testing After Setup

### Test S3 Connection
```bash
npm run test:s3
```

### Test SES Connection
```bash
npm run test:ses
```

## 5. What This Enables

### File Upload Features
- Upload CSV, Excel, JSON files up to 500MB
- Secure encrypted storage with user isolation
- AI-powered analysis of uploaded data
- File management and download capabilities

### Email Features
- Welcome emails for new users
- Password reset emails
- Weekly data reports
- System notifications

## 6. Security Features

### S3 Security
- AES256 encryption at rest
- User-isolated folders (business-{userId}/)
- No public access
- Restricted to euno-admin user only

### SES Security
- Rate limiting (current: check your SES console)
- Verified sender addresses only
- Bounce and complaint handling
- SPF/DKIM authentication

## Next Steps
1. Create the S3 bucket with the provided policy
2. Add SES permissions to the euno-admin user
3. Verify the support@euno.com email address
4. Test the connections using the provided scripts

Once these steps are complete, Euno will have full file upload and email functionality!