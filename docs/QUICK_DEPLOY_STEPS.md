# Quick Deployment Steps

## 🚀 Deploy to Replit (Fastest)

### 1. Set Environment Variables
In Replit, click "Secrets" and add:
```
DATABASE_URL = your-neon-postgresql-url
OPENAI_API_KEY = sk-your-openai-key
SENDGRID_API_KEY = SG.your-sendgrid-key
SESSION_SECRET = generate-random-32-char-string
```

### 2. Run Deployment Script
```bash
./scripts/deploy-replit.sh
```

### 3. Deploy
1. Click "Deploy" button in Replit
2. Select "Production"
3. Wait for deployment (~2-3 minutes)
4. Access your app at: `https://your-app.replit.app`

---

## ☁️ Deploy to AWS

### Backend on EC2

#### 1. Quick EC2 Setup
```bash
# Launch instance (replace with your values)
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --instance-type t3.medium \
  --key-name your-key \
  --security-group-ids sg-xxxxx \
  --user-data file://scripts/ec2-userdata.sh
```

#### 2. Connect & Deploy
```bash
# SSH to instance
ssh -i your-key.pem ec2-user@instance-ip

# Clone and setup
git clone https://github.com/your-repo/acre.git
cd acre
./scripts/deploy-aws.sh
```

#### 3. Configure Environment
```bash
# Create .env file
nano .env
# Add all required variables

# Start application
pm2 start ecosystem.config.js --env production
```

### Frontend on Amplify

#### 1. Connect Repository
1. Open AWS Amplify Console
2. Click "New app" → "Host web app"
3. Connect your GitHub/GitLab repo
4. Select branch: `main`

#### 2. Configure Build
Amplify will auto-detect `amplify.yml` file

#### 3. Add Environment Variables
```
VITE_API_URL = https://your-backend-domain.com
```

#### 4. Deploy
Click "Save and deploy"

---

## ✅ Post-Deployment Checklist

### Immediate Tasks
- [ ] Test health endpoint: `curl https://your-domain/health`
- [ ] Verify database connection
- [ ] Test file upload functionality
- [ ] Send test email (if using SendGrid)

### Within 24 Hours
- [ ] Setup SSL certificate (AWS ACM or Let's Encrypt)
- [ ] Configure domain name
- [ ] Enable CloudWatch monitoring
- [ ] Setup automated backups

### Within 1 Week
- [ ] Configure WAF rules
- [ ] Setup alerts for errors/downtime
- [ ] Load test the application
- [ ] Document deployment process

---

## 🆘 Quick Troubleshooting

### Application Not Starting
```bash
# Check logs
pm2 logs

# Restart
pm2 restart all

# Check environment
pm2 env 0
```

### Database Connection Failed
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check security groups
aws ec2 describe-security-groups --group-ids sg-xxxxx
```

### Frontend Not Loading
```bash
# Check Amplify logs
aws amplify get-app --app-id xxxxx

# Verify build artifacts
ls -la dist/public/
```

### SSL Issues
```bash
# Check certificate
openssl s_client -connect your-domain.com:443

# Renew Let's Encrypt
sudo certbot renew
```

---

## 📞 Support Resources

- **Replit Support**: support.replit.com
- **AWS Support**: console.aws.amazon.com/support
- **Community**: github.com/your-repo/acre/discussions