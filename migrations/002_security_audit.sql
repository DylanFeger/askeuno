-- Security Audit Tables Migration
-- Additional tables for comprehensive security logging and monitoring

-- =====================================================
-- SECURITY AUDIT TABLES
-- =====================================================

-- Login attempts tracking
CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    ip_address INET NOT NULL,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(100),
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Security events logging
CREATE TABLE IF NOT EXISTS security_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- API rate limit tracking
CREATE TABLE IF NOT EXISTS rate_limit_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    ip_address INET,
    endpoint VARCHAR(255) NOT NULL,
    request_count INTEGER DEFAULT 1 NOT NULL,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    window_end TIMESTAMP WITH TIME ZONE NOT NULL
);

-- =====================================================
-- SECURITY INDEXES
-- =====================================================

-- Login attempts indexes
CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts(username);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON login_attempts(attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_success ON login_attempts(success);

-- Security events indexes
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address);

-- Rate limit indexes
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_id ON rate_limit_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_ip ON rate_limit_tracking(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limit_endpoint ON rate_limit_tracking(endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON rate_limit_tracking(window_end);

-- =====================================================
-- CLEANUP PROCEDURES
-- =====================================================

-- Function to clean up old login attempts
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS void AS $$
BEGIN
    DELETE FROM login_attempts 
    WHERE attempted_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old security events
CREATE OR REPLACE FUNCTION cleanup_old_security_events()
RETURNS void AS $$
BEGIN
    DELETE FROM security_events 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '180 days';
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired rate limit windows
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM rate_limit_tracking 
    WHERE window_end < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Schedule periodic cleanup (requires pg_cron extension or external scheduler)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('cleanup-login-attempts', '0 2 * * *', 'SELECT cleanup_old_login_attempts();');
-- SELECT cron.schedule('cleanup-security-events', '0 3 * * 0', 'SELECT cleanup_old_security_events();');
-- SELECT cron.schedule('cleanup-rate-limits', '*/15 * * * *', 'SELECT cleanup_expired_rate_limits();');

-- Comments for documentation
COMMENT ON TABLE login_attempts IS 'Tracks all login attempts for security monitoring';
COMMENT ON TABLE security_events IS 'Comprehensive security event logging for audit trails';
COMMENT ON TABLE rate_limit_tracking IS 'Tracks API rate limits per user and IP address';