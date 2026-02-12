import { db } from "../db";
import { users, dataSources, chatMessages, chatConversations } from "@shared/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { logger } from "../utils/logger";
import { sendEmail } from "../services/awsSes";

/**
 * Email Reports Job - Sends scheduled reports to users
 * Can be run as a cron job or AWS Lambda function
 */

// Configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // Start with 2 seconds
const BATCH_SIZE = 10; // Send emails in batches

interface EmailResult {
  userId: number;
  email: string;
  success: boolean;
  error?: string;
  retries: number;
}

interface UserReport {
  userId: number;
  username: string;
  email: string;
  subscriptionTier: string;
  stats: {
    dataSources: number;
    totalRows: number;
    conversations: number;
    messagesThisWeek: number;
    lastActivity: Date | null;
  };
  insights: string[];
}

// SendGrid configuration is handled in the awsSes service

// Retry wrapper with exponential backoff
async function retryOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = MAX_RETRIES
): Promise<{ result?: T; retries: number; error?: any }> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Attempting ${operationName} (attempt ${attempt}/${maxRetries})`);
      const result = await operation();
      return { result, retries: attempt - 1 };
    } catch (error) {
      lastError = error;
      logger.warn(`${operationName} failed on attempt ${attempt}`, { error, attempt });
      
      if (attempt < maxRetries) {
        const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
        logger.info(`Retrying ${operationName} in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  logger.error(`${operationName} failed after ${maxRetries} attempts`, { error: lastError });
  return { error: lastError, retries: maxRetries };
}

// Generate user statistics
async function generateUserReport(user: any): Promise<UserReport> {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  try {
    // Get data source stats
    const dataSourceStats = await db
      .select({
        count: sql<number>`count(*)`,
        totalRows: sql<number>`coalesce(sum(${dataSources.rowCount}), 0)`
      })
      .from(dataSources)
      .where(eq(dataSources.userId, user.id));
    
    // Get conversation stats
    const conversationStats = await db
      .select({
        count: sql<number>`count(distinct ${chatConversations.id})`,
        messagesThisWeek: sql<number>`count(${chatMessages.id})`,
        lastActivity: sql<Date>`max(${chatMessages.createdAt})`
      })
      .from(chatConversations)
      .leftJoin(chatMessages, eq(chatConversations.id, chatMessages.conversationId))
      .where(
        and(
          eq(chatConversations.userId, user.id),
          gte(chatMessages.createdAt, oneWeekAgo)
        )
      );
    
    // Generate insights based on activity
    const insights: string[] = [];
    const stats = {
      dataSources: Number(dataSourceStats[0]?.count || 0),
      totalRows: Number(dataSourceStats[0]?.totalRows || 0),
      conversations: Number(conversationStats[0]?.count || 0),
      messagesThisWeek: Number(conversationStats[0]?.messagesThisWeek || 0),
      lastActivity: conversationStats[0]?.lastActivity || null
    };
    
    // Generate personalized insights
    if (stats.messagesThisWeek > 50) {
      insights.push("You've been very active this week! Consider upgrading for unlimited queries.");
    }
    
    if (stats.dataSources === 0) {
      insights.push("Upload your first data file to start getting AI-powered insights.");
    } else if (stats.dataSources < 3 && user.subscriptionTier === 'starter') {
      insights.push(`You're using ${stats.dataSources} of 3 available data sources on your Starter plan.`);
    }
    
    if (stats.totalRows > 10000) {
      insights.push("You're analyzing large datasets efficiently with Euno!");
    }
    
    if (!stats.lastActivity || stats.lastActivity < oneWeekAgo) {
      insights.push("We miss you! Log in to explore new features and insights.");
    }
    
    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      subscriptionTier: user.subscriptionTier,
      stats,
      insights
    };
    
  } catch (error) {
    logger.error('Failed to generate user report', { userId: user.id, error });
    throw error;
  }
}

