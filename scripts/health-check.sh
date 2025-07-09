#!/bin/bash

# Health check script for deployment monitoring
# Can be used by monitoring tools, load balancers, or container orchestrators

HEALTH_URL="${HEALTH_URL:-http://localhost:5000/health}"
TIMEOUT="${TIMEOUT:-5}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🏥 Checking application health at: $HEALTH_URL"

# Perform health check
response=$(curl -s -w "\n%{http_code}" --connect-timeout $TIMEOUT "$HEALTH_URL" 2>/dev/null)

# Extract HTTP status code
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

# Check if curl succeeded
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Health check failed: Connection error${NC}"
    exit 1
fi

# Parse response
if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ Application is healthy${NC}"
    
    # Pretty print JSON response if jq is available
    if command -v jq &> /dev/null; then
        echo "$body" | jq '.'
    else
        echo "$body"
    fi
    
    # Extract specific values if jq is available
    if command -v jq &> /dev/null; then
        uptime=$(echo "$body" | jq -r '.uptime')
        database=$(echo "$body" | jq -r '.database')
        response_time=$(echo "$body" | jq -r '.responseTime')
        
        echo -e "\n📊 Summary:"
        echo -e "  Uptime: ${GREEN}$(printf '%d days %02d:%02d:%02d' $((uptime/86400)) $((uptime%86400/3600)) $((uptime%3600/60)) $((uptime%60)))${NC}"
        echo -e "  Database: ${GREEN}$database${NC}"
        echo -e "  Response Time: ${GREEN}$response_time${NC}"
    fi
    
    exit 0
elif [ "$http_code" = "503" ]; then
    echo -e "${RED}❌ Application is unhealthy${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    exit 1
else
    echo -e "${RED}❌ Unexpected response code: $http_code${NC}"
    echo "$body"
    exit 1
fi