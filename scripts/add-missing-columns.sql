-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_query_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS query_reset_date TIMESTAMP DEFAULT NOW() NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;