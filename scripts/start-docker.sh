#!/bin/bash

# ===========================================
# Quick Start - Docker Services Only
# ===========================================
# Start PostgreSQL and Redis for development
# ===========================================

set -e

echo "Starting Docker services..."

# Start services
docker compose up -d

# Wait for PostgreSQL
echo "Waiting for PostgreSQL..."
sleep 3

while ! docker compose exec -T postgres pg_isready -U euno -d euno_db &>/dev/null; do
    echo "Waiting for PostgreSQL to be ready..."
    sleep 2
done

echo ""
echo "✓ PostgreSQL is running on localhost:5432"
echo "✓ Redis is running on localhost:6379"
echo ""
echo "Database connection string:"
echo "  postgresql://euno:euno_dev_password@localhost:5432/euno_db"
echo ""
echo "Run 'npm run dev' to start the application"
