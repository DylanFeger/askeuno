#!/bin/bash

# ===========================================
# Lightspeed Integration Test Script
# ===========================================
# Tests Lightspeed OAuth configuration
# ===========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}   Lightspeed Integration Test           ${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${RED}✗ .env file not found${NC}"
    echo "Run: cp env.example .env"
    exit 1
fi

# Check required variables
echo -e "${BLUE}Checking configuration...${NC}"
echo ""

MISSING_VARS=0

if [ -z "$LS_CLIENT_ID" ]; then
    echo -e "${RED}✗ LS_CLIENT_ID is not set${NC}"
    MISSING_VARS=1
else
    echo -e "${GREEN}✓ LS_CLIENT_ID is set${NC}"
fi

if [ -z "$LS_CLIENT_SECRET" ]; then
    echo -e "${RED}✗ LS_CLIENT_SECRET is not set${NC}"
    MISSING_VARS=1
else
    echo -e "${GREEN}✓ LS_CLIENT_SECRET is set${NC}"
fi

if [ -z "$LS_REDIRECT_URI" ]; then
    echo -e "${RED}✗ LS_REDIRECT_URI is not set${NC}"
    MISSING_VARS=1
else
    echo -e "${GREEN}✓ LS_REDIRECT_URI is set: $LS_REDIRECT_URI${NC}"
fi

if [ $MISSING_VARS -eq 1 ]; then
    echo ""
    echo -e "${YELLOW}Please add the missing variables to your .env file${NC}"
    echo "See docs/LIGHTSPEED_SETUP.md for instructions"
    exit 1
fi

echo ""
echo -e "${BLUE}Configuration looks good!${NC}"
echo ""

# Check if server is running
echo -e "${BLUE}Checking if server is running...${NC}"
if curl -s http://localhost:${PORT:-5000}/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Server is running on port ${PORT:-5000}${NC}"
else
    echo -e "${YELLOW}⚠ Server is not running${NC}"
    echo "Start it with: npm run dev"
    echo ""
fi

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}   Next Steps                           ${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo "1. Make sure your server is running: ${YELLOW}npm run dev${NC}"
echo ""
echo "2. Open your browser to:"
echo -e "   ${GREEN}http://localhost:${PORT:-5000}/connections${NC}"
echo ""
echo "3. Click 'Connect Lightspeed' button"
echo ""
echo "4. You'll be redirected to Lightspeed to authorize"
echo ""
echo "5. After authorization, you'll be redirected back"
echo ""
echo -e "${YELLOW}Note:${NC} Make sure LS_REDIRECT_URI matches what's configured"
echo "in your Lightspeed Developer Portal application"
echo ""
