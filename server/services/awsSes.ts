import { SESClient, SendEmailCommand, VerifyEmailIdentityCommand } from "@aws-sdk/client-ses";
import { logger } from "../utils/logger";

// Configuration from environment variables
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

// Initialize SES client
const sesClient = new SESClient({
  region: AWS_REGION,
  credentials: AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  } : undefined // Use default credential provider chain if not specified
});

export interface EmailOptions {
  to: string | string[];
  from: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

/**
 * Send an email using AWS SES
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Validate required fields
    if (!options.to || !options.from || !options.subject) {
      throw new Error('Missing required email fields: to, from, or subject');
    }

    // Ensure at least one body type is provided
    if (!options.html && !options.text) {
      throw new Error('Email must have either HTML or text content');
    }

    // Convert to array if single recipient
    const toAddresses = Array.isArray(options.to) ? options.to : [options.to];

    const command = new SendEmailCommand({
      Source: options.from,
      Destination: {
        ToAddresses: toAddresses,
      },
      Message: {
        Subject: {
          Data: options.subject,
          Charset: "UTF-8",
        },
        Body: {
          ...(options.html && {
            Html: {
              Data: options.html,
              Charset: "UTF-8",
            },
          }),
          ...(options.text && {
            Text: {
              Data: options.text,
              Charset: "UTF-8",
            },
          }),
        },
      },
      ...(options.replyTo && {
        ReplyToAddresses: [options.replyTo],
      }),
    });

    const response = await sesClient.send(command);
    
    logger.info('Email sent successfully', {
      messageId: response.MessageId,
      to: toAddresses,
      subject: options.subject
    });

    return { 
      success: true, 
      messageId: response.MessageId 
    };
  } catch (error: any) {
    logger.error('Failed to send email', {
      error: error.message,
      to: options.to,
      subject: options.subject
    });

    // Handle common SES errors
    if (error.name === 'MessageRejected') {
      return { 
        success: false, 
        error: 'Email address not verified. Please verify sender email in AWS SES.' 
      };
    }
    
    if (error.name === 'ConfigurationSetDoesNotExist') {
      return { 
        success: false, 
        error: 'AWS SES configuration error. Please check your SES setup.' 
      };
    }

    return { 
      success: false, 
      error: error.message || 'Failed to send email' 
    };
  }
}

/**
 * Verify an email address with AWS SES
 */
export async function verifyEmailAddress(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const command = new VerifyEmailIdentityCommand({
      EmailAddress: email
    });

    await sesClient.send(command);
    
    logger.info('Email verification request sent', { email });
    
    return { 
      success: true 
    };
  } catch (error: any) {
    logger.error('Failed to verify email address', {
      error: error.message,
      email
    });

    return { 
      success: false, 
      error: error.message || 'Failed to verify email address' 
    };
  }
}

/**
 * Send a welcome email to new users
 */
export async function sendWelcomeEmail(userEmail: string, username: string): Promise<{ success: boolean; error?: string }> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to Acre</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 30px 0;">
    <h1 style="color: hsl(142, 25%, 45%); margin: 0;">Welcome to Acre!</h1>
  </div>
  
  <div style="background-color: #fff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h2>Hi ${username},</h2>
    
    <p>Welcome to Acre - your secure, easy-to-use data platform. We're excited to help you upload, store, and analyze your business data with AI-powered insights.</p>
    
    <h3>Getting Started:</h3>
    <ul>
      <li>Upload your first data file (CSV, Excel, or JSON)</li>
      <li>Ask questions about your data in plain English</li>
      <li>Get instant insights and recommendations</li>
    </ul>
    
    <p style="margin-top: 30px;">
      <a href="${process.env.APP_URL || 'https://acre.app'}" style="display: inline-block; background-color: hsl(142, 25%, 45%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Get Started</a>
    </p>
    
    <p style="color: #666; font-size: 14px; margin-top: 30px;">
      If you have any questions, feel free to reply to this email or visit our help center.
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    © ${new Date().getFullYear()} Acre. All rights reserved.
  </div>
</body>
</html>`;

  const text = `
Welcome to Acre!

Hi ${username},

Welcome to Acre - your secure, easy-to-use data platform. We're excited to help you upload, store, and analyze your business data with AI-powered insights.

Getting Started:
• Upload your first data file (CSV, Excel, or JSON)
• Ask questions about your data in plain English
• Get instant insights and recommendations

Get started at: ${process.env.APP_URL || 'https://acre.app'}

If you have any questions, feel free to reply to this email.

© ${new Date().getFullYear()} Acre. All rights reserved.
`;

  return sendEmail({
    to: userEmail,
    from: process.env.SES_FROM_EMAIL || 'noreply@acre.app',
    subject: 'Welcome to Acre - Your Data Platform',
    html,
    text
  });
}

/**
 * Test connection to AWS SES
 */
export async function testSESConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    // Try to send a test command
    const command = new VerifyEmailIdentityCommand({
      EmailAddress: 'test@example.com'
    });
    
    await sesClient.send(command);
    
    return { success: true };
  } catch (error: any) {
    // If we get a specific AWS error, the connection is working
    if (error.name && error.name.includes('AWS')) {
      return { success: true };
    }
    
    return { 
      success: false, 
      error: 'Unable to connect to AWS SES. Please check your credentials.' 
    };
  }
}