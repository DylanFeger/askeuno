#!/usr/bin/env tsx
/**
 * Migration Validation Script
 * 
 * Validates that all migrations have been applied and the database schema
 * matches the expected schema defined in shared/schema.ts
 * 
 * Usage:
 *   npm run db:validate
 *   or
 *   tsx scripts/db/validate-migrations.ts
 */

import { db } from '../../server/db';
import { sql } from 'drizzle-orm';
import { logger } from '../../server/utils/logger';
import * as schema from '../../shared/schema';

interface MigrationStatus {
  name: string;
  applied: boolean;
  appliedAt?: Date;
}

interface TableInfo {
  tableName: string;
  exists: boolean;
  columnCount?: number;
  indexCount?: number;
}

/**
 * Check if drizzle migrations table exists
 */
async function checkMigrationsTable(): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '__drizzle_migrations'
      );
    `);
    return (result.rows[0] as any)?.exists || false;
  } catch (error) {
    logger.error('Error checking migrations table', { error });
    return false;
  }
}

/**
 * Get list of applied migrations
 */
async function getAppliedMigrations(): Promise<MigrationStatus[]> {
  const migrationsTableExists = await checkMigrationsTable();
  
  if (!migrationsTableExists) {
    logger.warn('Migrations table does not exist. Database may not be initialized.');
    return [];
  }

  try {
    const result = await db.execute(sql`
      SELECT id, hash, created_at 
      FROM __drizzle_migrations 
      ORDER BY created_at ASC;
    `);
    
    return result.rows.map((row: any) => ({
      name: row.id || 'unknown',
      applied: true,
      appliedAt: row.created_at,
    }));
  } catch (error) {
    logger.error('Error fetching applied migrations', { error });
    return [];
  }
}

/**
 * Get expected tables from schema
 */
function getExpectedTables(): string[] {
  return [
    'users',
    'data_sources',
    'chat_conversations',
    'chat_messages',
    'message_feedback',
    'query_timestamps',
    'data_rows',
    'dashboards',
    'alerts',
    'blog_posts',
    'connection_manager',
    'team_invitations',
    'conversation_data_sources',
  ];
}

/**
 * Check if a table exists and get its info
 */
async function checkTable(tableName: string): Promise<TableInfo> {
  try {
    // Check if table exists
    const existsResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      );
    `);
    
    const exists = (existsResult.rows[0] as any)?.exists || false;
    
    if (!exists) {
      return { tableName, exists: false };
    }

    // Get column count
    const columnResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = ${tableName};
    `);
    const columnCount = parseInt((columnResult.rows[0] as any)?.count || '0');

    // Get index count
    const indexResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM pg_indexes
      WHERE schemaname = 'public' 
      AND tablename = ${tableName};
    `);
    const indexCount = parseInt((indexResult.rows[0] as any)?.count || '0');

    return {
      tableName,
      exists: true,
      columnCount,
      indexCount,
    };
  } catch (error) {
    logger.error(`Error checking table ${tableName}`, { error, tableName });
    return { tableName, exists: false };
  }
}

/**
 * Validate foreign key constraints
 */