// Format email HTML
function formatEmailHtml(report: UserReport): string {
  const insightsHtml = report.insights.map(insight => 
    `<li style="margin-bottom: 8px;">${insight}</li>`
  ).join('');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Weekly Euno Report</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
    <h1 style="color: #0066cc; margin: 0 0 10px 0;">Your Weekly Euno Report</h1>
    <p style="color: #666; margin: 0;">Hi ${report.username}, here's your data activity summary</p>
  </div>
  
  <div style="background-color: #fff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h2 style="color: #333; margin-top: 0;">📊 Your Stats This Week</h2>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
      <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px;">
        <h3 style="margin: 0 0 5px 0; color: #1976d2;">${report.stats.dataSources}</h3>
        <p style="margin: 0; color: #666; font-size: 14px;">Data Sources</p>
      </div>
      
      <div style="background-color: #f3e5f5; padding: 20px; border-radius: 8px;">
        <h3 style="margin: 0 0 5px 0; color: #7b1fa2;">${report.stats.totalRows.toLocaleString()}</h3>
        <p style="margin: 0; color: #666; font-size: 14px;">Total Rows</p>
      </div>
      
      <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px;">
        <h3 style="margin: 0 0 5px 0; color: #388e3c;">${report.stats.conversations}</h3>
        <p style="margin: 0; color: #666; font-size: 14px;">Conversations</p>
      </div>
      
      <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px;">
        <h3 style="margin: 0 0 5px 0; color: #f57c00;">${report.stats.messagesThisWeek}</h3>
        <p style="margin: 0; color: #666; font-size: 14px;">Messages This Week</p>
      </div>
    </div>
    
    ${insightsHtml ? `
    <h2 style="color: #333;">💡 Insights & Recommendations</h2>
    <ul style="padding-left: 20px; color: #555;">
      ${insightsHtml}
    </ul>
    ` : ''}
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 14px; margin-bottom: 15px;">
        Your current plan: <strong>${report.subscriptionTier.charAt(0).toUpperCase() + report.subscriptionTier.slice(1)}</strong>
      </p>
      
      <a href="https://acre.app/dashboard" style="display: inline-block; background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: 500;">
        View Dashboard
      </a>
    </div>
  </div>
  
  <div style="margin-top: 30px; text-align: center; color: #999; font-size: 12px;">
    <p>You're receiving this because you're subscribed to Euno weekly reports.</p>
    <p><a href="https://acre.app/settings/notifications" style="color: #0066cc;">Manage notification preferences</a></p>
  </div>
</body>
</html>
  `;
}

// Send email to a single user
async function sendUserReport(report: UserReport): Promise<EmailResult> {
  const emailData = {
    to: report.email,
    from: process.env.SENDGRID_FROM_EMAIL || 'reports@acre.app', // Must be verified in SendGrid
    subject: `Your Weekly Euno Report - ${report.stats.messagesThisWeek} insights generated`,
    html: formatEmailHtml(report),
    text: `Hi ${report.username}, here's your weekly Euno report. You generated ${report.stats.messagesThisWeek} insights this week from ${report.stats.dataSources} data sources.` // Plain text fallback
  };
  
  const sendOperation = async () => {
    // In test mode, just log the email
    if (process.env.NODE_ENV === 'test' || !process.env.SENDGRID_API_KEY) {
      logger.info('Test mode: Would send email', { 
        to: emailData.to, 
        subject: emailData.subject 
      });
      return { success: true };
    }
    
    const result = await sendEmail(emailData);
    if (!result.success) {
      throw new Error(result.error || 'Failed to send email');
    }
    return { success: true };
  };
  
  const { result, retries, error } = await retryOperation(
    sendOperation,
    `send email to ${report.email}`
  );
  
  if (error) {
    return {
      userId: report.userId,
      email: report.email,
      success: false,
      error: error.message,
      retries
    };
  }
  
  logger.info('Successfully sent report email', { 
    userId: report.userId, 
    email: report.email,
    retries 
  });
  
  return {
    userId: report.userId,
    email: report.email,
    success: true,
    retries
  };
}

// Main function to send all reports
export async function sendWeeklyReports(): Promise<{
  success: boolean;
  results: EmailResult[];
  summary: any;
}> {
  const jobStartTime = Date.now();
  logger.info('Starting weekly email reports job');
  
  try {
    // Get all active users (logged in within last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeUsers = await db
      .select()
      .from(users)
      .where(gte(users.createdAt, thirtyDaysAgo)); // In production, use lastLoginAt
    
    logger.info(`Found ${activeUsers.length} active users for reports`);
    
    const results: EmailResult[] = [];
    
    // Process users in batches
    for (let i = 0; i < activeUsers.length; i += BATCH_SIZE) {
      const batch = activeUsers.slice(i, i + BATCH_SIZE);
      
      // Generate reports for batch
      const reports = await Promise.all(
        batch.map(user => generateUserReport(user))
      );
      
      // Send emails for batch
      const batchResults = await Promise.all(
        reports.map(report => sendUserReport(report))
      );
      
      results.push(...batchResults);
      
      // Add delay between batches to avoid rate limits
      if (i + BATCH_SIZE < activeUsers.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Calculate summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalRetries = results.reduce((sum, r) => sum + r.retries, 0);
    const totalDuration = Date.now() - jobStartTime;
    
    const summary = {
      totalUsers: results.length,
      successful,
      failed,
      totalRetries,
      totalDuration,
      averageTimePerUser: results.length > 0 ? totalDuration / results.length : 0
    };
    
    logger.info('Email reports job completed', summary);
    
    return {
      success: failed === 0,
      results,
      summary
    };
    
  } catch (error: any) {
    logger.error('Email reports job failed', { error: error.message });
    throw error;
  }
}

// Lambda handler wrapper
export const lambdaHandler = async (event: any, context: any) => {
  try {
    const result = await sendWeeklyReports();
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error: any) {
    logger.error('Lambda execution failed', { error: error.message });
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        success: false
      })
    };
  }
};

// Cron job wrapper
export const cronJob = async () => {
  try {
    const result = await sendWeeklyReports();
    if (!result.success) {
      process.exit(1);
    }
  } catch (error) {
    logger.error('Cron job failed', { error });
    process.exit(1);
  }
};

// Test the email function
if (require.main === module) {
  logger.info('Running email reports test');
  
  // Override for testing
  process.env.NODE_ENV = 'test';
  
  sendWeeklyReports()
    .then(result => {
      logger.info('Email job completed', { result });
      process.exit(0);
    })
    .catch(error => {
      logger.error('Email job failed', { error });
      process.exit(1);
    });
}