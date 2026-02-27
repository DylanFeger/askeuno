#!/usr/bin/env node
/**
 * Infrastructure Connection Test Script
 * 
 * Tests all production infrastructure connections:
 * - PostgreSQL database
 * - AWS S3 bucket
 * - Sentry (optional)
 * 
 * Usage:
 *   node scripts/test-infrastructure.js
 * 
 * Requires environment variables to be set (use .env file or export)
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });
config({ path: join(__dirname, '..', '.env.production') });

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

async function testDatabase() {
  logInfo('\n📊 Testing Database Connection...');
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logError('DATABASE_URL is not set');
    return false;
  }

  try {
    // Try to import pg (PostgreSQL client)
    const { Client } = await import('pg');
    
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    
    // Test query
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    const { current_time, pg_version } = result.rows[0];
    
    logSuccess(`Database connection successful!`);
    logInfo(`  Current time: ${current_time}`);
    logInfo(`  PostgreSQL version: ${pg_version.split(' ')[0]} ${pg_version.split(' ')[1]}`);
    
    await client.end();
    return true;
  } catch (error) {
    logError(`Database connection failed: ${error.message}`);
    if (error.message.includes('password')) {
      logWarning('  Check your DATABASE_URL credentials');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      logWarning('  Check your DATABASE_URL host and port');
    } else if (error.message.includes('SSL')) {
      logWarning('  Ensure SSL is enabled (sslmode=require)');
    }
    return false;
  }
}

async function testS3() {
  logInfo('\n☁️  Testing AWS S3 Connection...');
  
  const storageMode = process.env.STORAGE_MODE || 'local';
  if (storageMode !== 's3') {
    logWarning('STORAGE_MODE is not set to "s3" - skipping S3 test');
    return true; // Not an error, just not configured
  }

  const requiredVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_S3_BUCKET'];
  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    logError(`Missing S3 configuration: ${missing.join(', ')}`);
    return false;
  }

  try {
    // Try to import AWS SDK
    const { S3Client, ListBucketsCommand, HeadBucketCommand } = await import('@aws-sdk/client-s3');
    
    const client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    // Test 1: List buckets (verify credentials)
    logInfo('  Testing AWS credentials...');
    const bucketsResult = await client.send(new ListBucketsCommand({}));
    logSuccess('AWS credentials are valid');
    logInfo(`  Accessible buckets: ${bucketsResult.Buckets?.map(b => b.Name).join(', ') || 'none'}`);

    // Test 2: Check if bucket exists and is accessible
    logInfo(`  Checking bucket access: ${process.env.AWS_S3_BUCKET}...`);
    const bucketCheck = await client.send(new HeadBucketCommand({
      Bucket: process.env.AWS_S3_BUCKET,
    }));
    logSuccess(`Bucket "${process.env.AWS_S3_BUCKET}" is accessible`);
    
    return true;
  } catch (error) {
    logError(`S3 connection failed: ${error.message}`);
    if (error.name === 'InvalidAccessKeyId' || error.name === 'SignatureDoesNotMatch') {
      logWarning('  Check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
    } else if (error.name === 'NotFound' || error.name === 'NoSuchBucket') {
      logWarning(`  Bucket "${process.env.AWS_S3_BUCKET}" does not exist or is not accessible`);
    } else if (error.name === 'AccessDenied') {
      logWarning('  IAM user does not have permission to access this bucket');
    }
    return false;
  }
}

async function testSentry() {
  logInfo('\n🔍 Testing Sentry Configuration...');
  
  const sentryDsn = process.env.SENTRY_DSN;
  if (!sentryDsn) {
    logWarning('SENTRY_DSN is not set - Sentry is optional but recommended');
    return true; // Not an error, just not configured
  }

  // Validate DSN format
  const dsnPattern = /^https:\/\/[a-f0-9]+@[a-z0-9]+\.ingest\.sentry\.io\/[0-9]+$/;
  if (!dsnPattern.test(sentryDsn)) {
    logError('SENTRY_DSN format appears invalid');
    logInfo('  Expected format: https://xxx@xxx.ingest.sentry.io/xxx');
    return false;
  }

  logSuccess('Sentry DSN format is valid');
  logInfo(`  DSN: ${sentryDsn.substring(0, 20)}...`);
  
  // Note: We can't actually test Sentry connection without sending an event
  // But we can validate the format
  return true;
}

async function testEnvironmentVariables() {
  logInfo('\n🔐 Checking Required Environment Variables...');
  
  const required = [
    'DATABASE_URL',
    'SESSION_SECRET',
    'ENCRYPTION_KEY',
    'NODE_ENV',
  ];
  
  const missing = required.filter(v => !process.env[v]);
  const present = required.filter(v => process.env[v]);
  
  if (missing.length > 0) {
    logError(`Missing required variables: ${missing.join(', ')}`);
    return false;
  }
  
  logSuccess(`All required variables are set (${present.length}/${required.length})`);
  
  // Validate ENCRYPTION_KEY format
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (encryptionKey.length !== 64) {
    logError(`ENCRYPTION_KEY must be exactly 64 characters (got ${encryptionKey.length})`);
    return false;
  }
  if (!/^[0-9a-fA-F]+$/.test(encryptionKey)) {
    logError('ENCRYPTION_KEY must be a valid hexadecimal string');
    return false;
  }
  logSuccess('ENCRYPTION_KEY format is valid');
  
  // Validate SESSION_SECRET format
  const sessionSecret = process.env.SESSION_SECRET;
  if (sessionSecret.length < 32) {
    logError(`SESSION_SECRET must be at least 32 characters (got ${sessionSecret.length})`);
    return false;
  }
  logSuccess('SESSION_SECRET format is valid');
  
  return true;
}

async function main() {
  log('\n🚀 Ask Euno Infrastructure Connection Test\n', 'blue');
  log('=' .repeat(60), 'cyan');
  
  const results = {
    env: false,
    database: false,
    s3: false,
    sentry: false,
  };
  
  // Test 1: Environment variables
  results.env = await testEnvironmentVariables();
  
  // Test 2: Database (only if env vars are set)
  if (results.env) {
    results.database = await testDatabase();
  }
  
  // Test 3: S3 (only if env vars are set)
  if (results.env) {
    results.s3 = await testS3();
  }
  
  // Test 4: Sentry (optional)
  results.sentry = await testSentry();
  
  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('\n📋 Test Summary:\n', 'blue');
  
  const allTests = [
    { name: 'Environment Variables', result: results.env, required: true },
    { name: 'Database Connection', result: results.database, required: true },
    { name: 'S3 Connection', result: results.s3, required: false },
    { name: 'Sentry Configuration', result: results.sentry, required: false },
  ];
  
  allTests.forEach(test => {
    if (test.result) {
      logSuccess(`${test.name}: PASS`);
    } else if (test.required) {
      logError(`${test.name}: FAIL (REQUIRED)`);
    } else {
      logWarning(`${test.name}: FAIL (OPTIONAL)`);
    }
  });
  
  const requiredPassed = allTests.filter(t => t.required && t.result).length;
  const requiredTotal = allTests.filter(t => t.required).length;
  const optionalPassed = allTests.filter(t => !t.required && t.result).length;
  const optionalTotal = allTests.filter(t => !t.required).length;
  
  log('\n' + '='.repeat(60), 'cyan');
  
  if (requiredPassed === requiredTotal) {
    logSuccess(`\n✅ All required tests passed (${requiredPassed}/${requiredTotal})`);
    if (optionalPassed < optionalTotal) {
      logWarning(`⚠️  Some optional tests failed (${optionalPassed}/${optionalTotal})`);
      logInfo('   Optional services can be configured later');
    }
    log('\n🎉 Infrastructure is ready for deployment!\n', 'green');
    process.exit(0);
  } else {
    logError(`\n❌ Required tests failed (${requiredPassed}/${requiredTotal})`);
    logInfo('   Please fix the errors above before deploying\n');
    process.exit(1);
  }
}

// Run tests
main().catch(error => {
  logError(`\n💥 Unexpected error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
