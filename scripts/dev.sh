#!/bin/bash

# ===========================================
# Ask Euno - Local Development Script
# ===========================================
# This script sets up and runs the development environment
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}   Ask Euno - Local Development Setup   ${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}Error: Docker is not running${NC}"
    echo "Please start Docker Desktop and try again"
    exit 1
fi

echo -e "${GREEN}✓ Docker is running${NC}"

# Check for .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: .env file not found${NC}"
    echo "Creating .env from env.example..."
    
    if [ -f env.example ]; then
        cp env.example .env
        echo -e "${YELLOW}Please edit .env and add your API keys before continuing${NC}"
        echo ""
        echo "Required variables:"
        echo "  - ENCRYPTION_KEY (generate with: openssl rand -hex 32)"
        echo "  - SESSION_SECRET (generate with: openssl rand -base64 32)"
        echo "  - OPENAI_API_KEY (from https://platform.openai.com)"
        echo ""
        read -p "Press Enter after editing .env to continue..."
    else
        echo -e "${RED}Error: env.example not found${NC}"
        exit 1
    fi
fi

# Generate security keys if not set
source .env 2>/dev/null || true

if [ -z "$ENCRYPTION_KEY" ] || [ "$ENCRYPTION_KEY" == "your_64_character_hex_encryption_key_here_generate_with_openssl" ]; then
    echo -e "${YELLOW}Generating ENCRYPTION_KEY...${NC}"
    NEW_KEY=$(openssl rand -hex 32)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$NEW_KEY/" .env
    else
        sed -i "s/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$NEW_KEY/" .env
    fi
    echo -e "${GREEN}✓ ENCRYPTION_KEY generated${NC}"
fi

if [ -z "$SESSION_SECRET" ] || [ "$SESSION_SECRET" == "your_session_secret_at_least_32_characters_here" ]; then
    echo -e "${YELLOW}Generating SESSION_SECRET...${NC}"
    NEW_SECRET=$(openssl rand -base64 32 | tr -d '\n')
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/SESSION_SECRET=.*/SESSION_SECRET=$NEW_SECRET/" .env
    else
        sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=$NEW_SECRET/" .env
    fi
    echo -e "${GREEN}✓ SESSION_SECRET generated${NC}"
fi

# Start Docker services
echo ""
echo -e "${BLUE}Starting Docker services (PostgreSQL, Redis)...${NC}"
docker compose up -d

# Wait for PostgreSQL to be ready
echo ""
echo -e "${BLUE}Waiting for PostgreSQL to be ready...${NC}"
max_attempts=30
attempt=0
while ! docker compose exec -T postgres pg_isready -U euno -d euno_db &>/dev/null; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
        echo -e "${RED}Error: PostgreSQL did not become ready in time${NC}"
        exit 1
    fi
    echo -n "."
    sleep 1
done
echo ""
echo -e "${GREEN}✓ PostgreSQL is ready${NC}"

# Install npm dependencies if needed
if [ ! -d "node_modules" ]; then
    echo ""
    echo -e "${BLUE}Installing npm dependencies...${NC}"
    npm install
fi

# Run database migrations
echo ""
echo -e "${BLUE}Running database migrations...${NC}"
npm run db:push 2>/dev/null || echo -e "${YELLOW}Note: Database schema may already be up to date${NC}"

# Create uploads directory
mkdir -p uploads/public uploads/private

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}   Development Environment Ready!       ${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Services running:"
echo "  - PostgreSQL: localhost:5432 (euno/euno_dev_password)"
echo "  - Redis: localhost:6379"
echo ""
echo -e "Run ${YELLOW}npm run dev${NC} to start the application"
echo -e "Then open ${BLUE}http://localhost:5000${NC} in your browser"
echo ""
echo "Useful commands:"
echo "  npm run dev          - Start development server"
echo "  npm run build        - Build for production"
echo "  docker compose down  - Stop all Docker services"
echo "  docker compose logs  - View Docker logs"
echo ""
