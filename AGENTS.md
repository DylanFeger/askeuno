# AGENTS.md

## Cursor Cloud specific instructions

### Overview
Ask Euno is a fullstack TypeScript application: React (Vite) frontend + Express backend, served together on port 5000. PostgreSQL 16 and Redis 7 run via Docker Compose.

### Starting services
1. **Docker services** (PostgreSQL + Redis): `sudo docker compose up -d` (wait for pg_isready before proceeding)
2. **Database migrations**: `npm run db:push` (Drizzle ORM push, idempotent)
3. **Dev server**: `npm run dev` — serves both backend API and Vite-dev frontend on `http://localhost:5000`

### Key gotchas
- The Docker daemon must be started manually in the cloud VM: `sudo dockerd &>/tmp/dockerd.log &` then wait ~3 seconds. Docker is configured with `fuse-overlayfs` storage driver and `iptables-legacy` for the nested container environment.
- Environment variables are validated at startup (`server/config/env.ts`). Required: `DATABASE_URL`, `SESSION_SECRET`, `ENCRYPTION_KEY` (64 hex chars), `NODE_ENV`. The `.env` file is created from `env.example`; security keys are generated with `openssl rand`.
- `npm run lint` (`tsc --noEmit`) reports many pre-existing type errors. The project compiles and runs fine via `tsx` (which skips type-checking). Do not treat these errors as blockers.
- Sentry DSN in `env.example` is a placeholder; the startup warning about invalid Sentry DSN is expected and harmless.
- The app uses `connect-pg-simple` for sessions, creating a `user_sessions` table automatically.
- Available npm scripts are documented in `LOCAL_DEVELOPMENT_SETUP.md` under "Available Scripts".

### Database
- Connection string: `postgresql://euno:euno_dev_password@localhost:5432/euno_db`
- Docker Compose file defines both `postgres` (port 5432) and `redis` (port 6379) services.
