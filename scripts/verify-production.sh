#!/bin/bash

# ===========================================
# Production Deployment Verification Script
# ===========================================
# Verifies production deployment is working correctly
# ===========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PROD_URL=${PROD_URL:-https://askeuno.com}

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║     Ask Euno - Production Verification                 ║"
echo "╚════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${CYAN}Testing: ${PROD_URL}${NC}"
echo ""

# Check if curl is available
if ! command -v curl &> /dev/null; then
    echo -e "${RED}✗ curl not found${NC}"
    exit 1
fi

ERRORS=0

# Test 1: Site is accessible
echo -e "${BLUE}1. Testing site accessibility...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL" || echo "000")
if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "301" ] || [ "$HTTP_CODE" == "302" ]; then
    echo -e "${GREEN}✓ Site is accessible (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ Site not accessible (HTTP $HTTP_CODE)${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Test 2: HTTPS/SSL
echo -e "${BLUE}2. Testing HTTPS/SSL...${NC}"
SSL_CHECK=$(curl -s -o /dev/null -w "%{ssl_verify_result}" "$PROD_URL" 2>/dev/null || echo "1")
if [ "$SSL_CHECK" == "0" ]; then
    echo -e "${GREEN}✓ SSL certificate valid${NC}"
else
    echo -e "${YELLOW}⚠ SSL check failed (code: $SSL_CHECK)${NC}"
fi

# Test 3: Health check endpoint
echo -e "${BLUE}3. Testing health check endpoint...${NC}"
HEALTH_RESPONSE=$(curl -s "${PROD_URL}/api/health" || echo "")
if echo "$HEALTH_RESPONSE" | grep -q "healthy\|status"; then
    echo -e "${GREEN}✓ Health check endpoint working${NC}"
    echo "   Response: $(echo "$HEALTH_RESPONSE" | head -c 100)..."
else
    echo -e "${RED}✗ Health check endpoint failed${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Test 4: Response time
echo -e "${BLUE}4. Testing response time...${NC}"
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$PROD_URL" || echo "999")
RESPONSE_TIME_MS=$(echo "$RESPONSE_TIME * 1000" | bc | cut -d. -f1)
if [ "$RESPONSE_TIME_MS" -lt 2000 ]; then
    echo -e "${GREEN}✓ Response time: ${RESPONSE_TIME_MS}ms (good)${NC}"
elif [ "$RESPONSE_TIME_MS" -lt 5000 ]; then
    echo -e "${YELLOW}⚠ Response time: ${RESPONSE_TIME_MS}ms (acceptable)${NC}"
else
    echo -e "${RED}✗ Response time: ${RESPONSE_TIME_MS}ms (slow)${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Test 5: Check for common errors
echo -e "${BLUE}5. Checking for errors...${NC}"
PAGE_CONTENT=$(curl -s "$PROD_URL" || echo "")
if echo "$PAGE_CONTENT" | grep -qi "error\|exception\|failed"; then
    echo -e "${YELLOW}⚠ Possible errors found in page content${NC}"
else
    echo -e "${GREEN}✓ No obvious errors in page content${NC}"
fi

# Summary
echo ""
echo -e "${BLUE}=========================================${NC}"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}   ✓ Production Verification Passed!     ${NC}"
else
    echo -e "${RED}   ✗ Production Verification Failed       ${NC}"
    echo -e "${RED}   Found $ERRORS issue(s)                  ${NC}"
fi
echo -e "${BLUE}=========================================${NC}"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${CYAN}Next Steps:${NC}"
    echo "1. Check AWS Amplify build logs"
    echo "2. Verify environment variables are set"
    echo "3. Check database connection"
    echo "4. Review error logs"
    echo ""
    exit 1
fi

echo -e "${GREEN}Production deployment looks good! 🎉${NC}"
echo ""
