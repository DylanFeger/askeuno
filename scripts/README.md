# Euno AWS Setup Scripts

This directory contains scripts to help set up and test AWS integration for Euno.

## Files

### Setup Documentation
- `aws-setup-complete.md` - Complete AWS setup guide with IAM policies
- `setup-s3-bucket.md` - S3 bucket creation guide with security policies

### Test Scripts
- `test-aws.js` - Test both S3 and SES integration
- `test-s3.js` - Test S3 file storage functionality
- `test-ses.js` - Test SES email service functionality

## Quick Testing

To test AWS integration after setup:

```bash
# Test everything
node scripts/test-aws.js

# Test S3 only
node scripts/test-s3.js

# Test SES only
node scripts/test-ses.js
```

## Current Status

✅ AWS credentials configured
❌ S3 bucket "euno-user-uploads" needs to be created
❌ SES permissions need to be added to euno-admin user

## Next Steps

1. Create S3 bucket using `setup-s3-bucket.md` guide
2. Add SES permissions using `aws-setup-complete.md` guide
3. Verify email addresses in SES console
4. Run `node scripts/test-aws.js` to verify everything works

Once complete, Euno will have:
- File upload functionality (up to 500MB)
- Secure encrypted storage with user isolation
- Email notifications and password reset capabilities
- AI-powered analysis of uploaded files