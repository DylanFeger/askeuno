# Cron Job and Lambda Examples

This document shows the cron job and Lambda scripts created for Acre with sample execution logs.

## 1. Data Sync Job (`server/jobs/dataSync.ts`)

### Purpose
Synchronizes data from external sources (Google Sheets, QuickBooks, etc.) on a scheduled basis.

### Key Features
- **Retry Logic**: Automatic retries with exponential backoff (up to 3 attempts)
- **Error Handling**: Comprehensive error logging and graceful failure handling
- **Batch Processing**: Processes data in configurable batch sizes
- **AI Analysis**: Uses OpenAI to analyze data changes and generate insights

### Sample Execution Log
```
[2024-01-09 09:00:00] INFO: Starting scheduled data sync job
[2024-01-09 09:00:01] INFO: Found 3 data sources to sync
[2024-01-09 09:00:02] INFO: Starting sync for data source: QuickBooks Invoices
  dataSourceId: 1
  type: quickbooks
[2024-01-09 09:00:03] INFO: Attempting fetch data for QuickBooks Invoices (attempt 1/3)
[2024-01-09 09:00:05] INFO: Attempting insert batch 1 (attempt 1/3)
[2024-01-09 09:00:06] INFO: Successfully synced data source: QuickBooks Invoices
  dataSourceId: 1
  rowsProcessed: 3
  duration: 4000ms
  insights: "3 new transactions added: 2 invoices totaling $3,000 and 1 payment received"

[2024-01-09 09:00:07] INFO: Starting sync for data source: Google Sheets Budget
  dataSourceId: 2
  type: google_sheets
[2024-01-09 09:00:08] INFO: Attempting fetch data for Google Sheets Budget (attempt 1/3)
[2024-01-09 09:00:09] INFO: Successfully synced data source: Google Sheets Budget
  dataSourceId: 2
  rowsProcessed: 3
  duration: 2000ms
  insights: "Q1 financial data shows 20% revenue growth with stable expenses"

[2024-01-09 09:00:10] INFO: Data sync job completed
  totalSources: 2
  successful: 2
  failed: 0
  totalRows: 6
  totalDuration: 10000ms
  averageTimePerSource: 5000ms
```

### Cron Schedule
```bash
# Run every 6 hours
0 */6 * * * npm run job:data-sync

# Premium users - hourly during business hours
0 9-18 * * 1-5 npm run job:data-sync-premium
```

### Lambda Configuration
```yaml
handler: server/jobs/dataSync.lambdaHandler
timeout: 300 # 5 minutes
events:
  - schedule: rate(6 hours)
```

## 2. Email Reports Job (`server/jobs/emailReports.ts`)

### Purpose
Sends personalized weekly reports to users with their data activity and insights.

### Key Features
- **Personalized Content**: Tailored insights based on user activity
- **HTML Email Templates**: Professional, responsive email design
- **Batch Processing**: Sends emails in batches to avoid rate limits
- **Retry Logic**: Automatic retries for failed email sends

### Sample Execution Log
```
[2024-01-09 09:00:00] INFO: Starting weekly email reports job
[2024-01-09 09:00:01] INFO: Found 25 active users for reports
[2024-01-09 09:00:02] INFO: Attempting send email to john@example.com (attempt 1/3)
[2024-01-09 09:00:03] INFO: Test mode: Would send email
  to: john@example.com
  subject: Your Weekly Acre Report - 42 insights generated

[2024-01-09 09:00:04] INFO: Successfully sent report email
  userId: 1
  email: john@example.com
  retries: 0

[2024-01-09 09:00:05] INFO: Attempting send email to sarah@example.com (attempt 1/3)
[2024-01-09 09:00:06] WARNING: send email to sarah@example.com failed on attempt 1
  error: "Rate limit exceeded"
  attempt: 1
[2024-01-09 09:00:08] INFO: Retrying send email to sarah@example.com in 2000ms
[2024-01-09 09:00:10] INFO: Attempting send email to sarah@example.com (attempt 2/3)
[2024-01-09 09:00:11] INFO: Successfully sent report email
  userId: 2
  email: sarah@example.com
  retries: 1

[2024-01-09 09:00:30] INFO: Email reports job completed
  totalUsers: 25
  successful: 24
  failed: 1
  totalRetries: 3
  totalDuration: 30000ms
  averageTimePerUser: 1200ms
```

### Sample Email Content
```html
Your Weekly Acre Report

Hi John, here's your data activity summary

📊 Your Stats This Week
- Data Sources: 3
- Total Rows: 15,234
- Conversations: 7
- Messages This Week: 42

💡 Insights & Recommendations
• You've been very active this week! Consider upgrading for unlimited queries.
• You're using 3 of 3 available data sources on your Starter plan.
• Your sales data shows positive trends - ask Acre for detailed analysis!

Your current plan: Starter

[View Dashboard]
```

### Cron Schedule
```bash
# Weekly reports - Monday 9am
0 9 * * 1 npm run job:email-reports

# Monthly summary - 1st of month
0 10 1 * * npm run job:monthly-summary
```

### Lambda Configuration
```yaml
handler: server/jobs/emailReports.lambdaHandler
timeout: 300 # 5 minutes
events:
  - schedule: cron(0 9 ? * MON *)
```

## 3. Error Handling Examples

### Retry with Exponential Backoff
```typescript
// Attempt 1: immediate
// Attempt 2: wait 1 second
// Attempt 3: wait 2 seconds
// Attempt 4: wait 4 seconds (if MAX_RETRIES = 4)
```

### Failed Job Example
```
[2024-01-09 10:00:00] ERROR: Failed to sync data source: External API
  dataSourceId: 3
  error: "Connection timeout"
  duration: 30000ms
  
[2024-01-09 10:00:01] ERROR: fetch data for External API failed after 3 attempts
  error: "Connection timeout"
  
[2024-01-09 10:00:02] INFO: Data sync job completed
  totalSources: 3
  successful: 2
  failed: 1
  totalRows: 6
  totalDuration: 35000ms
```

## 4. Deployment Options

### Option 1: Traditional Cron (Linux/Unix)
```bash
# Install crontab
crontab cron/crontab

# View installed jobs
crontab -l

# Monitor execution
tail -f /var/log/acre/data-sync.log
```

### Option 2: AWS Lambda
```bash
# Deploy to AWS
serverless deploy --stage production

# View logs
serverless logs -f dataSync -t

# Invoke manually
serverless invoke -f dataSync
```

### Option 3: GitHub Actions
```yaml
name: Scheduled Jobs
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
jobs:
  data-sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm ci
      - run: npm run job:data-sync
```

## 5. Monitoring and Alerts

### CloudWatch Alarms (AWS)
- Configured to alert on job failures
- Monitors execution time and error rates
- Sends notifications via SNS

### Log Aggregation
- All jobs write to structured logs
- Can be shipped to CloudWatch, Datadog, etc.
- Includes correlation IDs for tracking

### Health Checks
```bash
# Cron job for monitoring
*/5 * * * * npm run job:health-check
```

## Testing

Run the test script to validate all jobs:
```bash
./scripts/test-jobs.sh
```

This will:
1. Test data sync with sample data
2. Test email reports (in test mode)
3. Validate cron expressions
4. Test Lambda handlers
5. Generate sample logs