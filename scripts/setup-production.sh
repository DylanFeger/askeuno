#!/bin/bash

# ===========================================
# Ask Euno - Production Setup Script
# ===========================================
# Interactive script to set up production environment
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
echo "║     Ask Euno - Production Environment Setup            ║"
echo "║     Goal: Get askeuno.com live and ready for users     ║"
echo "╚════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command -v openssl &> /dev/null; then
    echo -e "${RED}✗ openssl not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ openssl found${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v) found${NC}"

echo ""
echo -e "${CYAN}This script will help you generate production secrets and${NC}"
echo -e "${CYAN}create a production environment configuration.${NC}"
echo ""

# Generate production secrets
echo -e "${BLUE}Generating production secrets...${NC}"
echo ""

ENCRYPTION_KEY=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -base64 32 | tr -d '\n' | tr '/' '_')

echo -e "${GREEN}✓ Generated ENCRYPTION_KEY${NC}"
echo -e "${GREEN}✓ Generated SESSION_SECRET${NC}"
echo ""

# Create production env template
echo -e "${BLUE}Creating production environment template...${NC}"

cat > .env.production.template << EOF
# ===========================================
# Ask Euno - Production Environment
# ===========================================
# Copy these values to AWS Amplify Console
# App Settings → Environment Variables
# ===========================================

# ===========================================
# CORE CONFIGURATION
# ===========================================
NODE_ENV=production
PORT=5000

# ===========================================
# DATABASE (Production PostgreSQL)
# ===========================================
# Get from: Neon (neon.tech), Supabase, or AWS RDS
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# ===========================================
# SECURITY (Generated Below)
# ===========================================
ENCRYPTION_KEY=${ENCRYPTION_KEY}
SESSION_SECRET=${SESSION_SECRET}

# ===========================================
# AI / OPENAI
# ===========================================
OPENAI_API_KEY=sk-your-production-openai-key

# ===========================================
# FILE STORAGE (AWS S3)
# ===========================================
STORAGE_MODE=s3
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=askeuno-uploads

# ===========================================
# LIGHTSPEED R-SERIES
# ===========================================
LS_CLIENT_ID=b16a2df414bee9070b564b7cd7a46326024d6078f4b130cbbd329abed254a398
LS_CLIENT_SECRET=fc0b95186042228d2ea9e7608723a58bdd176c1a2e9a76bca3f6f4c6c340fe0e
LS_REDIRECT_URI=https://askeuno.com/api/oauth/callback/lightspeed

# ===========================================
# APPLICATION URLs
# ===========================================
APP_URL=https://askeuno.com
FRONTEND_URL=https://askeuno.com

# ===========================================
# ERROR MONITORING (Sentry)
# ===========================================
# Get from: https://sentry.io
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# ===========================================
# STRIPE (If using payments)
# ===========================================
# STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
# STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
# STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# ===========================================
# EMAIL (SendGrid - Optional)
# ===========================================
# SENDGRID_API_KEY=SG.your_sendgrid_api_key
# SENDGRID_FROM_EMAIL=noreply@askeuno.com
EOF

echo -e "${GREEN}✓ Created .env.production.template${NC}"
echo ""

# Display next steps
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}   Next Steps                            ${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo -e "${CYAN}1. Production Database:${NC}"
echo "   - Set up PostgreSQL at: https://neon.tech (recommended)"
echo "   - Or: https://supabase.com"
echo "   - Copy DATABASE_URL to template above"
echo ""
echo -e "${CYAN}2. AWS S3 Bucket:${NC}"
echo "   - Create bucket: askeuno-uploads"
echo "   - Create IAM user with S3 access"
echo "   - Copy credentials to template above"
echo ""
echo -e "${CYAN}3. Update Template:${NC}"
echo "   - Edit .env.production.template"
echo "   - Fill in: DATABASE_URL, AWS credentials, OPENAI_API_KEY"
echo ""
echo -e "${CYAN}4. Add to AWS Amplify:${NC}"
echo "   - Go to: AWS Amplify Console"
echo "   - App Settings → Environment Variables"
echo "   - Copy all variables from .env.production.template"
echo ""
echo -e "${CYAN}5. Update Lightspeed:${NC}"
echo "   - Go to: https://developers.lightspeedhq.com/"
echo "   - Edit your R-Series app"
echo "   - Add redirect URI: https://askeuno.com/api/oauth/callback/lightspeed"
echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}   Generated Secrets (SAVE THESE!)       ${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "${YELLOW}ENCRYPTION_KEY:${NC}"
echo "${ENCRYPTION_KEY}"
echo ""
echo -e "${YELLOW}SESSION_SECRET:${NC}"
echo "${SESSION_SECRET}"
echo ""
echo -e "${RED}⚠️  Save these secrets securely!${NC}"
echo -e "${RED}⚠️  They are also saved in .env.production.template${NC}"
echo ""
echo -e "${BLUE}See docs/AWS_AMPLIFY_PRODUCTION_SETUP.md for detailed steps${NC}"
echo ""
