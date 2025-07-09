#!/bin/bash

# Acre Deployment Script for Replit
# This script prepares the application for Replit deployment

set -e

echo "🚀 Preparing Acre for Replit Deployment"
echo "======================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this script from the project root."
    exit 1
fi

# Step 1: Check environment variables
echo "1️⃣ Checking environment variables..."
required_vars=("DATABASE_URL" "SESSION_SECRET")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=($var)
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "⚠️  Warning: Missing environment variables: ${missing_vars[*]}"
    echo "   Please add these in Replit Secrets before deployment."
else
    echo "✅ Required environment variables are set"
fi

# Step 2: Install dependencies
echo -e "\n2️⃣ Installing dependencies..."
npm install --production=false

# Step 3: Run database migrations
if [ ! -z "$DATABASE_URL" ]; then
    echo -e "\n3️⃣ Running database migrations..."
    npm run db:push
else
    echo -e "\n⚠️  Skipping database migrations (DATABASE_URL not set)"
fi

# Step 4: Build production assets
echo -e "\n4️⃣ Building production assets..."
NODE_ENV=production npm run build

# Step 5: Verify build
echo -e "\n5️⃣ Verifying build..."
if [ -d "dist" ] && [ -f "dist/index.js" ] && [ -d "dist/public" ]; then
    echo "✅ Build completed successfully"
    echo "   - Backend: dist/index.js"
    echo "   - Frontend: dist/public/"
else
    echo "❌ Build verification failed"
    exit 1
fi

# Step 6: Create/Update .replit file
echo -e "\n6️⃣ Configuring .replit file..."
cat > .replit << 'EOF'
run = "npm start"
entrypoint = "server/index.ts"

[deployment]
run = ["sh", "-c", "npm run build && npm start"]
deploymentTarget = "production"
ignorePorts = false
publicPort = false

[[ports]]
localPort = 5000
externalPort = 80

[env]
NODE_ENV = "production"

[packager]
language = "nodejs-npm"

[languages]
[languages.javascript]
pattern = "**/{*.js,*.jsx,*.ts,*.tsx}"
[languages.javascript.languageServer]
start = "typescript-language-server --stdio"

[gitHubImport]
requiredFiles = [".replit", "replit.nix", "package.json", "package-lock.json"]

[nix]
channel = "stable-23_05"

[unitTest]
language = "nodejs"
EOF

echo "✅ .replit file updated"

# Step 7: Test health endpoint
echo -e "\n7️⃣ Testing health endpoint..."
npm start > /dev/null 2>&1 &
SERVER_PID=$!
sleep 5

if curl -s http://localhost:5000/health | grep -q "healthy"; then
    echo "✅ Health check passed"
else
    echo "⚠️  Health check failed or server not responding"
fi

kill $SERVER_PID 2>/dev/null || true

# Step 8: Final checklist
echo -e "\n📋 Deployment Checklist:"
echo "================================"
echo "✅ Dependencies installed"
echo "✅ Production build completed"
echo "✅ .replit configuration updated"

if [ ${#missing_vars[@]} -eq 0 ]; then
    echo "✅ Environment variables configured"
else
    echo "❌ Configure missing secrets: ${missing_vars[*]}"
fi

if [ ! -z "$DATABASE_URL" ]; then
    echo "✅ Database migrations ready"
else
    echo "⚠️  Database not configured"
fi

echo -e "\n🎯 Next Steps:"
echo "1. Add any missing secrets in Replit Secrets tab"
echo "2. Click 'Deploy' button in Replit"
echo "3. Choose 'Production' deployment"
echo "4. Replit will provide your app URL"

echo -e "\n✨ Deployment preparation complete!"