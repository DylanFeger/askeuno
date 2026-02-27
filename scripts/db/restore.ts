#!/usr/bin/env tsx
/**
 * Database Restore Script
 * 
 * Restores a database from a backup file
 * 
 * Usage:
 *   npm run db:restore <backup-file>
 *   or
 *   tsx scripts/db/restore.ts <backup-file>
 * 
 * WARNING: This will overwrite existing data!
 * 
 * Environment Variables:
 *   DATABASE_URL - PostgreSQL connection string
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, stat } from 'fs/promises';
import { logger } from '../../server/utils/logger';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const execAsync = promisify(exec);

/**
 * Parse DATABASE_URL to extract connection details for psql
 */
function parseDatabaseUrl(databaseUrl: string): {
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
} {
  try {
    const url = new URL(databaseUrl);
    return {
      host: url.hostname,
      port: url.port || '5432',
      database: url.pathname.slice(1), // Remove leading /
      user: url.username,
      password: url.password,
    };
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Download backup from S3
 */
async function downloadFromS3(bucket: string, key: string, outputPath: string): Promise<string> {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS credentials not configured');
  }

  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  logger.info(`Downloading backup from S3: s3://${bucket}/${key}`);

  try {
    const { Body } = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    if (!Body) {
      throw new Error('Empty response from S3');
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of Body as any) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    const { writeFile } = await import('fs/promises');
    await writeFile(outputPath, buffer);

    logger.info(`Backup downloaded to: ${outputPath}`);
    return outputPath;
  } catch (error) {
    throw new Error(`S3 download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Restore database from backup file
 */
async function restoreDatabase(backupFile: string, options: {
  confirm?: boolean;
} = {}): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  // Check if file exists (or is S3 path)
  let actualBackupFile = backupFile;
  
  if (backupFile.startsWith('s3://')) {
    // Download from S3
    const [bucket, ...keyParts] = backupFile.slice(5).split('/');
    const key = keyParts.join('/');
    const tempFile = `/tmp/restore_${Date.now()}.sql`;
    actualBackupFile = await downloadFromS3(bucket, key, tempFile);
  } else {
    // Check if local file exists
    try {
      await stat(backupFile);
    } catch (error) {
      throw new Error(`Backup file not found: ${backupFile}`);
    }
  }

  const dbInfo = parseDatabaseUrl(databaseUrl);

  logger.warn('⚠️  WARNING: This will overwrite existing database data!');
  
  if (!options.confirm && !process.argv.includes('--confirm')) {
    throw new Error(
      'Restore requires confirmation. Use --confirm flag or set confirm option to true.'
    );
  }

  // Build psql command
  const isCompressed = actualBackupFile.endsWith('.gz');
  let restoreCmd: string;

  if (isCompressed) {
    restoreCmd = `gunzip -c ${actualBackupFile} | psql --host=${dbInfo.host} --port=${dbInfo.port} --username=${dbInfo.user} --dbname=${dbInfo.database} --no-password`;
  } else {
    restoreCmd = `psql --host=${dbInfo.host} --port=${dbInfo.port} --username=${dbInfo.user} --dbname=${dbInfo.database} --no-password --file=${actualBackupFile}`;
  }

  // Set password via environment variable
  const env = {
    ...process.env,
    PGPASSWORD: dbInfo.password,
  };

  logger.info(`Restoring database from: ${actualBackupFile}`);

  try {
    const { stdout, stderr } = await execAsync(restoreCmd, { env, shell: true });

    if (stderr && !stderr.includes('psql: warning')) {
      logger.warn('psql warnings', { stderr });
    }

    logger.info('Database restored successfully');
  } catch (error) {
    throw new Error(`Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    // Clean up temp file if downloaded from S3
    if (backupFile.startsWith('s3://')) {
      const { unlink } = await import('fs/promises');
      try {
        await unlink(actualBackupFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

// Run restore if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const backupFile = process.argv[2];
  
  if (!backupFile) {
    console.error('Usage: tsx scripts/db/restore.ts <backup-file> [--confirm]');
    process.exit(1);
  }

  restoreDatabase(backupFile, {
    confirm: process.argv.includes('--confirm'),
  })
    .then(() => {
      console.log('\n=== Database Restore Results ===\n');
      console.log('✅ Database restored successfully!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Restore failed with error', { error });
      console.error('Restore failed:', error);
      process.exit(1);
    });
}

export { restoreDatabase, downloadFromS3 };
