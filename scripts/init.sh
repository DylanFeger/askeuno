#!/bin/bash

# ===========================================
# Ask Euno - Initialize Project
# ===========================================
# One-time setup script for new developers
# ===========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════╗"
echo "║     Ask Euno - Project Initialization  ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "  Please install Node.js 20+ from https://nodejs.org/"
    exit 1
fi
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${YELLOW}⚠ Node.js version 20+ recommended (found v$NODE_VERSION)${NC}"
else
    echo -e "${GREEN}✓ Node.js $(node -v)${NC}"
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm -v)${NC}"

# Check Docker
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker installed${NC}"
    DOCKER_AVAILABLE=true
else
    echo -e "${YELLOW}⚠ Docker not found (optional for local database)${NC}"
    DOCKER_AVAILABLE=false
fi

# Create .env if it doesn't exist
echo ""
echo -e "${BLUE}Setting up environment...${NC}"

if [ ! -f .env ]; then
    if [ -f env.example ]; then
        cp env.example .env
        echo -e "${GREEN}✓ Created .env from env.example${NC}"
    else
        echo -e "${RED}✗ env.example not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ .env already exists${NC}"
fi

# Generate security keys
echo ""
echo -e "${BLUE}Generating security keys...${NC}"

# Check if ENCRYPTION_KEY needs to be generated
if grep -q "ENCRYPTION_KEY=$" .env || grep -q "ENCRYPTION_KEY=your_64" .env; then
    NEW_KEY=$(openssl rand -hex 32)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$NEW_KEY|" .env
    else
        sed -i "s|ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$NEW_KEY|" .env
    fi
    echo -e "${GREEN}✓ Generated ENCRYPTION_KEY${NC}"
else
    echo -e "${GREEN}✓ ENCRYPTION_KEY already set${NC}"
fi

# Check if SESSION_SECRET needs to be generated
if grep -q "SESSION_SECRET=$" .env || grep -q "SESSION_SECRET=your_session" .env; then
    NEW_SECRET=$(openssl rand -base64 32 | tr -d '\n' | tr '/' '_')
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|SESSION_SECRET=.*|SESSION_SECRET=$NEW_SECRET|" .env
    else
        sed -i "s|SESSION_SECRET=.*|SESSION_SECRET=$NEW_SECRET|" .env
    fi
    echo -e "${GREEN}✓ Generated SESSION_SECRET${NC}"
else
    echo -e "${GREEN}✓ SESSION_SECRET already set${NC}"
fi

# Install dependencies
echo ""
echo -e "${BLUE}Installing npm dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Create directories
echo ""
echo -e "${BLUE}Creating directories...${NC}"
mkdir -p uploads/public uploads/private logs
echo -e "${GREEN}✓ Created uploads and logs directories${NC}"

# Start Docker if available
if [ "$DOCKER_AVAILABLE" = true ]; then
    echo ""
    read -p "Start Docker services (PostgreSQL, Redis)? [Y/n] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
        echo -e "${BLUE}Starting Docker services...${NC}"
        docker compose up -d
        
        # Wait for PostgreSQL
        echo "Waiting for PostgreSQL..."
        sleep 3
        max_attempts=30
        attempt=0
        while ! docker compose exec -T postgres pg_isready -U euno -d euno_db &>/dev/null; do
            attempt=$((attempt + 1))
            if [ $attempt -ge $max_attempts ]; then
                echo -e "${RED}PostgreSQL did not start in time${NC}"
                break
            fi
            sleep 1
        done
        
        if [ $attempt -lt $max_attempts ]; then
            echo -e "${GREEN}✓ Docker services running${NC}"
            
            # Run migrations
            echo ""
            echo -e "${BLUE}Running database migrations...${NC}"
            npm run db:push 2>/dev/null && echo -e "${GREEN}✓ Database schema updated${NC}" || echo -e "${YELLOW}⚠ Migration may have issues${NC}"
        fi
    fi
fi

# Final summary
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Initialization Complete!           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo "Next steps:"
echo ""
echo -e "  1. ${YELLOW}Edit .env${NC} and add your OPENAI_API_KEY"
echo "     Get one at: https://platform.openai.com/api-keys"
echo ""
echo -e "  2. ${YELLOW}npm run dev${NC} to start the development server"
echo ""
echo -e "  3. Open ${BLUE}http://localhost:5000${NC} in your browser"
echo ""

if [ "$DOCKER_AVAILABLE" = false ]; then
    echo -e "${YELLOW}Note: Set DATABASE_URL in .env to your PostgreSQL server${NC}"
    echo ""
fi
