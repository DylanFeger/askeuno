# Ask Euno - Local Development Setup Guide

**Updated**: January 31, 2026  
**Project**: Ask Euno - AI-Powered Data Analytics Platform  
**Status**: ✅ **FULLY PORTABLE** - All Replit dependencies replaced

---

## 🚀 Quick Start (5 minutes)

### Option 1: With Docker (Recommended)

```bash
# 1. Run the initialization script
./scripts/init.sh

# 2. Add your OpenAI API key to .env
# Edit .env and add: OPENAI_API_KEY=sk-your-key

# 3. Start the app
npm run dev

# 4. Open browser
open http://localhost:5000
```

### Option 2: Without Docker

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure environment
cp env.example .env
# Edit .env with your values (especially DATABASE_URL and OPENAI_API_KEY)

# 3. Push database schema
npm run db:push

# 4. Start the app
npm run dev
```

---

## ✅ What's Been Fixed

All Replit-specific code has been replaced with portable alternatives:

| Original (Replit) | Replacement | Status |
|-------------------|-------------|--------|
| Replit Object Storage | Local file storage + S3 support | ✅ Done |
| Replit S3 Sidecar | `storageService.ts` with S3/local modes | ✅ Done |
| Replit Google Sheets Connector | Standard Google OAuth2 | ✅ Done |
| Replit Database | Neon + local PostgreSQL support | ✅ Done |
| Replit Vite Plugins | Optional, gracefully disabled | ✅ Done |

---

## 📋 Environment Variables

### Required (App won't start without these)

```env
# Database
DATABASE_URL=postgresql://euno:euno_dev_password@localhost:5432/euno_db

# Security (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=your_64_character_hex_key

# Security (generate with: openssl rand -base64 32)
SESSION_SECRET=your_32_plus_character_secret

# AI Features
OPENAI_API_KEY=sk-your-openai-api-key
```

### Optional (Feature-specific)

```env
# File Storage (default: local)
STORAGE_MODE=local  # or 's3' for AWS S3
LOCAL_STORAGE_PATH=./uploads

# Lightspeed Integration
LS_CLIENT_ID=your_lightspeed_client_id
LS_CLIENT_SECRET=your_lightspeed_client_secret
LS_REDIRECT_URI=http://localhost:5000/api/oauth/callback/lightspeed

# Google Sheets Integration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Stripe Payments
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Error Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

## 🐳 Docker Setup

### Start Services

```bash
# Start PostgreSQL and Redis
docker compose up -d

# Or use the script
npm run docker:start
```

### Stop Services

```bash
docker compose down

# Or use the script
npm run docker:stop
```

### Connection Details

| Service | Host | Port | Credentials |
|---------|------|------|-------------|
| PostgreSQL | localhost | 5432 | euno / euno_dev_password |
| Redis | localhost | 6379 | (no password) |

---

## 📁 Project Structure

```
AskEunoViaReplit/
├── client/                 # React frontend
├── server/                 # Express backend
│   ├── services/
│   │   ├── localStorageService.ts   # Local file storage
│   │   ├── storageService.ts        # Unified storage interface
│   │   └── googleSheetsConnector.ts # Standard OAuth
│   ├── routes/
│   │   ├── files.ts                 # File serving routes
│   │   └── google-sheets.ts         # Google Sheets OAuth
│   ├── objectStorage.ts             # Portable object storage
│   └── db.ts                        # Supports Neon + local PG
├── docker/                 # Docker initialization scripts
├── scripts/
│   ├── init.sh            # One-time setup
│   ├── dev.sh             # Full dev setup
│   ├── start-docker.sh    # Start Docker services
│   └── stop-docker.sh     # Stop Docker services
├── docker-compose.yml      # PostgreSQL + Redis
├── Dockerfile              # Production container
├── env.example             # Environment template
└── DOCKER_SETUP.md         # Detailed Docker guide
```

---

## 🔧 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:push      # Push database schema
npm run db:studio    # Open Drizzle Studio
npm run docker:start # Start Docker services
npm run docker:stop  # Stop Docker services
npm run init         # Run initialization script
npm run lint         # Run TypeScript checks
```

---

## 🎯 Features Status

| Feature | Status | Notes |
|---------|--------|-------|
| User Authentication | ✅ | Works out of box |
| Database Operations | ✅ | Neon or local PostgreSQL |
| AI Chat | ✅ | Needs `OPENAI_API_KEY` |
| File Uploads | ✅ | Local storage or S3 |
| Lightspeed OAuth | ✅ | Needs OAuth credentials |
| Google Sheets | ✅ | Needs OAuth credentials |
| Stripe Payments | ✅ | Needs Stripe keys |

---

## 🐛 Troubleshooting

### "DATABASE_URL must be set"

1. Make sure `.env` file exists
2. If using Docker: `DATABASE_URL=postgresql://euno:euno_dev_password@localhost:5432/euno_db`

### "ENCRYPTION_KEY must be exactly 64 hex characters"

Generate one:
```bash
openssl rand -hex 32
```

### Port 5000 in use

```bash
# Use different port
PORT=3000 npm run dev

# Or kill existing process
lsof -ti:5000 | xargs kill -9
```

### Docker services not starting

```bash
# Check Docker is running
docker info

# View logs
docker compose logs

# Restart services
docker compose restart
```

---

## 🚀 Deployment

This project is ready for deployment to any cloud provider:

- **AWS Amplify**: Use `amplify.yml` configuration
- **Docker**: Use the included `Dockerfile`
- **Vercel/Railway**: Standard Node.js deployment

See `docs/DEPLOY_TO_PRODUCTION.md` for detailed instructions.

---

**Updated by Cursor AI - January 31, 2026**
