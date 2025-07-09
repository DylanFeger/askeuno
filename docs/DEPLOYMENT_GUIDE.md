# Acre Deployment Guide

This guide provides step-by-step instructions for deploying Acre to production using either Replit or AWS services.

## Table of Contents
- [Environment Variables Setup](#environment-variables-setup)
- [Option 1: Deploy to Replit](#option-1-deploy-to-replit)
- [Option 2: Deploy to AWS](#option-2-deploy-to-aws)
- [Post-Deployment Steps](#post-deployment-steps)

## Environment Variables Setup

### Required Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname
PGHOST=your-db-host
PGPORT=5432
PGUSER=your-db-user
PGPASSWORD=your-db-password
PGDATABASE=your-db-name

# OpenAI API (for AI features)
OPENAI_API_KEY=sk-your-openai-api-key

# SendGrid (for email notifications)
SENDGRID_API_KEY=SG.your-sendgrid-api-key

# Session Secret
SESSION_SECRET=your-secure-session-secret-minimum-32-chars

# Environment
NODE_ENV=production
```

### Generate Secure Secrets
```bash
# Generate session secret
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Option 1: Deploy to Replit

### Full-Stack Deployment on Replit

#### Step 1: Prepare for Deployment
1. Ensure your Replit project is up to date
2. Test the application locally using the dev workflow
3. Build the production assets:
```bash
NODE_ENV=production npm run build
```

#### Step 2: Configure Secrets in Replit
1. Click the "Secrets" tab in your Replit workspace
2. Add each environment variable:
   - `DATABASE_URL` - Your Neon/PostgreSQL connection string
   - `OPENAI_API_KEY` - Your OpenAI API key
   - `SENDGRID_API_KEY` - Your SendGrid API key
   - `SESSION_SECRET` - Generated secure secret

#### Step 3: Update .replit Configuration
Create or update `.replit` file:
```toml
run = "npm start"
entrypoint = "server/index.ts"

[deployment]
run = ["sh", "-c", "npm run build && npm start"]
deploymentTarget = "production"

[[ports]]
localPort = 5000
externalPort = 80

[env]
NODE_ENV = "production"
```

#### Step 4: Deploy Using Replit
1. Click the "Deploy" button in your Replit workspace
2. Choose "Production" deployment
3. Replit will automatically:
   - Build your application
   - Set up HTTPS/TLS
   - Configure health checks
   - Provide a `.replit.app` domain

#### Step 5: Custom Domain (Optional)
1. In Replit deployment settings, click "Custom Domain"
2. Add your domain (e.g., `acre.yourdomain.com`)
3. Update DNS records as instructed by Replit
4. SSL certificate will be automatically provisioned

## Option 2: Deploy to AWS

### Backend Deployment to EC2

#### Step 1: Launch EC2 Instance
```bash
# Using AWS CLI
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \  # Amazon Linux 2023
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxxxxx \
  --subnet-id subnet-xxxxxxxx \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=acre-backend}]'
```

#### Step 2: Configure Security Group
Allow inbound traffic:
- Port 22 (SSH) - Your IP only
- Port 80 (HTTP) - 0.0.0.0/0
- Port 443 (HTTPS) - 0.0.0.0/0
- Port 5000 (App) - Load balancer only

#### Step 3: Connect and Setup Server
```bash
# Connect to instance
ssh -i your-key.pem ec2-user@your-instance-ip

# Update system
sudo yum update -y

# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Install Git
sudo yum install -y git

# Install PM2 for process management
sudo npm install -g pm2

# Clone repository
git clone https://github.com/your-username/acre.git
cd acre

# Install dependencies
npm install
```

#### Step 4: Configure Environment
```bash
# Create .env file
cat > .env << EOL
DATABASE_URL=your-database-url
OPENAI_API_KEY=your-openai-key
SENDGRID_API_KEY=your-sendgrid-key
SESSION_SECRET=your-session-secret
NODE_ENV=production
EOL

# Build application
npm run build
```

#### Step 5: Setup PM2 Process Manager
```bash
# Start application with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user
```

#### Step 6: Setup Nginx Reverse Proxy
```bash
# Install Nginx
sudo yum install -y nginx

# Configure Nginx
sudo tee /etc/nginx/conf.d/acre.conf << EOL
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /health {
        proxy_pass http://localhost:5000/health;
        access_log off;
    }
}
EOL

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### Step 7: Setup SSL with Let's Encrypt
```bash
# Install Certbot
sudo yum install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo systemctl enable certbot-renew.timer
```

### Frontend Deployment to AWS Amplify

#### Step 1: Prepare Frontend Build
```bash
# Build frontend only
cd client
npm run build
# Output will be in dist/public
```

#### Step 2: Create Amplify App
```bash
# Using AWS CLI
aws amplify create-app --name acre-frontend --region us-east-1

# Or use AWS Console:
# 1. Go to AWS Amplify Console
# 2. Click "New app" > "Host web app"
# 3. Choose "Deploy without Git provider"
# 4. Upload dist/public folder
```

#### Step 3: Configure Environment Variables
In Amplify Console:
1. Go to App settings > Environment variables
2. Add variables:
```
VITE_API_URL=https://api.your-domain.com
VITE_APP_NAME=Acre
```

#### Step 4: Configure Redirects
Create `amplify.yml` in project root:
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist/public
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
  customHeaders:
    - pattern: '**/*'
      headers:
        - key: 'X-Frame-Options'
          value: 'SAMEORIGIN'
        - key: 'X-Content-Type-Options'
          value: 'nosniff'
        - key: 'X-XSS-Protection'
          value: '1; mode=block'

# Handle client-side routing
redirects:
  - source: '</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>'
    target: '/index.html'
    status: '200'
    condition: null
```

#### Step 5: Deploy
```bash
# Manual deployment
aws amplify start-deployment --app-id your-app-id --branch-name main

# Or use continuous deployment:
# Connect to GitHub/GitLab in Amplify Console
# Amplify will auto-deploy on push
```

## Post-Deployment Steps

### 1. Database Migrations
```bash
# SSH into server (EC2) or use Replit console
npm run db:push
```

### 2. Verify Health Check
```bash
# Test health endpoint
curl https://your-domain.com/health

# Run monitoring script
./scripts/health-check.sh
```

### 3. Setup Monitoring

#### CloudWatch (AWS)
```bash
# Install CloudWatch agent on EC2
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
sudo rpm -U ./amazon-cloudwatch-agent.rpm

# Configure agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

#### Replit Monitoring
- Replit automatically provides basic monitoring
- View metrics in Replit dashboard under "Deployments"

### 4. Setup Backup Strategy

#### Database Backups
```bash
# Automated PostgreSQL backup script
#!/bin/bash
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATABASE_URL="your-database-url"

pg_dump $DATABASE_URL > $BACKUP_DIR/acre_backup_$TIMESTAMP.sql

# Keep only last 7 days
find $BACKUP_DIR -name "acre_backup_*.sql" -mtime +7 -delete
```

#### Add to crontab
```bash
# Daily backup at 2 AM
0 2 * * * /home/ec2-user/backup.sh
```

### 5. Configure Alerts

#### AWS CloudWatch Alarms
```bash
# High CPU usage
aws cloudwatch put-metric-alarm \
  --alarm-name acre-high-cpu \
  --alarm-description "Alarm when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold

# Application errors
aws cloudwatch put-metric-alarm \
  --alarm-name acre-high-error-rate \
  --alarm-description "High application error rate" \
  --metric-name ErrorCount \
  --namespace Acre/Application \
  --statistic Sum \
  --period 300 \
  --threshold 10
```

### 6. Security Hardening

#### Update Security Headers
Already configured in Nginx/Amplify, but verify:
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security: max-age=31536000

#### Enable AWS WAF (Optional)
```bash
# Create Web ACL for additional protection
aws wafv2 create-web-acl \
  --name acre-waf \
  --scope REGIONAL \
  --default-action Allow={} \
  --rules file://waf-rules.json
```

## Troubleshooting

### Common Issues

1. **502 Bad Gateway**
   - Check if application is running: `pm2 status`
   - Check logs: `pm2 logs`
   - Verify Nginx configuration: `sudo nginx -t`

2. **Database Connection Failed**
   - Verify DATABASE_URL is correct
   - Check security groups allow database access
   - Test connection: `psql $DATABASE_URL -c "SELECT 1"`

3. **Static Files Not Loading**
   - Verify build completed successfully
   - Check Nginx static file serving configuration
   - Verify file permissions

4. **High Memory Usage**
   - Monitor with: `pm2 monit`
   - Adjust Node.js memory: `pm2 start app.js --node-args="--max-old-space-size=4096"`

### Rollback Procedure

1. **Replit**: Use deployment history to rollback
2. **EC2**: 
   ```bash
   pm2 stop all
   git checkout previous-tag
   npm install
   npm run build
   pm2 restart all
   ```

## Performance Optimization

### 1. Enable Compression
```javascript
// Already configured in server/index.ts
import compression from 'compression';
app.use(compression());
```

### 2. CDN Setup (CloudFront)
```bash
# Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name your-domain.com \
  --default-root-object index.html
```

### 3. Database Indexing
```sql
-- Ensure indexes are optimized
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_data_sources_user_id ON data_sources(user_id);
CREATE INDEX idx_chat_messages_conversation_id ON chat_messages(conversation_id);
```

## Maintenance Mode

### Enable Maintenance Mode
```bash
# Create maintenance page
echo "Under maintenance. Back soon!" > /var/www/maintenance.html

# Update Nginx
sudo sed -i '1s/^/return 503;\n/' /etc/nginx/conf.d/acre.conf
sudo systemctl reload nginx
```

### Disable Maintenance Mode
```bash
sudo sed -i '1d' /etc/nginx/conf.d/acre.conf
sudo systemctl reload nginx
```