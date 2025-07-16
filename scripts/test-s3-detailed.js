import { S3Client, ListBucketsCommand, PutObjectCommand } from '@aws-sdk/client-s3';

async function testS3Connection() {
  console.log('🔍 Testing S3 Connection...\n');
  
  // Log environment variables (without exposing secrets)
  console.log('Environment Check:');
  console.log(`AWS_REGION: ${process.env.AWS_REGION || 'Not set'}`);
  console.log(`S3_BUCKET_NAME: ${process.env.S3_BUCKET_NAME || 'Not set'}`);
  console.log(`AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? 'Set (hidden)' : 'Not set'}`);
  console.log(`AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? 'Set (hidden)' : 'Not set'}`);
  console.log('');

  try {
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });

    // Test 1: List buckets to verify credentials work
    console.log('Test 1: Checking AWS credentials by listing buckets...');
    try {
      const listCommand = new ListBucketsCommand({});
      const response = await s3Client.send(listCommand);
      console.log(`✅ Credentials are valid! Found ${response.Buckets?.length || 0} buckets.`);
      
      // Check if our bucket exists
      const bucketName = process.env.S3_BUCKET_NAME || 'euno-user-uploads';
      const bucketExists = response.Buckets?.some(b => b.Name === bucketName);
      
      if (bucketExists) {
        console.log(`✅ Bucket "${bucketName}" exists!`);
      } else {
        console.log(`❌ Bucket "${bucketName}" does not exist in your account.`);
        console.log('Available buckets:', response.Buckets?.map(b => b.Name).join(', ') || 'None');
      }
    } catch (listError) {
      console.error('❌ Failed to list buckets:', listError.message);
      console.log('This might mean limited permissions or invalid credentials.');
    }

    // Test 2: Try to upload a test file
    console.log('\nTest 2: Attempting to upload a test file...');
    const bucketName = process.env.S3_BUCKET_NAME || 'euno-user-uploads';
    
    try {
      const testKey = `test/connection-test-${Date.now()}.txt`;
      const putCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: testKey,
        Body: 'Test file from Euno deployment check',
        ContentType: 'text/plain'
      });
      
      await s3Client.send(putCommand);
      console.log(`✅ Successfully uploaded test file to ${bucketName}/${testKey}`);
      console.log('🎉 S3 is fully configured and working!');
    } catch (uploadError) {
      console.error('❌ Failed to upload test file:', uploadError.message);
      
      if (uploadError.name === 'NoSuchBucket') {
        console.log(`\n⚠️  The bucket "${bucketName}" needs to be created.`);
        console.log('Please ask your AWS administrator to create this bucket.');
      } else if (uploadError.name === 'AccessDenied') {
        console.log('\n⚠️  Access denied. Your IAM user may need additional permissions.');
      }
    }

  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

// Run the test
testS3Connection().catch(console.error);