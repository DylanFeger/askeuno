#!/bin/bash

# SSL Setup Script for Ubuntu/Debian servers
# This script automates the SSL certificate setup process

set -e

echo "=== Ask Euno SSL Setup Script ==="
echo

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Get domain name
read -p "Enter your domain name (e.g., example.com): " DOMAIN
read -p "Enter www subdomain? (y/n): " USE_WWW

if [ "$USE_WWW" = "y" ]; then
    DOMAINS="-d $DOMAIN -d www.$DOMAIN"
else
    DOMAINS="-d $DOMAIN"
fi

echo
echo "Setting up SSL for: $DOMAINS"
echo

# Update system
echo "Updating system packages..."
apt update && apt upgrade -y

# Install required packages
echo "Installing Nginx and Certbot..."
apt install -y nginx certbot python3-certbot-nginx

# Create Nginx configuration
echo "Creating Nginx configuration..."
cat > /etc/nginx/sites-available/askeuno << EOF
server {
    listen 80;
    server_name $DOMAIN$([ "$USE_WWW" = "y" ] && echo " www.$DOMAIN");

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/askeuno /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo "Testing Nginx configuration..."
nginx -t

# Restart Nginx
echo "Restarting Nginx..."
systemctl restart nginx
systemctl enable nginx

# Get SSL certificate
echo
echo "Obtaining SSL certificate from Let's Encrypt..."
certbot --nginx $DOMAINS --non-interactive --agree-tos --redirect --staple-ocsp --must-staple

# Setup auto-renewal
echo "Setting up automatic certificate renewal..."
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/bin/certbot renew --quiet") | crontab -

# Create systemd service for the app
echo "Creating systemd service..."
cat > /etc/systemd/system/askeuno.service << EOF
[Unit]
Description=Ask Euno Data Analytics Platform
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/askeuno
ExecStart=/usr/bin/node /home/ubuntu/askeuno/dist/index.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/askeuno/app.log
StandardError=append:/var/log/askeuno/error.log
Environment=NODE_ENV=production
Environment=PORT=5000

[Install]
WantedBy=multi-user.target
EOF

# Create log directory
mkdir -p /var/log/askeuno
chown ubuntu:ubuntu /var/log/askeuno

# Reload systemd
systemctl daemon-reload

echo
echo "=== SSL Setup Complete! ==="
echo
echo "Next steps:"
echo "1. Clone your repository to /home/ubuntu/askeuno"
echo "2. Install dependencies: npm install"
echo "3. Build the application: npm run build"
echo "4. Set up environment variables in /home/ubuntu/askeuno/.env"
echo "5. Start the service: sudo systemctl start askeuno"
echo "6. Enable auto-start: sudo systemctl enable askeuno"
echo
echo "Your site will be available at: https://$DOMAIN"
echo "SSL certificate will auto-renew every 60 days"
echo