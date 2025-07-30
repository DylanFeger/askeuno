#!/bin/bash

# Euno AWS Deployment Helper Script
# This script helps prepare and deploy Euno to AWS

set -e

echo "🚀 AWS Deployment Helper for Euno"
echo "================================="

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
INSTANCE_TYPE="${INSTANCE_TYPE:-t3.medium}"
KEY_NAME="${KEY_NAME:-euno-key}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Function to check AWS CLI
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI not found. Please install it first.${NC}"
        echo "   Visit: https://aws.amazon.com/cli/"
        exit 1
    fi
    echo -e "${GREEN}✅ AWS CLI found${NC}"
}

# Function to create EC2 deployment package
create_deployment_package() {
    echo -e "\n📦 Creating deployment package..."
    
    # Build the application
    NODE_ENV=production npm run build
    
    # Create deployment directory
    mkdir -p deployment
    
    # Copy necessary files
    cp -r dist deployment/
    cp package*.json deployment/
    cp ecosystem.config.js deployment/
    cp -r scripts deployment/
    
    # Create setup script
    cat > deployment/setup.sh << 'SETUP_SCRIPT'
#!/bin/bash
set -e

echo "🔧 Setting up Euno on EC2..."

# Update system
sudo yum update -y

# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo yum install -y nginx

# Setup application directory
mkdir -p /home/ec2-user/euno
cd /home/ec2-user/euno

# Copy application files
cp -r /tmp/deployment/* .

# Install production dependencies
npm ci --production

# Setup PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup systemd -u ec2-user --hp /home/ec2-user

# Configure Nginx
sudo tee /etc/nginx/conf.d/euno.conf << 'NGINX_CONFIG'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://localhost:5000/health;
        access_log off;
    }
}
NGINX_CONFIG

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

echo "✅ Setup complete!"
SETUP_SCRIPT

    chmod +x deployment/setup.sh
    
    # Create tarball
    tar -czf euno-deployment.tar.gz deployment/
    
    echo -e "${GREEN}✅ Deployment package created: euno-deployment.tar.gz${NC}"
}

# Function to create CloudFormation template
create_cloudformation_template() {
    cat > euno-stack.yaml << 'CF_TEMPLATE'
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Euno Application Stack'

Parameters:
  KeyName:
    Type: AWS::EC2::KeyPair::KeyName
    Description: EC2 Key Pair for SSH access
  
  DatabaseUrl:
    Type: String
    Description: PostgreSQL connection URL
    NoEcho: true
  
  OpenAIKey:
    Type: String
    Description: OpenAI API Key
    NoEcho: true
    Default: ''
  
  SendGridKey:
    Type: String
    Description: SendGrid API Key
    NoEcho: true
    Default: ''

Resources:
  EunoSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for Euno application
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 22
          ToPort: 22
          CidrIp: 0.0.0.0/0  # Restrict this to your IP
        - IpProtocol: tcp
          FromPort: 80
          ToPort: 80
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0

  EunoInstance:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: t3.medium
      ImageId: ami-0c02fb55956c7d316  # Amazon Linux 2023
      KeyName: !Ref KeyName
      SecurityGroups:
        - !Ref EunoSecurityGroup
      UserData:
        Fn::Base64: !Sub |
          #!/bin/bash
          # Set environment variables
          echo "DATABASE_URL=${DatabaseUrl}" >> /etc/environment
          echo "OPENAI_API_KEY=${OpenAIKey}" >> /etc/environment
          echo "SENDGRID_API_KEY=${SendGridKey}" >> /etc/environment
          echo "SESSION_SECRET=$(openssl rand -base64 32)" >> /etc/environment
          echo "NODE_ENV=production" >> /etc/environment
          
          # Install CloudWatch agent
          wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
          sudo rpm -U ./amazon-cloudwatch-agent.rpm
      Tags:
        - Key: Name
          Value: Euno-Backend

  EunoEIP:
    Type: AWS::EC2::EIP
    Properties:
      InstanceId: !Ref EunoInstance

Outputs:
  PublicIP:
    Description: Public IP address of the Euno instance
    Value: !Ref EunoEIP
  
  InstanceId:
    Description: Instance ID
    Value: !Ref EunoInstance
  
  WebURL:
    Description: URL to access Euno
    Value: !Sub 'http://${EunoEIP}'
CF_TEMPLATE

    echo -e "${GREEN}✅ CloudFormation template created: euno-stack.yaml${NC}"
}

# Function to deploy frontend to Amplify
setup_amplify() {
    echo -e "\n🌐 Setting up AWS Amplify for frontend..."
    
    cat > amplify.yml << 'AMPLIFY_CONFIG'
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd client
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: client/dist
    files:
      - '**/*'
  cache:
    paths:
      - client/node_modules/**/*
  customHeaders:
    - pattern: '**/*'
      headers:
        - key: 'X-Frame-Options'
          value: 'SAMEORIGIN'
        - key: 'X-Content-Type-Options'
          value: 'nosniff'
        - key: 'X-XSS-Protection'
          value: '1; mode=block'
        - key: 'Strict-Transport-Security'
          value: 'max-age=31536000; includeSubDomains'

redirects:
  - source: '</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>'
    target: '/index.html'
    status: '200'
AMPLIFY_CONFIG

    echo -e "${GREEN}✅ Amplify configuration created: amplify.yml${NC}"
}

# Main menu
show_menu() {
    echo -e "\n${YELLOW}Choose deployment option:${NC}"
    echo "1) Create EC2 deployment package"
    echo "2) Generate CloudFormation template"
    echo "3) Setup Amplify configuration"
    echo "4) Full AWS deployment guide"
    echo "5) Exit"
    
    read -p "Enter choice [1-5]: " choice
    
    case $choice in
        1)
            create_deployment_package
            ;;
        2)
            create_cloudformation_template
            ;;
        3)
            setup_amplify
            ;;
        4)
            echo -e "\n📚 Full AWS Deployment Steps:"
            echo "================================"
            echo "1. Run option 1 to create deployment package"
            echo "2. Run option 2 to create CloudFormation template"
            echo "3. Deploy stack: aws cloudformation create-stack --stack-name euno-app --template-body file://euno-stack.yaml --parameters file://params.json"
            echo "4. Upload deployment package to S3"
            echo "5. SSH to instance and run setup script"
            echo "6. Configure domain and SSL with Route53 and ACM"
            echo "7. Setup CloudWatch monitoring"
            ;;
        5)
            echo "👋 Goodbye!"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            ;;
    esac
}

# Main execution
check_aws_cli

while true; do
    show_menu
done