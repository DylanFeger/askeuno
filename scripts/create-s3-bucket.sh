#!/bin/bash

# ===========================================
# AWS S3 Bucket Setup Script
# ===========================================
# Creates S3 bucket and IAM user for Ask Euno production
# ===========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║     Ask Euno - AWS S3 Setup for Production            ║"
echo "╚════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}✗ AWS CLI not found${NC}"
    echo ""
    echo "Install AWS CLI:"
    echo "  macOS: brew install awscli"
    echo "  Or: https://aws.amazon.com/cli/"
    exit 1
fi

echo -e "${GREEN}✓ AWS CLI found${NC}"

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}✗ AWS credentials not configured${NC}"
    echo ""
    echo "Configure AWS credentials:"
    echo "  aws configure"
    echo ""
    echo "Or set environment variables:"
    echo "  export AWS_ACCESS_KEY_ID=your-key"
    echo "  export AWS_SECRET_ACCESS_KEY=your-secret"
    exit 1
fi

echo -e "${GREEN}✓ AWS credentials configured${NC}"
echo ""

# Get AWS account info
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=${AWS_REGION:-us-east-1}
BUCKET_NAME=${BUCKET_NAME:-askeuno-uploads}

echo -e "${CYAN}AWS Account:${NC} ${AWS_ACCOUNT}"
echo -e "${CYAN}Region:${NC} ${AWS_REGION}"
echo -e "${CYAN}Bucket Name:${NC} ${BUCKET_NAME}"
echo ""

read -p "Continue with these settings? [Y/n] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ ! -z $REPLY ]]; then
    exit 1
fi

# Create S3 bucket
echo ""
echo -e "${BLUE}Creating S3 bucket...${NC}"

if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    echo -e "${YELLOW}⚠ Bucket already exists: ${BUCKET_NAME}${NC}"
else
    if [ "$AWS_REGION" == "us-east-1" ]; then
        aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$AWS_REGION"
    else
        aws s3api create-bucket \
            --bucket "$BUCKET_NAME" \
            --region "$AWS_REGION" \
            --create-bucket-configuration LocationConstraint="$AWS_REGION"
    fi
    echo -e "${GREEN}✓ Bucket created: ${BUCKET_NAME}${NC}"
fi

# Configure bucket for private access
echo -e "${BLUE}Configuring bucket permissions...${NC}"

# Block public access (we'll use signed URLs)
aws s3api put-public-access-block \
    --bucket "$BUCKET_NAME" \
    --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo -e "${GREEN}✓ Public access blocked${NC}"

# Configure CORS
echo -e "${BLUE}Configuring CORS...${NC}"

cat > /tmp/cors.json << EOF
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
            "AllowedOrigins": ["https://askeuno.com", "http://localhost:5000"],
            "ExposeHeaders": ["ETag"],
            "MaxAgeSeconds": 3000
        }
    ]
}
EOF

aws s3api put-bucket-cors --bucket "$BUCKET_NAME" --cors-configuration file:///tmp/cors.json
rm /tmp/cors.json

echo -e "${GREEN}✓ CORS configured${NC}"

# Enable versioning (optional but recommended)
echo -e "${BLUE}Enabling versioning...${NC}"
aws s3api put-bucket-versioning \
    --bucket "$BUCKET_NAME" \
    --versioning-configuration Status=Enabled

echo -e "${GREEN}✓ Versioning enabled${NC}"

# Create IAM user for S3 access
echo ""
echo -e "${BLUE}Creating IAM user for S3 access...${NC}"

IAM_USER_NAME="askeuno-s3-user"

if aws iam get-user --user-name "$IAM_USER_NAME" &> /dev/null; then
    echo -e "${YELLOW}⚠ IAM user already exists: ${IAM_USER_NAME}${NC}"
    read -p "Create new access key? [y/N] " -n 1 -r
    echo
    CREATE_KEY=false
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        CREATE_KEY=true
    fi
else
    # Create user
    aws iam create-user --user-name "$IAM_USER_NAME"
    echo -e "${GREEN}✓ IAM user created: ${IAM_USER_NAME}${NC}"
    CREATE_KEY=true
fi

# Create access key
if [ "$CREATE_KEY" = true ]; then
    echo -e "${BLUE}Creating access key...${NC}"
    
    ACCESS_KEY_OUTPUT=$(aws iam create-access-key --user-name "$IAM_USER_NAME")
    ACCESS_KEY_ID=$(echo "$ACCESS_KEY_OUTPUT" | jq -r '.AccessKey.AccessKeyId')
    SECRET_ACCESS_KEY=$(echo "$ACCESS_KEY_OUTPUT" | jq -r '.AccessKey.SecretAccessKey')
    
    echo -e "${GREEN}✓ Access key created${NC}"
    echo ""
    echo -e "${RED}⚠️  SAVE THESE CREDENTIALS NOW - Secret key only shown once!${NC}"
    echo ""
    echo -e "${YELLOW}AWS_ACCESS_KEY_ID:${NC}"
    echo "${ACCESS_KEY_ID}"
    echo ""
    echo -e "${YELLOW}AWS_SECRET_ACCESS_KEY:${NC}"
    echo "${SECRET_ACCESS_KEY}"
    echo ""
    
    # Save to file
    cat > s3-credentials.txt << EOF
# AWS S3 Credentials for Ask Euno Production
# Generated: $(date)
# Bucket: ${BUCKET_NAME}
# Region: ${AWS_REGION}

AWS_ACCESS_KEY_ID=${ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${SECRET_ACCESS_KEY}
AWS_REGION=${AWS_REGION}
AWS_S3_BUCKET=${BUCKET_NAME}
EOF
    
    echo -e "${GREEN}✓ Credentials saved to: s3-credentials.txt${NC}"
    echo -e "${RED}⚠️  Keep this file secure and add to .gitignore!${NC}"
fi

# Attach S3 policy to user
echo -e "${BLUE}Attaching S3 access policy...${NC}"

cat > /tmp/s3-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::${BUCKET_NAME}",
                "arn:aws:s3:::${BUCKET_NAME}/*"
            ]
        }
    ]
}
EOF

POLICY_NAME="askeuno-s3-policy"
POLICY_ARN=$(aws iam create-policy \
    --policy-name "$POLICY_NAME" \
    --policy-document file:///tmp/s3-policy.json \
    --query 'Policy.Arn' --output text 2>/dev/null || \
    aws iam get-policy --policy-arn "arn:aws:iam::${AWS_ACCOUNT}:policy/${POLICY_NAME}" --query 'Policy.Arn' --output text)

aws iam attach-user-policy \
    --user-name "$IAM_USER_NAME" \
    --policy-arn "$POLICY_ARN"

rm /tmp/s3-policy.json

echo -e "${GREEN}✓ S3 access policy attached${NC}"

# Summary
echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}   S3 Setup Complete!                    ${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Bucket: ${BUCKET_NAME}"
echo "Region: ${AWS_REGION}"
echo "IAM User: ${IAM_USER_NAME}"
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo "1. Add credentials to AWS Amplify environment variables"
echo "2. Update .env.production.template with these values"
echo "3. Test file uploads in production"
echo ""
echo -e "${YELLOW}Credentials saved to: s3-credentials.txt${NC}"
echo ""
