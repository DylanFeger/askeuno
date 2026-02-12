# Production Database Migrations Guide

## Overview

This guide explains how to run database migrations in your production environment.

---

## Quick Start

### Option 1: From Local Machine (Recommended)

```bash
# Set production DATABASE_URL temporarily
export DATABASE_URL="your-production-database-url"

# Run migrations
npm run db:push

# Verify
npm run db:studio  # Opens Drizzle Studio to verify schema
```

**⚠️ Security**: Make sure you're on a secure network and don't commit production credentials.

---

### Option 2: From AWS CloudShell

1. Go to: https://console.aws.amazon.com/cloudshell/
2. Clone your repository:
   ```bash
   git clone https://github.com/your-username/AskEunoViaReplit.git
   cd AskEunoViaReplit
   ```
3. Install Node.js:
   ```bash
   curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
   sudo yum install -y nodejs
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Set DATABASE_URL:
   ```bash
   export DATABASE_URL="your-production-database-url"
   ```
6. Run migrations:
   ```bash
   npm run db:push
   ```

---

### Option 3: Add to Build Process (Advanced)

**⚠️ Only do this if migrations are idempotent (safe to run multiple times)**

Update `amplify.yml`:

```yaml
preBuild:
  commands:
    - npm ci
    - npm run db:push  # Run migrations
```

**Note**: This runs migrations on every build. Only use if your migrations are safe to re-run.

---

## Migration Commands

### Push Schema Changes
```bash
npm run db:push
```

This will:
- Compare your schema with the database
- Create missing tables
- Add missing columns
- **WARNING**: Does NOT drop columns or tables (safe)

### Generate Migration Files
```bash
npm run db:generate
```

Creates migration files in `migrations/` directory.

### View Database Schema
```bash
npm run db:studio
```

Opens Drizzle Studio in your browser to view/edit database.

---

## Pre-Migration Checklist

Before running migrations in production:

- [ ] **Backup database** (critical!)
- [ ] **Test migrations locally** with production schema
- [ ] **Review changes** - understand what will change
- [ ] **Schedule maintenance window** if needed
- [ ] **Have rollback plan** ready

---

## Database Backup

### Before Migrations

**Neon**:
- Automatic backups included
- Can restore from console

**Supabase**:
- Automatic backups included
- Can restore from dashboard

**AWS RDS**:
```bash
# Create manual snapshot
aws rds create-db-snapshot \
    --db-instance-identifier your-db-instance \
    --db-snapshot-identifier pre-migration-$(date +%Y%m%d)
```

**Manual Backup**:
```bash
# Using pg_dump
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Compress
gzip backup-$(date +%Y%m%d).sql
```

---

## Verification

After running migrations:

1. **Check tables exist**:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

2. **Check columns**:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'users';
   ```

3. **Test application**:
   - Sign up a test user
   - Create a data source
   - Test file upload
   - Test AI chat

---

## Troubleshooting

### "Relation already exists"
- This is normal - migrations are idempotent
- The migration will skip existing tables

### "Permission denied"
- Check database user has CREATE/ALTER permissions
- Verify DATABASE_URL is correct

### "Connection timeout"
- Check database firewall allows your IP
- Verify DATABASE_URL includes correct host/port
- Check database is running

### "Migration failed"
- Check error message
- Restore from backup if needed
- Fix issue and retry

---

## Best Practices

1. **Always backup first**
2. **Test locally** with production schema copy
3. **Run during low-traffic hours**
4. **Monitor application** after migration
5. **Have rollback plan** ready
6. **Document changes** in commit messages

---

## Rollback Plan

If migration fails:

1. **Stop application** (prevent data corruption)
2. **Restore from backup**
3. **Fix migration issue**
4. **Test locally**
5. **Re-run migration**

---

**Last Updated**: January 31, 2026
