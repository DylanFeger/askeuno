# Database Migration Guide

This directory contains PostgreSQL migration scripts for the Euno data platform.

## Migration Files

1. **001_initial_schema.sql** - Core tables and indexes
   - User authentication tables
   - File metadata storage
   - Conversation history
   - Basic indexes for query optimization

2. **002_security_audit.sql** - Security and audit logging
   - Login attempt tracking
   - Security event logging
   - Rate limit tracking
   - Cleanup procedures

3. **003_performance_optimizations.sql** - Advanced performance features
   - Partial indexes for common queries
   - Composite indexes for complex queries
   - Materialized views for analytics
   - Query optimization functions

## Running Migrations

### Option 1: Using Drizzle (Recommended for Development)

The application uses Drizzle ORM which can automatically sync the schema:

```bash
npm run db:push
```

### Option 2: Manual SQL Execution

For production or when you need more control:

```bash
# Connect to your PostgreSQL database
psql $DATABASE_URL

# Run migrations in order
\i migrations/001_initial_schema.sql
\i migrations/002_security_audit.sql
\i migrations/003_performance_optimizations.sql
```

### Option 3: Using a Migration Tool

If using a migration tool like Flyway or migrate:

```bash
# Example with psql
cat migrations/*.sql | psql $DATABASE_URL
```

## Important Notes

### Index Strategy

The indexes are designed to optimize common query patterns:

- **Authentication**: Fast lookups by username/email
- **User Content**: Efficient retrieval of user's data sources and conversations
- **Time-based Queries**: Optimized for recent activity queries
- **JSONB Queries**: GIN indexes for fast JSON searches

### Materialized Views

The materialized views need periodic refresh:

```sql
-- Refresh user statistics (every 30 minutes)
SELECT refresh_user_statistics();

-- Refresh daily usage stats (every 6 hours)
SELECT refresh_daily_usage_stats();
```

Consider setting up pg_cron or a scheduled job for automatic refreshes.

### Performance Considerations

1. **Partial Indexes**: Reduce index size by filtering to active data
2. **Composite Indexes**: Cover common multi-column queries
3. **JSONB Indexes**: Use GIN for flexible JSON queries
4. **Materialized Views**: Pre-calculate expensive aggregations

### Security Tables

The security audit tables help with:
- Monitoring failed login attempts
- Tracking security events
- Enforcing rate limits
- Maintaining audit trails

Set up regular cleanup to prevent these tables from growing too large:

```sql
-- Clean up old data
SELECT cleanup_old_login_attempts();  -- Removes > 90 days
SELECT cleanup_old_security_events(); -- Removes > 180 days
SELECT cleanup_expired_rate_limits(); -- Removes expired windows
```

## Monitoring Queries

### Check Index Usage

```sql
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Find Slow Queries

```sql
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
WHERE mean_time > 100  -- queries taking > 100ms
ORDER BY mean_time DESC
LIMIT 20;
```

### Table Sizes

```sql
SELECT
    relname AS table_name,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
    pg_size_pretty(pg_relation_size(relid)) AS table_size,
    pg_size_pretty(pg_indexes_size(relid)) AS indexes_size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

## Backup Strategy

Before running migrations in production:

1. **Backup the database**:
   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Test migrations** on a staging environment first

3. **Have a rollback plan** ready

## Future Optimizations

As the application scales, consider:

1. **Table Partitioning**: For chat_messages and data_rows tables
2. **Read Replicas**: For analytics queries
3. **Connection Pooling**: PgBouncer for high connection counts
4. **Caching Layer**: Redis for frequently accessed data
5. **Full-Text Search**: PostgreSQL FTS for message search