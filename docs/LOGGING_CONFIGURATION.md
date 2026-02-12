# Logging Configuration Guide

This guide explains the logging setup for Ask Euno, including local file logging and AWS CloudWatch integration.

## Logging Architecture

### Event Categories

1. **File Uploads** (`logs/file-uploads.log`)
   - Upload success/failure
   - File metadata (size, type, user)
   - Processing time
   - Row count processed

2. **ETL Processing** (`logs/etl-processing.log`)
   - Processing stages (file_processing, schema_analysis, data_storage)
   - Duration of each stage
   - Errors and retries
   - Data transformation details

3. **AI API Calls** (`logs/ai-calls.log`)
   - OpenAI API requests
   - Response times
   - Token usage
   - Success/failure status
   - Conversation context

4. **Payment Events** (`logs/payments.log`)
   - Transaction details
   - Subscription changes
   - Payment failures
   - Refunds

5. **Security Events** (`logs/security.log`)
   - Login attempts
   - Authentication failures
   - Rate limit violations
   - Suspicious activities

## Local Logging

### File Structure
```
logs/
├── combined.log          # All application logs
├── error.log            # Error-level logs only
├── file-uploads.log     # File upload events
├── etl-processing.log   # ETL pipeline logs
├── ai-calls.log         # AI/OpenAI API logs
├── payments.log         # Payment transaction logs
└── security.log         # Security-related events
```

### Log Rotation
- Each log file has a 5MB size limit
- Automatic rotation keeps last 5-10 files
- Payment logs keep 20 files for compliance

### Usage Examples

```typescript
// File upload logging
logFileUpload(userId, fileName, 'success', {
  fileSize: 1024000,
  fileType: 'text/csv',
  processingTime: 2500,
  rowsProcessed: 1500
});

// ETL process logging
logETLProcess(dataSourceId, 'schema_analysis', 'completed', {
  duration: 1200,
  schemaDetected: { columns: ['date', 'revenue', 'cost'] }
});

// AI call logging
logAICall(userId, 'data_insight', 'success', {
  model: 'gpt-4o',
  responseTime: 850,
  tokensUsed: 350,
  conversationId: 123
});

// Payment event logging
logPaymentEvent(userId, 'subscription_upgrade', 30.00, {
  subscriptionTier: 'professional',
  paymentMethod: 'stripe',
  transactionId: 'ch_1234567890'
});
```

## AWS CloudWatch Integration

### Setup

1. **Install CloudWatch Transport**
```bash
npm install winston-cloudwatch
```

2. **Environment Variables**
```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

3. **Enable CloudWatch Logging**
```typescript
import { setupCloudWatchLogging } from './config/cloudwatch-logger';

// Add CloudWatch to existing logger
setupCloudWatchLogging(
  logger,
  '/aws/application/askeuno/production',
  'application-logs'
);
```

### CloudWatch Log Groups

```
/aws/application/askeuno/
├── production/
│   ├── file-uploads-2024-01-09
│   ├── etl-processing-2024-01-09
│   ├── ai-calls-2024-01-09
│   ├── payments-2024-01-09
│   └── security-2024-01-09
└── staging/
    └── ... (similar structure)
```

### CloudWatch Insights Queries

#### Top File Upload Errors
```
fields @timestamp, userId, fileName, error
| filter status = "failure"
| stats count() by error
| sort count desc
```

#### AI API Performance
```
fields @timestamp, operation, responseTime, tokensUsed
| filter status = "success"
| stats avg(responseTime), sum(tokensUsed), count() by bin(5m)
```

#### Payment Success Rate
```
fields @timestamp, event, amount, status
| stats count() by status
| sort count desc
```

#### ETL Processing Times
```
fields @timestamp, stage, duration
| filter status = "completed"
| stats avg(duration), max(duration), min(duration) by stage
```

## Monitoring and Alerts

### CloudWatch Alarms

1. **High Error Rate**
```typescript
{
  MetricName: 'ErrorCount',
  Threshold: 10,
  Period: 300, // 5 minutes
  EvaluationPeriods: 1,
  AlarmActions: ['arn:aws:sns:...']
}
```

2. **AI API Failures**
```typescript
{
  MetricName: 'AICallFailures',
  Threshold: 5,
  Period: 600, // 10 minutes
}
```

3. **Payment Failures**
```typescript
{
  MetricName: 'PaymentFailures',
  Threshold: 3,
  Period: 300,
}
```

### Log Analysis Dashboard

Create a CloudWatch Dashboard with:
- File upload success rate
- Average ETL processing time
- AI API call volume and latency
- Payment transaction summary
- Security event timeline

## Best Practices

1. **Structured Logging**
   - Use consistent field names
   - Include correlation IDs
   - Add user context

2. **Performance**
   - Batch log uploads to CloudWatch
   - Use appropriate log levels
   - Avoid logging sensitive data

3. **Security**
   - Redact sensitive information
   - Encrypt logs at rest
   - Set retention policies

4. **Cost Optimization**
   - Use log sampling for high-volume events
   - Set appropriate retention periods
   - Archive old logs to S3

## Troubleshooting

### Common Issues

1. **CloudWatch Connection Failed**
```bash
# Check AWS credentials
aws sts get-caller-identity

# Verify IAM permissions
# Required: logs:CreateLogGroup, logs:CreateLogStream, logs:PutLogEvents
```

2. **High Log Volume**
```typescript
// Implement sampling
if (Math.random() < 0.1) { // Log 10% of events
  logAICall(...);
}
```

3. **Missing Logs**
- Check file permissions
- Verify disk space
- Review log rotation settings

## Local Development

For local development without AWS:
```bash
# Logs will only write to local files
NODE_ENV=development npm run dev

# View logs
tail -f logs/combined.log
tail -f logs/ai-calls.log | jq '.'
```

## Production Deployment

For production with CloudWatch:
```bash
# Ensure AWS credentials are set
NODE_ENV=production npm start

# Logs will write to both local files and CloudWatch
```