import { pool } from '../server/db';
import { logger } from '../server/utils/logger';

async function addSubscriptionColumns() {
  try {
    // Add subscription-related columns to users table
    const alterTableQueries = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trial'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'monthly'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_history JSONB DEFAULT '[]'::jsonb`
    ];

    for (const query of alterTableQueries) {
      try {
        await pool.query(query);
        console.log(`✓ Executed: ${query.substring(0, 50)}...`);
      } catch (error: any) {
        if (error.code === '42701') { // Column already exists
          console.log(`- Column already exists: ${query.substring(0, 50)}...`);
        } else {
          throw error;
        }
      }
    }

    // Set initial trial dates for existing users
    await pool.query(`
      UPDATE users 
      SET trial_start_date = created_at,
          trial_end_date = created_at + INTERVAL '30 days'
      WHERE trial_start_date IS NULL
    `);
    console.log('✓ Set trial dates for existing users');

    console.log('\n✅ All subscription columns added successfully!');
  } catch (error) {
    console.error('Error adding subscription columns:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addSubscriptionColumns();