#!/bin/bash

# Test script for cron jobs
# This script tests the job functions with sample data

set -e

echo "=== Acre Jobs Test Script ==="
echo

# Set test environment
export NODE_ENV=test
export DATABASE_URL=${DATABASE_URL:-"postgresql://test:test@localhost:5432/acre_test"}

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run a test
run_test() {
    local job_name=$1
    local job_file=$2
    
    echo -e "${YELLOW}Testing $job_name...${NC}"
    
    if npx tsx $job_file; then
        echo -e "${GREEN}✓ $job_name test passed${NC}"
        echo
        return 0
    else
        echo -e "${RED}✗ $job_name test failed${NC}"
        echo
        return 1
    fi
}

# Create logs directory
mkdir -p logs

# Test data sync job
echo "1. Testing Data Sync Job"
echo "========================"
run_test "Data Sync" "server/jobs/dataSync.ts"

# Test email reports job
echo "2. Testing Email Reports Job"
echo "==========================="
run_test "Email Reports" "server/jobs/emailReports.ts"

# Test cron expressions
echo "3. Validating Cron Expressions"
echo "=============================="

validate_cron() {
    local expression=$1
    local description=$2
    
    # Basic validation (this is simplified, use a proper cron parser in production)
    if [[ $expression =~ ^[0-9*,/-]+[[:space:]]+[0-9*,/-]+[[:space:]]+[0-9*,/-]+[[:space:]]+[0-9*,/-]+[[:space:]]+[0-9*,/-]+$ ]]; then
        echo -e "${GREEN}✓ Valid:${NC} $description - $expression"
    else
        echo -e "${RED}✗ Invalid:${NC} $description - $expression"
    fi
}

validate_cron "0 */6 * * *" "Data sync every 6 hours"
validate_cron "0 9 * * 1" "Weekly reports on Monday 9am"
validate_cron "*/30 * * * *" "Refresh views every 30 minutes"
validate_cron "0 2 * * *" "Daily cleanup at 2am"

echo

# Test Lambda handlers
echo "4. Testing Lambda Handlers"
echo "========================="

test_lambda() {
    local handler=$1
    local event=$2
    
    echo "Testing $handler with event:"
    echo "$event"
    
    # Simulate Lambda execution
    NODE_ENV=test npx tsx -e "
        const handler = require('./$handler').lambdaHandler;
        const event = $event;
        const context = { functionName: 'test' };
        
        handler(event, context)
            .then(result => {
                console.log('Lambda result:', JSON.stringify(result, null, 2));
                process.exit(result.statusCode === 200 ? 0 : 1);
            })
            .catch(err => {
                console.error('Lambda error:', err);
                process.exit(1);
            });
    "
}

# Test with sample Lambda events
echo -e "${YELLOW}Testing Data Sync Lambda...${NC}"
test_lambda "server/jobs/dataSync" "{}"

echo -e "${YELLOW}Testing Email Reports Lambda...${NC}"
test_lambda "server/jobs/emailReports" "{}"

echo

# Generate sample logs
echo "5. Generating Sample Logs"
echo "========================"

# Create sample log entries
cat > logs/test-data-sync.log << EOF
[2024-01-09 09:00:00] INFO: Starting scheduled data sync job
[2024-01-09 09:00:01] INFO: Found 3 data sources to sync
[2024-01-09 09:00:02] INFO: Starting sync for data source: Sales Data
[2024-01-09 09:00:03] INFO: Attempting fetch data for Sales Data (attempt 1/3)
[2024-01-09 09:00:05] INFO: Successfully synced data source: Sales Data
[2024-01-09 09:00:05] INFO: Data sync job completed
{
  "totalSources": 3,
  "successful": 3,
  "failed": 0,
  "totalRows": 1500,
  "totalDuration": 5000,
  "averageTimePerSource": 1666
}
EOF

cat > logs/test-email-reports.log << EOF
[2024-01-09 09:00:00] INFO: Starting weekly email reports job
[2024-01-09 09:00:01] INFO: Found 25 active users for reports
[2024-01-09 09:00:02] INFO: Test mode: Would send email to user1@example.com
[2024-01-09 09:00:03] INFO: Test mode: Would send email to user2@example.com
[2024-01-09 09:00:10] INFO: Email reports job completed
{
  "totalUsers": 25,
  "successful": 25,
  "failed": 0,
  "totalRetries": 2,
  "totalDuration": 10000,
  "averageTimePerUser": 400
}
EOF

echo -e "${GREEN}✓ Sample logs generated in logs/ directory${NC}"
echo

# Summary
echo "=== Test Summary ==="
echo
echo "Job functions have been tested with sample data."
echo "Check the logs/ directory for detailed output."
echo
echo "To run jobs in production:"
echo "1. Install cron jobs: crontab cron/crontab"
echo "2. Deploy Lambda functions: serverless deploy"
echo "3. Monitor logs in CloudWatch or /var/log/acre/"
echo

# Cleanup test environment
unset NODE_ENV