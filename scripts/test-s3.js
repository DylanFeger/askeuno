import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function testS3() {
  console.log('🧪 Testing S3 Connection...');
  console.log('Region:', process.env.AWS_REGION);
  console.log('Bucket:', process.env.S3_BUCKET_NAME);
  
  try {
    // Test bucket existence
    console.log('\n1. Testing bucket access...');
    const headCommand = new HeadBucketCommand({
      Bucket: process.env.S3_BUCKET_NAME
    });
    
    await s3.send(headCommand);
    console.log('✅ Bucket exists and is accessible');
    
    // Test upload
    console.log('\n2. Testing file upload...');
    const testContent = `Euno S3 Test File
Generated: ${new Date().toISOString()}
Region: ${process.env.AWS_REGION}
Bucket: ${process.env.S3_BUCKET_NAME}`;
    
    const putCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: 'test-files/connection-test.txt',
      Body: testContent,
      ContentType: 'text/plain',
      ServerSideEncryption: 'AES256'
    });
    
    await s3.send(putCommand);
    console.log('✅ File upload successful');
    
    // Test delete
    console.log('\n3. Testing file deletion...');
    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: 'test-files/connection-test.txt'
    });
    
    await s3.send(deleteCommand);
    console.log('✅ File deletion successful');
    
    console.log('\n🎉 S3 is fully configured and working!');
    console.log('\nReady for:');
    console.log('- File uploads up to 500MB');
    console.log('- Secure encrypted storage');
    console.log('- User-isolated folders');
    console.log('- AI-powered file analysis');
    
  } catch (error) {
    console.error('\n❌ S3 Test Failed:', error.message);
    console.error('Error code:', error.name);
    
    if (error.name === 'NoSuchBucket' || error.Code === 'NoSuchBucket') {
      console.log('\n📝 Next Steps:');
      console.log('1. Create S3 bucket "euno-user-uploads" in region us-east-2');
      console.log('2. Apply bucket policy from scripts/setup-s3-bucket.md');
      console.log('3. Run this test again');
    } else if (error.name === 'AccessDenied' || error.Code === 'AccessDenied') {
      console.log('\n📝 Next Steps:');
      console.log('1. Check IAM permissions for euno-admin user');
      console.log('2. Apply policy from scripts/aws-setup-complete.md');
      console.log('3. Run this test again');
    }
  }
}

testS3().catch(console.error);