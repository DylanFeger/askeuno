-- Initialize Euno Database
-- This script runs automatically when the PostgreSQL container starts

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE euno_db TO euno;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'Euno database initialized successfully';
END $$;
