-- Performance Optimization Migration
-- Additional indexes and optimizations for better query performance

-- =====================================================
-- PARTIAL INDEXES FOR COMMON QUERIES
-- =====================================================

-- Active users index (users who logged in recently)
CREATE INDEX IF NOT EXISTS idx_users_active 
ON users(id) 
WHERE updated_at > CURRENT_TIMESTAMP - INTERVAL '30 days';

-- Recent data sources (last 30 days)
CREATE INDEX IF NOT EXISTS idx_data_sources_recent 
ON data_sources(user_id, created_at DESC) 
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days';

-- Active conversations (last 7 days)
CREATE INDEX IF NOT EXISTS idx_conversations_active 
ON chat_conversations(user_id, updated_at DESC) 
WHERE updated_at > CURRENT_TIMESTAMP - INTERVAL '7 days';

-- =====================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- =====================================================

-- User subscription queries
CREATE INDEX IF NOT EXISTS idx_users_subscription_created 
ON users(subscription_tier, created_at DESC);

-- Data source type and user queries
CREATE INDEX IF NOT EXISTS idx_data_sources_user_type 
ON data_sources(user_id, type, created_at DESC);

-- Conversation message count queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_role_created 
ON chat_messages(conversation_id, role, created_at DESC);

-- =====================================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- =====================================================

-- User statistics materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS user_statistics AS
SELECT 
    u.id as user_id,
    u.username,
    u.subscription_tier,
    u.created_at as user_created_at,
    COUNT(DISTINCT ds.id) as total_data_sources,
    COUNT(DISTINCT cc.id) as total_conversations,
    COUNT(DISTINCT cm.id) as total_messages,
    COUNT(DISTINCT CASE WHEN cm.role = 'user' THEN cm.id END) as user_messages,
    COUNT(DISTINCT CASE WHEN cm.role = 'assistant' THEN cm.id END) as assistant_messages,
    SUM(ds.row_count) as total_data_rows,
    MAX(cm.created_at) as last_activity_at,
    CURRENT_TIMESTAMP as calculated_at
FROM users u
LEFT JOIN data_sources ds ON u.id = ds.user_id
LEFT JOIN chat_conversations cc ON u.id = cc.user_id
LEFT JOIN chat_messages cm ON cc.id = cm.conversation_id
GROUP BY u.id, u.username, u.subscription_tier, u.created_at;

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_statistics_user_id 
ON user_statistics(user_id);

-- Daily usage statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_usage_stats AS
SELECT 
    DATE(cm.created_at) as usage_date,
    u.subscription_tier,
    COUNT(DISTINCT u.id) as active_users,
    COUNT(DISTINCT cm.conversation_id) as active_conversations,
    COUNT(cm.id) as total_messages,
    COUNT(DISTINCT ds.id) as files_uploaded
FROM chat_messages cm
JOIN chat_conversations cc ON cm.conversation_id = cc.id
JOIN users u ON cc.user_id = u.id
LEFT JOIN data_sources ds ON ds.user_id = u.id 
    AND DATE(ds.created_at) = DATE(cm.created_at)
WHERE cm.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(cm.created_at), u.subscription_tier;

-- Index on daily usage
CREATE INDEX IF NOT EXISTS idx_daily_usage_date 
ON daily_usage_stats(usage_date DESC);

-- =====================================================
-- QUERY OPTIMIZATION FUNCTIONS
-- =====================================================

-- Function to get user's recent activity efficiently
CREATE OR REPLACE FUNCTION get_user_recent_activity(
    p_user_id INTEGER,
    p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
    activity_type VARCHAR,
    activity_id INTEGER,
    activity_timestamp TIMESTAMP WITH TIME ZONE,
    details JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'message' as activity_type,
        cm.id as activity_id,
        cm.created_at as activity_timestamp,
        jsonb_build_object(
            'conversation_id', cm.conversation_id,
            'role', cm.role,
            'preview', LEFT(cm.content, 100)
        ) as details
    FROM chat_messages cm
    JOIN chat_conversations cc ON cm.conversation_id = cc.id
    WHERE cc.user_id = p_user_id
        AND cm.created_at > CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL
    
    UNION ALL
    
    SELECT 
        'upload' as activity_type,
        ds.id as activity_id,
        ds.created_at as activity_timestamp,
        jsonb_build_object(
            'name', ds.name,
            'type', ds.type,
            'row_count', ds.row_count
        ) as details
    FROM data_sources ds
    WHERE ds.user_id = p_user_id
        AND ds.created_at > CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL
    
    ORDER BY activity_timestamp DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- REFRESH PROCEDURES FOR MATERIALIZED VIEWS
-- =====================================================

-- Refresh user statistics
CREATE OR REPLACE FUNCTION refresh_user_statistics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_statistics;
END;
$$ LANGUAGE plpgsql;

-- Refresh daily usage stats
CREATE OR REPLACE FUNCTION refresh_daily_usage_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_usage_stats;
END;
$$ LANGUAGE plpgsql;

-- Schedule regular refreshes (requires pg_cron or external scheduler)
-- SELECT cron.schedule('refresh-user-stats', '*/30 * * * *', 'SELECT refresh_user_statistics();');
-- SELECT cron.schedule('refresh-daily-stats', '0 */6 * * *', 'SELECT refresh_daily_usage_stats();');

-- =====================================================
-- TABLE PARTITIONING FOR LARGE TABLES (Future optimization)
-- =====================================================

-- Example: Partition chat_messages by month when table grows large
-- This is commented out but provided as a future optimization path

/*
-- Create partitioned table
CREATE TABLE chat_messages_partitioned (
    LIKE chat_messages INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create partitions for recent months
CREATE TABLE chat_messages_2024_01 PARTITION OF chat_messages_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
    
CREATE TABLE chat_messages_2024_02 PARTITION OF chat_messages_partitioned
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Add trigger to automatically create new partitions
*/

-- Comments
COMMENT ON MATERIALIZED VIEW user_statistics IS 'Pre-calculated user statistics for fast dashboard queries';
COMMENT ON MATERIALIZED VIEW daily_usage_stats IS 'Daily usage metrics aggregated by subscription tier';
COMMENT ON FUNCTION get_user_recent_activity IS 'Efficiently retrieve user activity across multiple tables';