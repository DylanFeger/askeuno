#!/usr/bin/env tsx
/**
 * Schema Validation Script
 * 
 * Validates that the database schema matches the Drizzle schema definition
 * by comparing actual database structure with expected schema from shared/schema.ts
 * 
 * Usage:
 *   npm run db:validate-schema
 *   or
 *   tsx scripts/db/validate-schema.ts
 */

import { db } from '../../server/db';
import { sql } from 'drizzle-orm';
import { logger } from '../../server/utils/logger';
import * as schema from '../../shared/schema';

interface ColumnInfo {
  columnName: string;
  dataType: string;
  isNullable: string;
  defaultValue: string | null;
  isUnique: boolean;
  isPrimaryKey: boolean;
}

interface IndexInfo {
  indexName: string;
  columns: string[];
  isUnique: boolean;
}

interface TableSchema {
  tableName: string;
  columns: ColumnInfo[];
  indexes: IndexInfo[];
  foreignKeys: ForeignKeyInfo[];
}

interface ForeignKeyInfo {
  constraintName: string;
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete: string;
}

/**
 * Get actual table schema from database
 */
async function getTableSchema(tableName: string): Promise<TableSchema> {
  // Get columns
  const columnsResult = await db.execute(sql`
    SELECT 
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default,
      CASE WHEN tc.constraint_type = 'UNIQUE' THEN true ELSE false END as is_unique,
      CASE WHEN tc.constraint_type = 'PRIMARY KEY' THEN true ELSE false END as is_primary_key
    FROM information_schema.columns c
    LEFT JOIN information_schema.key_column_usage kcu 
      ON c.table_name = kcu.table_name 
      AND c.column_name = kcu.column_name
      AND c.table_schema = kcu.table_schema
    LEFT JOIN information_schema.table_constraints tc 
      ON kcu.constraint_name = tc.constraint_name
      AND kcu.table_schema = tc.table_schema
    WHERE c.table_schema = 'public' 
      AND c.table_name = ${tableName}
    ORDER BY c.ordinal_position;
  `);

  const columns: ColumnInfo[] = columnsResult.rows.map((row: any) => ({
    columnName: row.column_name,
    dataType: row.data_type,
    isNullable: row.is_nullable,
    defaultValue: row.column_default,
    isUnique: row.is_unique || false,
    isPrimaryKey: row.is_primary_key || false,
  }));

  // Get indexes
  const indexesResult = await db.execute(sql`
    SELECT 
      i.indexname,
      i.indexdef,
      CASE WHEN i.indexdef LIKE '%UNIQUE%' THEN true ELSE false END as is_unique
    FROM pg_indexes i
    WHERE i.schemaname = 'public' 
      AND i.tablename = ${tableName}
      AND i.indexname NOT LIKE '%_pkey';
  `);

  const indexes: IndexInfo[] = indexesResult.rows.map((row: any) => {
    // Extract column names from index definition
    const match = row.indexdef.match(/\(([^)]+)\)/);
    const columns = match 
      ? match[1].split(',').map((c: string) => c.trim().replace(/"/g, ''))
      : [];
    
    return {
      indexName: row.indexname,
      columns,
      isUnique: row.is_unique || false,
    };
  });

  // Get foreign keys
  const fkResult = await db.execute(sql`
    SELECT
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
      AND rc.constraint_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = ${tableName};
  `);

  const foreignKeys: ForeignKeyInfo[] = fkResult.rows.map((row: any) => ({
    constraintName: row.constraint_name,
    columnName: row.column_name,
    referencedTable: row.foreign_table_name,
    referencedColumn: row.foreign_column_name,
    onDelete: row.delete_rule,
  }));

  return {
    tableName,
    columns,
    indexes,
    foreignKeys,
  };
}

/**
 * Map PostgreSQL data types to Drizzle types
 */
function mapDataType(pgType: string): string {
  const typeMap: Record<string, string> = {
    'integer': 'integer',
    'bigint': 'serial',
    'serial': 'serial',
    'text': 'text',
    'varchar': 'text',
    'character varying': 'text',
    'boolean': 'boolean',
    'timestamp without time zone': 'timestamp',
    'timestamp with time zone': 'timestamp',
    'jsonb': 'jsonb',
    'json': 'jsonb',
  };

  return typeMap[pgType.toLowerCase()] || pgType;
}

/**
 * Validate table structure against schema
 */
async function validateTableStructure(
  tableName: string,
  expectedColumns: string[]
): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const actualSchema = await getTableSchema(tableName);

    // Check if table exists
    if (actualSchema.columns.length === 0) {
      errors.push(`Table ${tableName} does not exist`);
      return { valid: false, errors, warnings };
    }

    // Check for missing columns
    const actualColumnNames = actualSchema.columns.map(c => c.columnName);
    const missingColumns = expectedColumns.filter(
      col => !actualColumnNames.includes(col)
    );

    if (missingColumns.length > 0) {
      errors.push(
        `Table ${tableName} missing columns: ${missingColumns.join(', ')}`
      );
    }

    // Check for unexpected columns (warnings only)
    const unexpectedColumns = actualColumnNames.filter(
      col => !expectedColumns.includes(col) && !col.startsWith('__')
    );

    if (unexpectedColumns.length > 0) {
      warnings.push(
        `Table ${tableName} has unexpected columns: ${unexpectedColumns.join(', ')}`
      );
    }

    // Validate primary key
    const primaryKeyColumns = actualSchema.columns.filter(c => c.isPrimaryKey);
    if (primaryKeyColumns.length === 0) {
      errors.push(`Table ${tableName} missing primary key`);
    } else if (primaryKeyColumns.length > 1) {
      warnings.push(
        `Table ${tableName} has composite primary key: ${primaryKeyColumns.map(c => c.columnName).join(', ')}`
      );
    }

  } catch (error) {
    errors.push(
      `Error validating table ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate relationships between tables
 */
async function validateRelationships(): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    // Test key relationships by checking for orphaned records
    const relationshipChecks = [
      {
        table: 'data_sources',
        column: 'user_id',
        refTable: 'users',
        refColumn: 'id',
        name: 'data_sources -> users',
      },
      {
        table: 'chat_conversations',
        column: 'user_id',
        refTable: 'users',
        refColumn: 'id',
        name: 'chat_conversations -> users',
      },
      {
        table: 'chat_messages',
        column: 'conversation_id',
        refTable: 'chat_conversations',
        refColumn: 'id',
        name: 'chat_messages -> chat_conversations',
      },
    ];

    for (const check of relationshipChecks) {
      const result = await db.execute(sql`
        SELECT COUNT(*) as orphaned_count
        FROM ${sql.raw(check.table)} t
        LEFT JOIN ${sql.raw(check.refTable)} r 
          ON t.${sql.raw(check.column)} = r.${sql.raw(check.refColumn)}
        WHERE t.${sql.raw(check.column)} IS NOT NULL
          AND r.${sql.raw(check.refColumn)} IS NULL;
      `);

      const orphanedCount = parseInt((result.rows[0] as any)?.orphaned_count || '0');
      if (orphanedCount > 0) {
        errors.push(
          `Relationship ${check.name}: Found ${orphanedCount} orphaned records`
        );
      }
    }
  } catch (error) {
    errors.push(
      `Error validating relationships: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Main validation function
 */
async function validateSchema(): Promise<{
  success: boolean;
  summary: {
    tables: Record<string, { valid: boolean; errors: string[]; warnings: string[] }>;
    relationships: { valid: boolean; errors: string[] };
  };
}> {
  logger.info('Starting schema validation...');

  // Expected tables and their key columns
  const expectedTables: Record<string, string[]> = {
    users: ['id', 'username', 'email', 'password', 'subscription_tier', 'subscription_status', 'created_at'],
    data_sources: ['id', 'user_id', 'name', 'type', 'connection_type', 'created_at'],
    chat_conversations: ['id', 'user_id', 'data_source_id', 'title', 'created_at'],
    chat_messages: ['id', 'conversation_id', 'role', 'content', 'created_at'],
    message_feedback: ['id', 'message_id', 'user_id', 'rating', 'created_at'],
    query_timestamps: ['id', 'user_id', 'timestamp', 'created_at'],
    data_rows: ['id', 'data_source_id', 'row_data', 'created_at'],
    dashboards: ['id', 'user_id', 'name', 'widgets', 'created_at'],
    alerts: ['id', 'user_id', 'data_source_id', 'name', 'condition', 'is_active', 'created_at'],
    blog_posts: ['id', 'slug', 'title', 'content', 'category', 'published_date'],
    connection_manager: ['id', 'user_id', 'provider', 'account_label', 'status', 'created_at'],
    team_invitations: ['id', 'inviter_id', 'invitee_email', 'invite_token', 'status', 'expires_at', 'created_at'],
    conversation_data_sources: ['id', 'conversation_id', 'data_source_id', 'is_primary', 'added_at'],
  };

  const tableValidations: Record<string, { valid: boolean; errors: string[]; warnings: string[] }> = {};

  // Validate each table
  for (const [tableName, expectedColumns] of Object.entries(expectedTables)) {
    const validation = await validateTableStructure(tableName, expectedColumns);
    tableValidations[tableName] = validation;
    
    if (!validation.valid) {
      logger.error(`Table ${tableName} validation failed`, { errors: validation.errors });
    }
    if (validation.warnings.length > 0) {
      logger.warn(`Table ${tableName} validation warnings`, { warnings: validation.warnings });
    }
  }

  // Validate relationships
  const relationshipValidation = await validateRelationships();
  if (!relationshipValidation.valid) {
    logger.error('Relationship validation failed', { errors: relationshipValidation.errors });
  }

  const success = 
    Object.values(tableValidations).every(v => v.valid) &&
    relationshipValidation.valid;

  return {
    success,
    summary: {
      tables: tableValidations,
      relationships: relationshipValidation,
    },
  };
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateSchema()
    .then((result) => {
      console.log('\n=== Schema Validation Results ===\n');
      console.log(`Status: ${result.success ? '✅ PASSED' : '❌ FAILED'}\n`);
      
      console.log('Table Validations:');
      for (const [tableName, validation] of Object.entries(result.summary.tables)) {
        if (validation.valid && validation.warnings.length === 0) {
          console.log(`  ✅ ${tableName}`);
        } else {
          console.log(`  ${validation.valid ? '⚠️' : '❌'} ${tableName}`);
          if (validation.errors.length > 0) {
            validation.errors.forEach(e => console.log(`    ❌ ${e}`));
          }
          if (validation.warnings.length > 0) {
            validation.warnings.forEach(w => console.log(`    ⚠️  ${w}`));
          }
        }
      }
      
      if (!result.summary.relationships.valid) {
        console.log('\nRelationship Errors:');
        result.summary.relationships.errors.forEach(e => console.log(`  ❌ ${e}`));
      }
      
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      logger.error('Schema validation failed with error', { error });
      console.error('Schema validation failed:', error);
      process.exit(1);
    });
}

export { validateSchema, getTableSchema, validateTableStructure, validateRelationships };
