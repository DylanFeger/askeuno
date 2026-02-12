# Health Check Monitoring Guide

## Overview

The Ask Euno application provides a `/health` endpoint for monitoring application status and database connectivity. This endpoint is designed for use with deployment monitoring tools, load balancers, and container orchestration systems.

## Health Check Endpoint

### Endpoint Details
- **URL**: `/health`
- **Method**: GET
- **Authentication**: None required (public endpoint)
- **Response**: JSON

### Healthy Response (200 OK)
```json
{
  "status": "healthy",
  "message": "Ask Euno API is running",
  "timestamp": "2025-01-09T20:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0",
  "database": "connected",
  "responseTime": "15.32ms"
}
```

### Unhealthy Response (503 Service Unavailable)
```json
{
  "status": "unhealthy",
  "message": "Database connection failed",
  "timestamp": "2025-01-09T20:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "error": "Database unavailable"
}
```

## Using the Health Check Script

A bash script is provided for easy health monitoring:

```bash
# Basic health check
./scripts/health-check.sh

# Custom health URL
HEALTH_URL=https://askeuno.com/health ./scripts/health-check.sh

# With custom timeout (seconds)
TIMEOUT=10 ./scripts/health-check.sh
```

### Script Output Example
```
🏥 Checking application health at: http://localhost:5000/health
✅ Application is healthy
{
  "status": "healthy",
  "message": "Ask Euno API is running",
  "timestamp": "2025-01-09T20:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0",
  "database": "connected",
  "responseTime": "15.32ms"
}

📊 Summary:
  Uptime: 0 days 01:00:00
  Database: connected
  Response Time: 15.32ms
```

## Integration with Monitoring Tools

### AWS CloudWatch

Create a CloudWatch Synthetics canary:

```javascript
const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');

const checkHealth = async function () {
    const response = await synthetics.executeHttpStep(
        'Check Acre Health',
        'GET',
        'https://askeuno.com/health',
        null,
        null,
        {
            acceptedStatusCodes: [200]
        }
    );
    
    const data = JSON.parse(response.body);
    
    // Verify response
    if (data.status !== 'healthy') {
        throw new Error('Application reported unhealthy status');
    }
    
    // Log metrics
    log.info('Health check passed', {
        uptime: data.uptime,
        responseTime: data.responseTime,
        database: data.database
    });
};

exports.handler = async () => {
    return await synthetics.executeStep('checkHealth', checkHealth);
};
```

### Kubernetes Liveness/Readiness Probes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: askeuno-api
spec:
  template:
    spec:
      containers:
      - name: acre
        image: acre:latest
        ports:
        - containerPort: 5000
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
```

### Docker Compose Health Check

```yaml
version: '3.8'
services:
  askeuno-api:
    build: .
    ports:
      - "5000:5000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### AWS ELB/ALB Health Check

Configure your load balancer target group:

```json
{
  "HealthCheckProtocol": "HTTP",
  "HealthCheckPath": "/health",
  "HealthCheckIntervalSeconds": 30,
  "HealthCheckTimeoutSeconds": 5,
  "HealthyThresholdCount": 2,
  "UnhealthyThresholdCount": 3,
  "Matcher": {
    "HttpCode": "200"
  }
}
```

### Datadog Integration

```yaml
# datadog-agent.yaml
init_config:

instances:
  - name: acre_health
    url: https://askeuno.com/health
    timeout: 5
    method: GET
    skip_event: false
    check_certificate_expiration: true
    days_warning: 30
    days_critical: 7
    tags:
      - service:acre
      - env:production
```

### New Relic Synthetics

```javascript
// New Relic Synthetics Script
$http.get('https://askeuno.com/health', function(err, response, body) {
  if (err) {
    console.error('Health check failed:', err);
    return;
  }
  
  assert.equal(response.statusCode, 200, 'Expected 200 OK');
  
  var data = JSON.parse(body);
  assert.equal(data.status, 'healthy', 'Expected healthy status');
  assert.ok(data.database === 'connected', 'Database should be connected');
  
  // Custom metrics
  $util.insights.set('acre_uptime', data.uptime);
  $util.insights.set('acre_response_time', parseFloat(data.responseTime));
});
```

## Monitoring Best Practices

### 1. Alert Thresholds
- **Response Time**: Alert if > 1000ms
- **Failure Rate**: Alert if > 10% over 5 minutes
- **Database Connection**: Alert immediately on failure

### 2. Monitoring Frequency
- **Production**: Every 30 seconds
- **Staging**: Every 60 seconds
- **Development**: Every 5 minutes

### 3. Response Time SLOs
- **P50**: < 50ms
- **P95**: < 200ms
- **P99**: < 500ms

### 4. Uptime Goals
- **Monthly Uptime**: 99.9% (43.2 minutes downtime)
- **Yearly Uptime**: 99.95% (4.38 hours downtime)

## Troubleshooting

### Common Issues

1. **503 Service Unavailable**
   - Check database connection string
   - Verify database is running
   - Check network connectivity

2. **Slow Response Times**
   - Check database query performance
   - Monitor server resources (CPU, memory)
   - Review application logs

3. **Connection Timeout**
   - Verify application is running
   - Check firewall/security group rules
   - Validate port configuration

### Debug Commands

```bash
# Check if application is listening
netstat -tlnp | grep 5000

# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# View recent logs
tail -f logs/combined.log | grep health

# Monitor resource usage
top -p $(pgrep -f "node.*server")
```

## Custom Health Checks

To add additional health checks (Redis, external APIs, etc.):

```typescript
// server/utils/health-checks.ts
export async function checkRedis(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

export async function checkExternalAPI(): Promise<boolean> {
  try {
    const response = await fetch('https://api.example.com/status');
    return response.ok;
  } catch {
    return false;
  }
}

// Add to health endpoint
const redisHealthy = await checkRedis();
const apiHealthy = await checkExternalAPI();

res.json({
  // ... existing fields
  services: {
    database: databaseHealthy ? 'connected' : 'disconnected',
    redis: redisHealthy ? 'connected' : 'disconnected',
    externalAPI: apiHealthy ? 'available' : 'unavailable'
  }
});
```

## Security Considerations

1. **Rate Limiting**: Consider rate limiting the health endpoint to prevent abuse
2. **Information Disclosure**: Don't expose sensitive information in health responses
3. **Authentication**: Keep health checks unauthenticated for monitoring tools
4. **Separate Endpoint**: Consider a separate detailed health check for internal use