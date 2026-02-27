/**
 * AWS Lambda Function Template for Automated Database Backups
 * 
 * This template can be used to create an AWS Lambda function that
 * automatically backs up the database on a schedule.
 * 
 * Setup Instructions:
 * 1. Create a new Lambda function in AWS Console
 * 2. Set runtime to Node.js 20.x
 * 3. Add environment variables:
 *    - DATABASE_URL: Your PostgreSQL connection string
 *    - AWS_S3_BUCKET: S3 bucket for backups
 *    - AWS_REGION: AWS region (default: us-east-1)
 * 4. Attach IAM role with permissions:
 *    - S3: PutObject, GetObject
 *    - CloudWatch Logs: CreateLogGroup, CreateLogStream, PutLogEvents
 * 5. Create EventBridge (CloudWatch Events) rule to trigger on schedule:
 *    - Example: cron(0 2 * * ? *) for daily at 2 AM UTC
 * 6. Set timeout to 15 minutes (900 seconds)
 * 7. Set memory to 512 MB
 * 
 * Dependencies:
 * - @aws-sdk/client-s3
 * - pg (PostgreSQL client)
 * 
 * To install dependencies, create a package.json:
 * {
 *   "dependencies": {
 *     "@aws-sdk/client-s3": "^3.x.x",
 *     "pg": "^8.x.x"
 *   }
 * }
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Parse DATABASE_URL to extract connection details
 */
function parseDatabaseUrl(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    return {
      host: url.hostname,
      port: url.port || '5432',
      database: url.pathname.slice(1),
      user: url.username,
      password: url.password,
    };
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL: ${error.message}`);
  }
}

/**
 * Create database backup using pg_dump
 */
async function createBackup(databaseUrl) {
  const dbInfo = parseDatabaseUrl(databaseUrl);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupFile = `/tmp/backup_${timestamp}.sql.gz`;

  const pgDumpCmd = [
    'pg_dump',
    `--host=${dbInfo.host}`,
    `--port=${dbInfo.port}`,
    `--username=${dbInfo.user}`,
    `--dbname=${dbInfo.database}`,
    '--no-password',
    '--verbose',
    '--clean',
    '--if-exists',
    '--format=plain',
    '--compress=9',
  ].join(' ');

  const env = {
    ...process.env,
    PGPASSWORD: dbInfo.password,
  };

  console.log('Creating backup...');
  await execAsync(`${pgDumpCmd} > ${backupFile}`, { env, shell: true });
  console.log(`Backup created: ${backupFile}`);

  return backupFile;
}

/**
 * Upload backup to S3
 */
async function uploadToS3(filePath, bucket) {
  const fs = require('fs');
  const fileName = filePath.split('/').pop();
  const s3Key = `database-backups/${fileName}`;

  console.log(`Uploading to S3: s3://${bucket}/${s3Key}`);

  const fileContent = fs.readFileSync(filePath);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Body: fileContent,
      ContentType: 'application/gzip',
      Metadata: {
        'backup-date': new Date().toISOString(),
        'source': 'lambda-automated-backup',
      },
    })
  );

  console.log(`Uploaded successfully: s3://${bucket}/${s3Key}`);
  return s3Key;
}

/**
 * Clean up old backups from S3 (keep last 30 days)
 */
async function cleanupOldBackups(bucket) {
  const { ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const listCommand = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: 'database-backups/',
  });

  const { Contents } = await s3Client.send(listCommand);
  
  if (!Contents) {
    return;
  }

  const oldBackups = Contents.filter(
    (obj) => new Date(obj.LastModified) < thirtyDaysAgo
  );

  if (oldBackups.length === 0) {
    console.log('No old backups to clean up');
    return;
  }

  console.log(`Cleaning up ${oldBackups.length} old backup(s)`);

  for (const backup of oldBackups) {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: backup.Key,
      })
    );
  }

  console.log(`Cleaned up ${oldBackups.length} old backup(s)`);
}

/**
 * Lambda handler
 */
exports.handler = async (event) => {
  const databaseUrl = process.env.DATABASE_URL;
  const bucket = process.env.AWS_S3_BUCKET;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  if (!bucket) {
    throw new Error('AWS_S3_BUCKET environment variable is required');
  }

  try {
    console.log('Starting automated database backup...');
    console.log(`Database: ${databaseUrl.split('@')[1] || 'hidden'}`);
    console.log(`S3 Bucket: ${bucket}`);

    // Create backup
    const backupFile = await createBackup(databaseUrl);

    try {
      // Upload to S3
      const s3Key = await uploadToS3(backupFile, bucket);

      // Clean up old backups
      await cleanupOldBackups(bucket);

      // Clean up local file
      const fs = require('fs');
      fs.unlinkSync(backupFile);

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Backup completed successfully',
          s3Key,
          timestamp: new Date().toISOString(),
        }),
      };
    } catch (error) {
      // Clean up local file even on error
      const fs = require('fs');
      try {
        fs.unlinkSync(backupFile);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  } catch (error) {
    console.error('Backup failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
