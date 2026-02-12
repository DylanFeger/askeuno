# Ask Euno - Docker Setup Guide

This guide will help you get Ask Euno running locally using Docker for database services.

## Prerequisites

1. **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop)
2. **Node.js 20+** - [Download here](https://nodejs.org/)
3. **OpenAI API Key** - [Get one here](https://platform.openai.com/api-keys)

## Quick Start (5 minutes)

### 1. Start Docker Services

```bash
# Start PostgreSQL and Redis
./scripts/start-docker.sh

# Or manually with docker compose:
docker compose up -d
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp env.example .env

# Generate security keys
ENCRYPTION_KEY=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -base64 32)

# Edit .env and add:
# - Your OpenAI API key
# - The generated ENCRYPTION_KEY
# - The generated SESSION_SECRET
```

### 3. Install Dependencies & Run

```bash
# Install npm packages
npm install

# Push database schema
npm run db:push

# Start development server
npm run dev
```

### 4. Open in Browser

Navigate to: **http://localhost:5000**

---

## Environment Configuration

### Minimum Required Variables

```env
# Database (Docker provides this)
DATABASE_URL=postgresql://euno:euno_dev_password@localhost:5432/euno_db

# Security (generate these)
ENCRYPTION_KEY=<64 hex characters>
SESSION_SECRET=<32+ character string>

# AI Features
OPENAI_API_KEY=sk-your-api-key
```

### Generate Security Keys

```bash
# Generate ENCRYPTION_KEY
openssl rand -hex 32

# Generate SESSION_SECRET
openssl rand -base64 32
```

---

## Docker Services

### PostgreSQL
- **Host**: localhost
- **Port**: 5432
- **Database**: euno_db
- **Username**: euno
- **Password**: euno_dev_password

### Redis
- **Host**: localhost
- **Port**: 6379

---

## Useful Commands

```bash
# Start Docker services
docker compose up -d

# Stop Docker services
docker compose down

# View logs
docker compose logs -f

# View PostgreSQL logs
docker compose logs postgres

# Connect to PostgreSQL
docker compose exec postgres psql -U euno -d euno_db

# Restart services
docker compose restart
```

---

## Troubleshooting

### "Port 5432 already in use"
```bash
# Find what's using the port
lsof -i :5432

# Stop the conflicting service or change the port in docker-compose.yml
```

### "Connection refused" to database
```bash
# Check if Docker is running
docker info

# Check if containers are up
docker compose ps

# Restart containers
docker compose restart
```

### "Permission denied" errors
```bash
# Fix node_modules permissions
rm -rf node_modules
npm install
```

### Database schema issues
```bash
# Push schema again
npm run db:push

# Or reset database
docker compose down -v
docker compose up -d
npm run db:push
```

---

## Development Workflow

1. **Start services**: `./scripts/start-docker.sh`
2. **Run app**: `npm run dev`
3. **Make changes**: Code reloads automatically
4. **Stop services**: `./scripts/stop-docker.sh`

---

## Production Deployment

For production deployment, you'll need to:

1. Use a managed PostgreSQL service (Neon, Supabase, AWS RDS)
2. Configure S3 for file storage (`STORAGE_MODE=s3`)
3. Set up proper environment variables
4. Deploy to your cloud provider (AWS, Vercel, etc.)

See `docs/DEPLOY_TO_PRODUCTION.md` for detailed instructions.
