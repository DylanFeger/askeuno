#!/usr/bin/env node
/**
 * AWS Credentials Validation Script
 * Validates AWS S3 configuration
 */

console.log('\n☁️  AWS S3 Configuration Validation\n');
console.log('='.repeat(60));

// Check for AWS_ or S3_ prefixed variables
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION || process.env.S3_REGION;
const bucket = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET;

let allValid = true;

// Check Access Key ID
if (!accessKeyId) {
  console.log('⚠️  Access Key ID: Not set (optional if not using S3)');
  console.log('   Set AWS_ACCESS_KEY_ID or S3_ACCESS_KEY_ID');
} else {
  const isValid = accessKeyId.startsWith('AKIA') && accessKeyId.length === 20;
  if (isValid) {
    console.log('✅ Access Key ID: Valid');
    console.log(`   Value: ${accessKeyId}`);
  } else {
    console.log('❌ Access Key ID: Invalid format');
    console.log('   Must start with "AKIA" and be exactly 20 characters');
    allValid = false;
  }
}

// Check Secret Access Key
if (!secretAccessKey) {
  console.log('⚠️  Secret Access Key: Not set (optional if not using S3)');
  console.log('   Set AWS_SECRET_ACCESS_KEY or S3_SECRET_ACCESS_KEY');
} else {
  if (secretAccessKey.length >= 40) {
    console.log('✅ Secret Access Key: Valid');
    console.log(`   Length: ${secretAccessKey.length} characters`);
  } else {
    console.log('❌ Secret Access Key: Too short');
    console.log('   Must be at least 40 characters');
    allValid = false;
  }
}

// Check Region
if (!region) {
  console.log('⚠️  Region: Not set (optional, defaults to us-east-1)');
} else {
  const isValid = /^[a-z0-9-]+$/.test(region);
  if (isValid) {
    console.log('✅ Region: Valid');
    console.log(`   Value: ${region}`);
  } else {
    console.log('❌ Region: Invalid format');
    allValid = false;
  }
}

// Check Bucket
if (!bucket) {
  console.log('⚠️  S3 Bucket: Not set (optional if not using S3)');
} else {
  const isValid = /^[a-z0-9.-]+$/.test(bucket);
  if (isValid) {
    console.log('✅ S3 Bucket: Valid');
    console.log(`   Value: ${bucket}`);
  } else {
    console.log('❌ S3 Bucket: Invalid format');
    console.log('   Must contain only lowercase letters, numbers, dots, and hyphens');
    allValid = false;
  }
}

// Storage mode
const storageMode = process.env.STORAGE_MODE;
console.log('\n📦 Storage Configuration:');
if (storageMode === 's3') {
  console.log('   ✅ STORAGE_MODE: s3 (S3 storage enabled)');
  if (!accessKeyId || !secretAccessKey || !bucket) {
    console.log('   ⚠️  S3 credentials missing - storage will fail');
    allValid = false;
  }
} else {
  console.log(`   ℹ️  STORAGE_MODE: ${storageMode || 'local'} (S3 not required)`);
}

// Summary
console.log('\n' + '='.repeat(60));
if (!accessKeyId && !secretAccessKey && !bucket) {
  console.log('\nℹ️  AWS S3 not configured (optional if not using S3 storage)\n');
  console.log('💡 To enable S3 storage:');
  console.log('   1. Create IAM user with S3 access');
  console.log('   2. Create S3 bucket');
  console.log('   3. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET');
  console.log('   4. Set STORAGE_MODE=s3\n');
  process.exit(0);
} else if (allValid) {
  console.log('\n✅ AWS S3 configuration is valid!\n');
  console.log('📝 Next Steps:');
  console.log('   1. Verify S3 bucket exists and is accessible');
  console.log('   2. Test S3 upload/download');
  console.log('   3. Configure CORS if needed\n');
  process.exit(0);
} else {
  console.log('\n❌ AWS S3 configuration has errors\n');
  process.exit(1);
}
