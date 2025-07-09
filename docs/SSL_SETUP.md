# SSL/HTTPS Setup Guide

This guide covers how to set up SSL certificates and enforce HTTPS for your Acre application on different platforms.

## Table of Contents
- [Replit Deployment](#replit-deployment)
- [AWS Amplify Deployment](#aws-amplify-deployment)
- [AWS EC2 Deployment](#aws-ec2-deployment)
- [Testing HTTPS](#testing-https)

## Replit Deployment

### Automatic SSL on Replit

Replit provides **automatic SSL certificates** for all deployed applications:

1. **Deploy your app** using Replit Deployments
2. Your app will automatically be available at `https://your-app-name.replit.app`
3. SSL certificates are managed by Replit - no configuration needed!

### Custom Domain on Replit

To use a custom domain with SSL on Replit:

1. **Deploy your app** first
2. Go to your Repl's **Deployments** tab
3. Click **Connect domain**
4. Add your custom domain (e.g., `app.yourdomain.com`)
5. Add the provided DNS records to your domain registrar:
   ```
   Type: CNAME
   Name: app (or your subdomain)
   Value: your-app-name.replit.app
   ```
6. Replit will automatically provision SSL certificates via Let's Encrypt
7. Your app will be available at `https://app.yourdomain.com`

### Environment Variables for Replit

Set these in your Replit Secrets:
```bash
NODE_ENV=production
SESSION_SECRET=your-secure-random-string
DATABASE_URL=your-postgresql-url
OPENAI_API_KEY=your-openai-key
```

## AWS Amplify Deployment

AWS Amplify provides automatic SSL certificates for all deployed apps.

### Setup Steps:

1. **Prepare your repository**
   ```bash
   # Create amplify.yml in your project root
   ```

2. **Create `amplify.yml`**:
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
       baseDirectory: dist
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```

3. **Deploy to Amplify**:
   - Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify)
   - Click "New app" → "Host web app"
   - Connect your GitHub/GitLab repository
   - Select your branch
   - Review and deploy

4. **SSL Certificate**:
   - Amplify automatically provisions SSL certificates
   - Your app will be available at `https://main.d1234567890.amplifyapp.com`

5. **Custom Domain**:
   - In Amplify Console, go to "Domain management"
   - Click "Add domain"
   - Enter your domain
   - Amplify will:
     - Provide DNS records to add
     - Automatically provision SSL certificate
     - Handle renewals

### Environment Variables for Amplify

In Amplify Console → App settings → Environment variables:
```
NODE_ENV=production
SESSION_SECRET=your-secure-random-string
DATABASE_URL=your-postgresql-url
OPENAI_API_KEY=your-openai-key
```

## AWS EC2 Deployment

For EC2, you have several options for SSL certificates.

### Option 1: Using Nginx with Let's Encrypt (Recommended)

1. **Install Nginx and Certbot**:
   ```bash
   sudo apt update
   sudo apt install nginx certbot python3-certbot-nginx
   ```

2. **Configure Nginx** (`/etc/nginx/sites-available/acre`):
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Enable the site**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/acre /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

4. **Get SSL Certificate**:
   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

5. **Auto-renewal** (Certbot sets this up automatically):
   ```bash
   sudo certbot renew --dry-run  # Test renewal
   ```

### Option 2: Using AWS Certificate Manager with Load Balancer

1. **Request Certificate in ACM**:
   - Go to AWS Certificate Manager
   - Request a public certificate
   - Add domain names
   - Choose DNS validation
   - Add CNAME records to your DNS

2. **Create Application Load Balancer**:
   - Create target group pointing to your EC2 instance
   - Create ALB with:
     - HTTPS listener (port 443)
     - HTTP listener (port 80) with redirect to HTTPS
     - Attach ACM certificate

3. **Update Security Groups**:
   - ALB security group: Allow 80, 443 from anywhere
   - EC2 security group: Allow 5000 from ALB security group only

4. **Point domain to ALB**:
   ```
   Type: CNAME
   Name: @
   Value: your-alb-dns-name.region.elb.amazonaws.com
   ```

### EC2 Application Setup

1. **Clone and setup**:
   ```bash
   git clone your-repo
   cd acre
   npm install
   ```

2. **Use PM2 for process management**:
   ```bash
   npm install -g pm2
   pm2 start npm --name "acre" -- start
   pm2 save
   pm2 startup
   ```

3. **Environment variables** (`.env` file):
   ```bash
   NODE_ENV=production
   SESSION_SECRET=your-secure-random-string
   DATABASE_URL=your-postgresql-url
   OPENAI_API_KEY=your-openai-key
   ```

## Testing HTTPS

### Verify HTTPS Redirect:
```bash
# Should return 301 redirect
curl -I http://yourdomain.com

# Should return 200 OK
curl -I https://yourdomain.com
```

### Check SSL Certificate:
```bash
# Check certificate details
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com < /dev/null

# Test SSL configuration
curl -I https://yourdomain.com
```

### Online Tools:
- [SSL Labs Server Test](https://www.ssllabs.com/ssltest/)
- [Security Headers](https://securityheaders.com/)

## Security Best Practices

1. **Always use HTTPS** in production
2. **Enable HSTS** (already configured in the app)
3. **Use strong cipher suites** (handled by modern defaults)
4. **Keep certificates updated** (automatic with Let's Encrypt/ACM)
5. **Redirect all HTTP to HTTPS** (already configured)
6. **Use secure session cookies** (already configured)

## Troubleshooting

### Certificate Not Working
- Check DNS propagation: `nslookup yourdomain.com`
- Verify certificate: `openssl s_client -connect yourdomain.com:443`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`

### Mixed Content Errors
- Ensure all resources use HTTPS URLs
- Check browser console for specific resources
- Update any hardcoded HTTP URLs to HTTPS

### Redirect Loop
- Check `X-Forwarded-Proto` header is being passed
- Verify `trust proxy` setting in Express
- Check load balancer/proxy configuration