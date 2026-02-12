#!/bin/bash

# ===========================================
# Stop Docker Services
# ===========================================

echo "Stopping Docker services..."
docker compose down

echo "✓ All services stopped"