async function validateForeignKeys(): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
  try {
    // Check key foreign key relationships
    const fkChecks = [
      { table: 'data_sources', column: 'user_id', refTable: 'users', refColumn: 'id' },
      { table: 'chat_conversations', column: 'user_id', refTable: 'users', refColumn: 'id' },
      { table: 'chat_conversations', column: 'data_source_id', refTable: 'data_sources', refColumn: 'id' },
      { table: 'chat_messages', column: 'conversation_id', refTable: 'chat_conversations', refColumn: 'id' },
      { table: 'message_feedback', column: 'message_id', refTable: 'chat_messages', refColumn: 'id' },
      { table: 'message_feedback', column: 'user_id', refTable: 'users', refColumn: 'id' },
      { table: 'query_timestamps', column: 'user_id', refTable: 'users', refColumn: 'id' },
      { table: 'data_rows', column: 'data_source_id', refTable: 'data_sources', refColumn: 'id' },
      { table: 'dashboards', column: 'user_id', refTable: 'users', refColumn: 'id' },
      { table: 'alerts', column: 'user_id', refTable: 'users', refColumn: 'id' },
      { table: 'alerts', column: 'data_source_id', refTable: 'data_sources', refColumn: 'id' },
      { table: 'connection_manager', column: 'user_id', refTable: 'users', refColumn: 'id' },
      { table: 'team_invitations', column: 'inviter_id', refTable: 'users', refColumn: 'id' },
      { table: 'team_invitations', column: 'accepted_user_id', refTable: 'users', refColumn: 'id' },
      { table: 'conversation_data_sources', column: 'conversation_id', refTable: 'chat_conversations', refColumn: 'id' },
      { table: 'conversation_data_sources', column: 'data_source_id', refTable: 'data_sources', refColumn: 'id' },
    ];

    for (const fk of fkChecks) {
      const result = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = ${fk.table}
          AND kcu.column_name = ${fk.column}
          AND ccu.table_name = ${fk.refTable}
          AND ccu.column_name = ${fk.refColumn};
      `);
      
      const count = parseInt((result.rows[0] as any)?.count || '0');
      if (count === 0) {
        errors.push(
          `Missing foreign key: ${fk.table}.${fk.column} -> ${fk.refTable}.${fk.refColumn}`
        );
      }
    }
  } catch (error) {
    errors.push(`Error validating foreign keys: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate indexes
 */
async function validateIndexes(): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check for expected indexes
    const expectedIndexes = [
      { table: 'users', index: 'users_username_unique' },
      { table: 'users', index: 'users_email_unique' },
      { table: 'users', index: 'users_api_token_unique' },
      { table: 'message_feedback', index: 'unique_user_message_feedback' },
      { table: 'query_timestamps', index: 'user_timestamp_idx' },
    ];

    for (const expected of expectedIndexes) {
      const result = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = ${expected.table}
          AND indexname = ${expected.index};
      `);

      const count = parseInt((result.rows[0] as any)?.count || '0');
      if (count === 0) {
        errors.push(`Missing index: ${expected.table}.${expected.index}`);
      }
    }

    // Check for tables without indexes (warning)
    const tablesWithoutIndexes = await db.execute(sql`
      SELECT t.tablename
      FROM pg_tables t
      LEFT JOIN pg_indexes i ON t.tablename = i.tablename
      WHERE t.schemaname = 'public'
        AND i.indexname IS NULL
        AND t.tablename NOT LIKE '__drizzle%'
      GROUP BY t.tablename;
    `);

    if (tablesWithoutIndexes.rows.length > 0) {
      warnings.push(
        `Tables without indexes: ${tablesWithoutIndexes.rows.map((r: any) => r.tablename).join(', ')}`
      );
    }
  } catch (error) {
    errors.push(`Error validating indexes: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Main validation function
 */
async function validateMigrations(): Promise<{
  success: boolean;
  summary: {
    migrations: MigrationStatus[];
    tables: TableInfo[];
    foreignKeys: { valid: boolean; errors: string[] };
    indexes: { valid: boolean; errors: string[]; warnings: string[] };
  };
}> {
  logger.info('Starting migration validation...');

  // Check migrations
  const appliedMigrations = await getAppliedMigrations();
  logger.info(`Found ${appliedMigrations.length} applied migrations`);

  // Check tables
  const expectedTables = getExpectedTables();
  const tableChecks = await Promise.all(
    expectedTables.map(table => checkTable(table))
  );

  const missingTables = tableChecks.filter(t => !t.exists);
  if (missingTables.length > 0) {
    logger.error(`Missing tables: ${missingTables.map(t => t.tableName).join(', ')}`);
  }

  // Validate foreign keys
  const fkValidation = await validateForeignKeys();
  if (!fkValidation.valid) {
    logger.error('Foreign key validation failed', { errors: fkValidation.errors });
  }

  // Validate indexes
  const indexValidation = await validateIndexes();
  if (!indexValidation.valid) {
    logger.error('Index validation failed', { errors: indexValidation.errors });
  }
  if (indexValidation.warnings.length > 0) {
    logger.warn('Index warnings', { warnings: indexValidation.warnings });
  }

  const success = 
    missingTables.length === 0 &&
    fkValidation.valid &&
    indexValidation.valid;

  return {
    success,
    summary: {
      migrations: appliedMigrations,
      tables: tableChecks,
      foreignKeys: fkValidation,
      indexes: indexValidation,
    },
  };
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateMigrations()
    .then((result) => {
      console.log('\n=== Migration Validation Results ===\n');
      console.log(`Status: ${result.success ? '✅ PASSED' : '❌ FAILED'}\n`);
      
      console.log('Applied Migrations:');
      result.summary.migrations.forEach(m => {
        console.log(`  ${m.applied ? '✅' : '❌'} ${m.name}${m.appliedAt ? ` (${m.appliedAt})` : ''}`);
      });
      
      console.log('\nTables:');
      result.summary.tables.forEach(t => {
        if (t.exists) {
          console.log(`  ✅ ${t.tableName} (${t.columnCount} columns, ${t.indexCount} indexes)`);
        } else {
          console.log(`  ❌ ${t.tableName} - MISSING`);
        }
      });
      
      if (result.summary.foreignKeys.errors.length > 0) {
        console.log('\nForeign Key Errors:');
        result.summary.foreignKeys.errors.forEach(e => console.log(`  ❌ ${e}`));
      }
      
      if (result.summary.indexes.errors.length > 0) {
        console.log('\nIndex Errors:');
        result.summary.indexes.errors.forEach(e => console.log(`  ❌ ${e}`));
      }
      
      if (result.summary.indexes.warnings.length > 0) {
        console.log('\nIndex Warnings:');
        result.summary.indexes.warnings.forEach(w => console.log(`  ⚠️  ${w}`));
      }
      
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      logger.error('Validation failed with error', { error });
      console.error('Validation failed:', error);
      process.exit(1);
    });
}

export { validateMigrations, getAppliedMigrations, checkTable, validateForeignKeys, validateIndexes };
