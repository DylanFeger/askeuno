-- Ask Euno Database Schema Migration
-- PostgreSQL migration script for initial setup
-- Run this script to create all necessary tables and indexes

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USER AUTHENTICATION & ROLES
-- =====================================================

-- Users table for authentication and profile data
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    subscription_tier VARCHAR(50) DEFAULT 'starter' NOT NULL CHECK (subscription_tier IN ('starter', 'professional', 'enterprise')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Session storage table (created automatically by connect-pg-simple)
-- This is managed by the session middleware
CREATE TABLE IF NOT EXISTS user_sessions (
    sid VARCHAR NOT NULL COLLATE "default",
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (sid)
);

-- =====================================================
-- FILE METADATA STORAGE
-- =====================================================

-- Data sources table for uploaded file metadata
CREATE TABLE IF NOT EXISTS data_sources (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('csv', 'xlsx', 'xls', 'json')),
    file_path VARCHAR(500) NOT NULL,
    schema JSONB,
    row_count INTEGER DEFAULT 0 NOT NULL,
    last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Data rows table for storing processed data from files
CREATE TABLE IF NOT EXISTS data_rows (
    id SERIAL PRIMARY KEY,
    data_source_id INTEGER NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =====================================================
-- CONVERSATION HISTORY
-- =====================================================

-- Chat conversations table
CREATE TABLE IF NOT EXISTS chat_conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =====================================================
-- INDEXES FOR QUERY OPTIMIZATION
-- =====================================================

-- User authentication indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Session index
CREATE INDEX IF NOT EXISTS idx_sessions_expire ON user_sessions(expire);

-- Data sources indexes
CREATE INDEX IF NOT EXISTS idx_data_sources_user_id ON data_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_type ON data_sources(type);
CREATE INDEX IF NOT EXISTS idx_data_sources_created_at ON data_sources(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_sources_user_created ON data_sources(user_id, created_at DESC);

-- Data rows indexes
CREATE INDEX IF NOT EXISTS idx_data_rows_data_source_id ON data_rows(data_source_id);
CREATE INDEX IF NOT EXISTS idx_data_rows_created_at ON data_rows(created_at DESC);
-- GIN index for JSONB data queries
CREATE INDEX IF NOT EXISTS idx_data_rows_data_gin ON data_rows USING GIN(data);

-- Chat conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON chat_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON chat_conversations(user_id, updated_at DESC);

-- Chat messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON chat_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_role ON chat_messages(role);
-- GIN index for metadata queries
CREATE INDEX IF NOT EXISTS idx_messages_metadata_gin ON chat_messages USING GIN(metadata);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_sources_updated_at BEFORE UPDATE ON data_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON chat_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INITIAL DATA AND CONSTRAINTS
-- =====================================================

-- Add comments for documentation
COMMENT ON TABLE users IS 'User accounts with authentication credentials and subscription information';
COMMENT ON TABLE data_sources IS 'Metadata for uploaded files including CSV, Excel, and JSON';
COMMENT ON TABLE data_rows IS 'Structured data extracted from uploaded files stored as JSONB';
COMMENT ON TABLE chat_conversations IS 'AI chat conversation sessions per user';
COMMENT ON TABLE chat_messages IS 'Individual messages within chat conversations';

COMMENT ON COLUMN users.subscription_tier IS 'User subscription level: starter ($19), professional ($49), or enterprise ($99)';
COMMENT ON COLUMN data_sources.schema IS 'Detected schema information for the data source';
COMMENT ON COLUMN chat_messages.metadata IS 'Additional message data like confidence scores and suggested follow-ups';

-- =====================================================
-- PERFORMANCE ANALYSIS VIEWS (Optional)
-- =====================================================

-- View for user activity summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
    u.id,
    u.username,
    u.subscription_tier,
    COUNT(DISTINCT ds.id) as data_source_count,
    COUNT(DISTINCT cc.id) as conversation_count,
    COUNT(DISTINCT cm.id) as message_count,
    MAX(cm.created_at) as last_activity
FROM users u
LEFT JOIN data_sources ds ON u.id = ds.user_id
LEFT JOIN chat_conversations cc ON u.id = cc.user_id
LEFT JOIN chat_messages cm ON cc.id = cm.conversation_id
GROUP BY u.id, u.username, u.subscription_tier;

-- Grant appropriate permissions (adjust based on your database users)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;