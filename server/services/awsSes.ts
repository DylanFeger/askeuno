import sgMail from '@sendgrid/mail';
import { logger } from "../utils/logger";

// Initialize SendGrid with API key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export interface EmailOptions {
  to: string | string[];
  from: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

/**
 * Send an email using SendGrid
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Check if SendGrid is configured
    if (!SENDGRID_API_KEY) {
      logger.warn('SendGrid API key not configured, skipping email send');
      return {
        success: false,
        error: 'Email service not configured'
      };
    }

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

    const msg: any = {
      to: toAddresses,
      from: options.from,
      subject: options.subject,
      ...(options.text && { text: options.text }),
      ...(options.html && { html: options.html }),
      ...(options.replyTo && { replyTo: options.replyTo }),
    };

    const response = await sgMail.send(msg);
    const messageId = response[0].headers['x-message-id'] || `sg_${Date.now()}`;
    
    logger.info('Email sent successfully', {
      messageId,
      to: toAddresses,
      subject: options.subject
    });

    return { 
      success: true, 
      messageId
    };
  } catch (error: any) {
    logger.error('Failed to send email', {
      error: error.message,
      to: options.to,
      subject: options.subject
    });

    // Handle common SendGrid errors
    if (error.code === 401) {
      return { 
        success: false, 
        error: 'Invalid SendGrid API key. Please check your configuration.' 
      };
    }
    
    if (error.code === 403) {
      return { 
        success: false, 
        error: 'SendGrid sender not verified. Please verify your sender email.' 
      };
    }

    return { 
      success: false, 
      error: error.message || 'Failed to send email' 
    };
  }
}

/**
 * Verify an email address (SendGrid handles this automatically)
 */
export async function verifyEmailAddress(email: string): Promise<{ success: boolean; error?: string }> {
  // SendGrid handles sender verification through their dashboard
  // This function is kept for compatibility
  logger.info('Email verification not needed with SendGrid', { email });
  
  return { 
    success: true 
  };
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
  <title>Welcome to Euno</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 30px 0;">
    <h1 style="color: hsl(142, 25%, 45%); margin: 0;">Welcome to Euno!</h1>
  </div>
  
  <div style="background-color: #fff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h2>Hi ${username},</h2>
    
    <p>Welcome to Euno - your secure, easy-to-use data platform. We're excited to help you upload, store, and analyze your business data with AI-powered insights.</p>
    
    <h3>Getting Started:</h3>
    <ul>
      <li>Upload your first data file (CSV, Excel, or JSON)</li>
      <li>Ask questions about your data in plain English</li>
      <li>Get instant insights and recommendations</li>
    </ul>
    
    <p style="margin-top: 30px;">
      <a href="${process.env.APP_URL || 'https://askeuno.com'}" style="display: inline-block; background-color: hsl(142, 25%, 45%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Get Started</a>
    </p>
    
    <p style="color: #666; font-size: 14px; margin-top: 30px;">
      If you have any questions, feel free to reply to this email or visit our help center.
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    © ${new Date().getFullYear()} Ask Euno. All rights reserved.
  </div>
</body>
</html>`;

  const text = `
Welcome to Ask Euno!

Hi ${username},

Welcome to Ask Euno - your secure, easy-to-use data analytics platform. We're excited to help you upload, store, and analyze your business data with AI-powered insights.

Getting Started:
• Upload your first data file (CSV, Excel, or JSON)
• Ask questions about your data in plain English
• Get instant insights and recommendations

Get started at: ${process.env.APP_URL || 'https://askeuno.com'}

If you have any questions, feel free to reply to this email.

© ${new Date().getFullYear()} Ask Euno. All rights reserved.
`;

  return sendEmail({
    to: userEmail,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@askeuno.com',
    subject: 'Welcome to Ask Euno - Your Data Analytics Platform',
    html,
    text
  });
}

/**
 * Send a contact form submission email
 */
export async function sendContactFormEmail(
  formData: { name: string; email: string; subject: string; message: string }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Contact Form Submission</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 30px 0;">
    <h1 style="color: hsl(142, 25%, 45%); margin: 0;">New Contact Form Submission</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h2 style="margin-top: 0;">Contact Details</h2>
    
    <div style="margin-bottom: 20px;">
      <strong>Name:</strong> ${formData.name}<br>
      <strong>Email:</strong> <a href="mailto:${formData.email}">${formData.email}</a><br>
      <strong>Subject:</strong> ${formData.subject}
    </div>
    
    <div style="background-color: white; padding: 20px; border-radius: 5px; margin-top: 20px;">
      <h3 style="margin-top: 0;">Message:</h3>
      <p style="white-space: pre-wrap;">${formData.message}</p>
    </div>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
      <p style="color: #666; font-size: 14px;">
        This message was sent from the Euno contact form at ${new Date().toLocaleString()}.
      </p>
    </div>
  </div>
</body>
</html>`;

  const text = `
New Contact Form Submission

Contact Details:
Name: ${formData.name}
Email: ${formData.email}
Subject: ${formData.subject}

Message:
${formData.message}

---
This message was sent from the Euno contact form at ${new Date().toLocaleString()}.
`;

  return sendEmail({
    to: 'support@askeuno.com',
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@askeuno.com',
    subject: `Contact Form: ${formData.subject}`,
    html,
    text,
    replyTo: formData.email
  });
}

/**
 * Test connection to SendGrid
 */
export async function testSESConnection(): Promise<{ success: boolean; error?: string }> {
  if (!SENDGRID_API_KEY) {
    return { 
      success: false, 
      error: 'SendGrid API key not configured' 
    };
  }
  
  // SendGrid connection is tested when sending emails
  return { success: true };
}