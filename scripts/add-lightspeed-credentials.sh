#!/bin/bash

# ===========================================
# Add Lightspeed R-Series Credentials
# ===========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Adding Lightspeed R-Series credentials to .env...${NC}"
echo ""

# R-Series credentials
LS_CLIENT_ID="b16a2df414bee9070b564b7cd7a46326024d6078f4b130cbbd329abed254a398"
LS_CLIENT_SECRET="fc0b95186042228d2ea9e7608723a58bdd176c1a2e9a76bca3f6f4c6c340fe0e"
LS_REDIRECT_URI="http://localhost:5000/api/oauth/callback/lightspeed"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env from env.example...${NC}"
    cp env.example .env
fi

# Update or add LS_CLIENT_ID
if grep -q "^LS_CLIENT_ID=" .env; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^LS_CLIENT_ID=.*|LS_CLIENT_ID=$LS_CLIENT_ID|" .env
    else
        sed -i "s|^LS_CLIENT_ID=.*|LS_CLIENT_ID=$LS_CLIENT_ID|" .env
    fi
    echo -e "${GREEN}✓ Updated LS_CLIENT_ID${NC}"
else
    echo "" >> .env
    echo "# Lightspeed R-Series Credentials" >> .env
    echo "LS_CLIENT_ID=$LS_CLIENT_ID" >> .env
    echo -e "${GREEN}✓ Added LS_CLIENT_ID${NC}"
fi

# Update or add LS_CLIENT_SECRET
if grep -q "^LS_CLIENT_SECRET=" .env; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^LS_CLIENT_SECRET=.*|LS_CLIENT_SECRET=$LS_CLIENT_SECRET|" .env
    else
        sed -i "s|^LS_CLIENT_SECRET=.*|LS_CLIENT_SECRET=$LS_CLIENT_SECRET|" .env
    fi
    echo -e "${GREEN}✓ Updated LS_CLIENT_SECRET${NC}"
else
    echo "LS_CLIENT_SECRET=$LS_CLIENT_SECRET" >> .env
    echo -e "${GREEN}✓ Added LS_CLIENT_SECRET${NC}"
fi

# Update or add LS_REDIRECT_URI
if grep -q "^LS_REDIRECT_URI=" .env; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^LS_REDIRECT_URI=.*|LS_REDIRECT_URI=$LS_REDIRECT_URI|" .env
    else
        sed -i "s|^LS_REDIRECT_URI=.*|LS_REDIRECT_URI=$LS_REDIRECT_URI|" .env
    fi
    echo -e "${GREEN}✓ Updated LS_REDIRECT_URI${NC}"
else
    echo "LS_REDIRECT_URI=$LS_REDIRECT_URI" >> .env
    echo -e "${GREEN}✓ Added LS_REDIRECT_URI${NC}"
fi

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}   Credentials Added Successfully!      ${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Your .env file now contains:"
echo "  - LS_CLIENT_ID: ${LS_CLIENT_ID:0:20}..."
echo "  - LS_CLIENT_SECRET: ${LS_CLIENT_SECRET:0:20}..."
echo "  - LS_REDIRECT_URI: $LS_REDIRECT_URI"
echo ""
echo "Next steps:"
echo "  1. Run: ${YELLOW}./scripts/test-lightspeed.sh${NC} to verify"
echo "  2. Run: ${YELLOW}npm run dev${NC} to start server"
echo "  3. Open: ${BLUE}http://localhost:5000/connections${NC}"
echo ""
