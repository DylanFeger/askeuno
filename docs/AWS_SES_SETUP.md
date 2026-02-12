# AWS SES (Simple Email Service) Setup Guide for Ask Euno

This guide will help you set up AWS SES to send emails from Ask Euno, including welcome emails, password resets, and weekly reports.

## Prerequisites

You'll need:
- An AWS account (sign up at aws.amazon.com if you don't have one)
- A domain name or email address to send emails from

## Step 1: Create AWS Access Keys

1. **Sign in to AWS Console**
   - Go to https://console.aws.amazon.com
   - Sign in with your AWS account

2. **Navigate to IAM (Identity and Access Management)**
   - Search for "IAM" in the top search bar
   - Click on "IAM"

3. **Create a New User for SES**
   - Click "Users" in the left sidebar
   - Click "Create user"
   - Username: `askeuno-ses-user`
   - Click "Next"

4. **Set Permissions**
   - Select "Attach policies directly"
   - Search for and select: `AmazonSESFullAccess`
   - Click "Next" then "Create user"

5. **Create Access Keys**
   - Click on the user you just created (`acre-ses-user`)
   - Go to "Security credentials" tab
   - Under "Access keys", click "Create access key"
   - Select "Application running outside AWS"
   - Click "Next" then "Create access key"
   - **IMPORTANT**: Copy both the Access key ID and Secret access key immediately
   - They look like:
     - Access Key ID: `AKIAIOSFODNN7EXAMPLE`
     - Secret Access Key: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`

## Step 2: Verify Your Email Address or Domain

### Option A: Verify a Single Email Address (Quickest)

1. **Go to Amazon SES Console**
   - In AWS Console, search for "SES" and click "Amazon Simple Email Service"

2. **Select Your Region**
   - In the top-right corner, select a region (e.g., `US East (N. Virginia)`)
   - Remember this region - you'll need it for configuration

3. **Verify an Email Address**
   - In the left sidebar, click "Verified identities"
   - Click "Create identity"
   - Select "Email address"
   - Enter your email (e.g., `noreply@yourcompany.com`)
   - Click "Create identity"

4. **Confirm Verification**
   - Check your email inbox
   - Click the verification link from AWS
   - Your email is now verified!

### Option B: Verify an Entire Domain (Recommended for Production)

1. **Create Domain Identity**
   - In SES Console, click "Verified identities"
   - Click "Create identity"
   - Select "Domain"
   - Enter your domain (e.g., `yourcompany.com`)
   - Click "Create identity"

2. **Add DNS Records**
   - AWS will show you DNS records to add
   - Add these records to your domain's DNS settings
   - This verifies you own the domain

3. **Enable DKIM (Optional but Recommended)**
   - DKIM helps prevent email spoofing
   - Follow the AWS instructions to add DKIM records

## Step 3: Move Out of Sandbox Mode (Important!)

By default, AWS SES is in "sandbox mode" which limits you to:
- Sending emails only to verified addresses
- Maximum 200 emails per day
- Maximum 1 email per second

**To request production access:**

1. In SES Console, click "Account dashboard"
2. Look for "Sending statistics"
3. Click "Request production access"
4. Fill out the form:
   - Use case: "Transactional emails for SaaS application"
   - Website URL: Your Acre deployment URL
   - Describe: "Sending welcome emails, password resets, and weekly data reports to users"
5. Submit the request (usually approved within 24 hours)

## Step 4: Add Credentials to Replit

1. **In your Replit project**, click on "Secrets" (lock icon)

2. **Add the following secrets:**

   ```
   AWS_ACCESS_KEY_ID = AKIAIOSFODNN7EXAMPLE
   AWS_SECRET_ACCESS_KEY = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   AWS_REGION = us-east-1
   SES_FROM_EMAIL = noreply@yourcompany.com
   ```

   Replace with your actual values:
   - Use your actual access keys from Step 1
   - Use the region you selected in Step 2
   - Use the email you verified in Step 2

## Step 5: Test Your Setup

Once you've added all secrets, the application will automatically use AWS SES for:
- Welcome emails when users sign up
- Password reset emails
- Weekly activity reports
- Any other transactional emails

## Common Issues and Solutions

### "Email address not verified" Error
- Make sure the FROM email address is verified in SES
- Check you're using the correct AWS region

### "Sending rate exceeded" Error
- You're still in sandbox mode
- Request production access (Step 3)

### "Invalid credentials" Error
- Double-check your access keys
- Ensure the IAM user has SES permissions

### Emails Not Being Received
1. Check spam/junk folders
2. Verify the recipient email is also verified (if in sandbox mode)
3. Check SES Console for bounce/complaint notifications

## Email Templates in Ask Euno

Ask Euno uses AWS SES for:

1. **Welcome Emails** - Sent when users register
2. **Password Reset** - Sent when users request password reset
3. **Weekly Reports** - Automated reports with data insights
4. **Payment Notifications** - Subscription and payment updates

All email templates are professionally designed and mobile-responsive.

## Cost Considerations

AWS SES Pricing (as of 2024):
- First 62,000 emails per month: Free (when sent from EC2)
- After that: $0.10 per 1,000 emails
- No minimum fees or upfront commitments

For most small businesses, you'll stay within the free tier.

## Security Best Practices

1. **Use IAM Roles in Production**
   - Instead of access keys, use IAM roles when deploying to AWS

2. **Rotate Access Keys Regularly**
   - Change your access keys every 90 days

3. **Monitor Email Metrics**
   - Check bounce rates and complaints in SES Console
   - High rates can affect your sender reputation

4. **Use Configuration Sets**
   - Track email events (opens, clicks, bounces)
   - Set up SNS notifications for important events

## Next Steps

After setting up AWS SES:
1. Test sending a welcome email by creating a new user
2. Monitor the SES Console for delivery metrics
3. Set up email event tracking (optional)
4. Configure custom domain authentication (SPF, DKIM) for better deliverability

Need help? Check the AWS SES documentation at:
https://docs.aws.amazon.com/ses/latest/dg/Welcome.html