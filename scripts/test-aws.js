import { S3Client, HeadBucketCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { SESClient, GetSendQuotaCommand, ListVerifiedEmailAddressesCommand } from '@aws-sdk/client-ses';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const ses = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function testAWS() {
  console.log('🧪 Testing Complete AWS Setup for Euno');
  console.log('=====================================');
  console.log('Region:', process.env.AWS_REGION);
  console.log('S3 Bucket:', process.env.S3_BUCKET_NAME);
  console.log('User: euno-admin');
  console.log('');
  
  let s3Working = false;
  let sesWorking = false;
  
  // Test S3
  console.log('📦 Testing S3 (File Storage)...');
  try {
    const headCommand = new HeadBucketCommand({
      Bucket: process.env.S3_BUCKET_NAME
    });
    await s3.send(headCommand);
    
    const putCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: 'test-aws-integration.txt',
      Body: 'AWS Integration Test - ' + new Date().toISOString(),
      ContentType: 'text/plain'
    });
    await s3.send(putCommand);
    
    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: 'test-aws-integration.txt'
    });
    await s3.send(deleteCommand);
    
    console.log('✅ S3 is working perfectly');
    s3Working = true;
    
  } catch (error) {
    console.log('❌ S3 failed:', error.message);
    s3Working = false;
  }
  
  // Test SES
  console.log('\n📧 Testing SES (Email Service)...');
  try {
    const quotaCommand = new GetSendQuotaCommand({});
    const quota = await ses.send(quotaCommand);
    
    const verifiedCommand = new ListVerifiedEmailAddressesCommand({});
    const verified = await ses.send(verifiedCommand);
    
    console.log('✅ SES is working perfectly');
    console.log('   Daily limit:', quota.Max24HourSend);
    console.log('   Verified emails:', verified.VerifiedEmailAddresses?.length || 0);
    sesWorking = true;
    
  } catch (error) {
    console.log('❌ SES failed:', error.message);
    sesWorking = false;
  }
  
  // Summary
  console.log('\n📊 AWS Integration Summary');
  console.log('=========================');
  console.log('S3 (File Storage):', s3Working ? '✅ Ready' : '❌ Needs Setup');
  console.log('SES (Email Service):', sesWorking ? '✅ Ready' : '❌ Needs Setup');
  
  if (s3Working && sesWorking) {
    console.log('\n🎉 All AWS services are configured and working!');
    console.log('\nEuno Features Now Available:');
    console.log('• File uploads up to 500MB');
    console.log('• Secure encrypted storage');
    console.log('• AI-powered file analysis');
    console.log('• Welcome emails for new users');
    console.log('• Password reset functionality');
    console.log('• Weekly data reports');
    console.log('• System notifications');
    
  } else {
    console.log('\n📝 Setup Required:');
    if (!s3Working) {
      console.log('S3: Create bucket and apply policy (see scripts/setup-s3-bucket.md)');
    }
    if (!sesWorking) {
      console.log('SES: Add permissions and verify emails (see scripts/aws-setup-complete.md)');
    }
  }
}

testAWS().catch(console.error);