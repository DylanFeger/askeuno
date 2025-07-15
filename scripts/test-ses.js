import { SESClient, GetSendQuotaCommand, ListVerifiedEmailAddressesCommand, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function testSES() {
  console.log('📧 Testing SES (Email Service)...');
  console.log('Region:', process.env.AWS_REGION);
  
  try {
    // Test SES quota
    console.log('\n1. Testing SES access...');
    const quotaCommand = new GetSendQuotaCommand({});
    const quota = await ses.send(quotaCommand);
    
    console.log('✅ SES is accessible');
    console.log('Daily send limit:', quota.Max24HourSend);
    console.log('Rate limit:', quota.MaxSendRate, 'emails/second');
    console.log('Sent in 24h:', quota.SentLast24Hours);
    
    // Test verified addresses
    console.log('\n2. Checking verified email addresses...');
    const verifiedCommand = new ListVerifiedEmailAddressesCommand({});
    const verified = await ses.send(verifiedCommand);
    
    const verifiedEmails = verified.VerifiedEmailAddresses || [];
    console.log('✅ Verified addresses:', verifiedEmails.length);
    
    if (verifiedEmails.length > 0) {
      verifiedEmails.forEach(email => {
        console.log('  -', email);
      });
    } else {
      console.log('⚠️  No verified email addresses found');
    }
    
    // Test email sending (only if we have verified addresses)
    if (verifiedEmails.length > 0) {
      console.log('\n3. Testing email sending...');
      const testEmail = verifiedEmails[0];
      
      const sendCommand = new SendEmailCommand({
        Source: testEmail,
        Destination: {
          ToAddresses: [testEmail]
        },
        Message: {
          Subject: {
            Data: 'Euno SES Test Email',
            Charset: 'UTF-8'
          },
          Body: {
            Text: {
              Data: `This is a test email from Euno.

Generated: ${new Date().toISOString()}
Region: ${process.env.AWS_REGION}

If you received this, SES is working correctly!

--
Euno Team`,
              Charset: 'UTF-8'
            }
          }
        }
      });
      
      const result = await ses.send(sendCommand);
      console.log('✅ Test email sent successfully');
      console.log('Message ID:', result.MessageId);
    }
    
    console.log('\n🎉 SES is configured and working!');
    console.log('\nReady for:');
    console.log('- Welcome emails for new users');
    console.log('- Password reset emails');
    console.log('- Weekly data reports');
    console.log('- System notifications');
    
  } catch (error) {
    console.error('\n❌ SES Test Failed:', error.message);
    console.error('Error code:', error.name);
    
    if (error.name === 'AccessDenied' || error.Code === 'AccessDenied') {
      console.log('\n📝 Next Steps:');
      console.log('1. Add SES permissions to euno-admin user');
      console.log('2. Apply policy from scripts/aws-setup-complete.md');
      console.log('3. Verify email addresses in SES console');
      console.log('4. Run this test again');
    }
  }
}

testSES().catch(console.error);