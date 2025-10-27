/**
 * Enhanced Chat API v3 with Advanced Analytics Agent
 */

import { Router, Request, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db';
import { users, dataSources, chatConversations, chatMessages } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { 
  processAnalyticsQuery, 
  executeSQLQuery, 
  generateFollowUpQuestions,
  AnalyticsTaskType 
} from '../ai/analytics-agent';
import { nanoid } from 'nanoid';
import * as chatService from '../services/chatService';
import { checkRateLimit } from '../ai/rate';

const router = Router();

// Tier configurations
const TIER_LIMITS = {
  starter: {
    maxQueriesPerHour: 5,
    maxRowsPerQuery: 1000,
    allowVisualization: false,
    allowCharts: false,  // Starter: No automatic charts
    allowExport: false,
    models: ['gpt-4o']
  },
  professional: {
    maxQueriesPerHour: 25,
    maxRowsPerQuery: 5000,
    allowVisualization: true,
    allowCharts: true,  // Professional: Automatic charts enabled
    allowExport: true,
    models: ['gpt-4o', 'gpt-4-turbo-preview']
  },
  enterprise: {
    maxQueriesPerHour: Infinity,
    maxRowsPerQuery: 50000,
    allowVisualization: true,
    allowCharts: true,  // Enterprise: Automatic charts enabled
    allowExport: true,
    models: ['gpt-4o', 'gpt-4-turbo-preview', 'claude-3-opus'] // Future: add Claude when available
  }
};

/**
 * POST /api/chat/v3/analyze - Main analytics endpoint
 */
router.post('/analyze', requireAuth, async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const {
      message,
      conversationId,
      dataSourceId,
      requestId = nanoid(),
      extendedThinking = false,
      requestVisualization = false
    } = req.body;
    
    // Validate request
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Get user and check tier
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const tier = user.subscriptionTier || 'starter';
    const tierConfig = TIER_LIMITS[tier as keyof typeof TIER_LIMITS];
    
    // Rate limiting
    const rateLimit = await checkRateLimit(userId, tier);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: rateLimit.message || 'Rate limit exceeded',
        retryAfter: 60
      });
    }
    
    // Note: Chart generation now happens automatically for Pro/Enterprise tiers
    // No need to request visualization explicitly
    
    // Get data source and schema
    let dataSource = null;
    let schema = null;
    let sampleData = [];
    
    if (dataSourceId) {
      [dataSource] = await db
        .select()
        .from(dataSources)
        .where(and(
          eq(dataSources.id, dataSourceId),
          eq(dataSources.userId, userId)
        ))
        .limit(1);
      
      if (!dataSource) {
        return res.status(404).json({ error: 'Data source not found' });
      }
      
      schema = dataSource.schema;
      
      // Get sample data for context
      const dataResult = await executeSQLQuery(
        `SELECT * LIMIT 10`,
        dataSourceId
      );
      
      if (dataResult.success) {
        sampleData = dataResult.data || [];
      }
    }
    
    // Save user message
    const userMessage = await chatService.saveUserMessage({
      userId,
      conversationId,
      content: message,
      requestId,
      dataSourceId
    });
    
    // Check for duplicate
    if (userMessage.isDuplicate) {
      const existingResponse = await chatService.getExistingAIResponse(userMessage.id);
      if (existingResponse) {
        return res.json({
          conversationId: userMessage.conversationId,
          messageId: existingResponse.id,
          content: existingResponse.content,
          metadata: existingResponse.metadata,
          isDuplicate: true,
          tier
        });
      }
    }
    
    // Process with analytics agent
    const analyticsResult = await processAnalyticsQuery({
      query: message,
      userId,
      dataSourceId,
      schema,
      sampleData,
      context: extendedThinking ? 'Provide detailed analysis' : 'Be concise'
    });
    
    // Execute SQL if generated
    let queryResults: any[] | null = null;
    if (analyticsResult.sql && dataSourceId) {
      // Execute with tier row limit
      const sqlResult = await executeSQLQuery(
        analyticsResult.sql, 
        dataSourceId,
        tierConfig.maxRowsPerQuery
      );
      
      if (sqlResult.success) {
        queryResults = sqlResult.data || [];
        
        // Re-analyze with actual results if we have data
        if (queryResults.length > 0) {
          // Truncate data for prompt to prevent token overflow
          const truncatedData = queryResults.slice(0, 10).map(row => {
            // Limit each row to prevent wide row issues
            const truncated: any = {};
            const keys = Object.keys(row).slice(0, 20); // Max 20 columns
            for (const key of keys) {
              const value = row[key];
              // Truncate long strings
              if (typeof value === 'string' && value.length > 100) {
                truncated[key] = value.substring(0, 100) + '...';
              } else {
                truncated[key] = value;
              }
            }
            return truncated;
          });
          
          const enhancedResult = await processAnalyticsQuery({
            query: `Analyze these query results and provide business insights: ${JSON.stringify(truncatedData)}`,
            taskType: AnalyticsTaskType.DATA_ANALYSIS,
            userId,
            schema,
            sampleData: truncatedData
          });
          
          analyticsResult.result = enhancedResult.result;
        }
      } else {
        // Include error in response
        analyticsResult.result = `I was unable to execute the query: ${sqlResult.error}. Please check your data source connection.`;
        analyticsResult.confidence = 0.3;
      }
    }
    
    // Automatically generate visualization for Pro/Enterprise users when data is visual-worthy
    let visualization = null;
    if (tierConfig.allowCharts && queryResults && queryResults.length > 0) {
      visualization = smartGenerateVisualization(queryResults, schema, message);
    }
    
    // Generate follow-up questions
    const followUpQuestions = generateFollowUpQuestions(
      analyticsResult.taskType,
      analyticsResult.result,
      schema
    );
    
    // Prepare response metadata
    const responseMetadata = {
      taskType: analyticsResult.taskType,
      confidence: analyticsResult.confidence,
      executionTime: Date.now() - startTime,
      sql: analyticsResult.sql,
      visualization,
      followUpQuestions,
      dataQuality: analyticsResult.metadata?.dataQuality,
      rowsAnalyzed: (queryResults && queryResults.length) || 0,
      tier
    };
    
    // Save AI response
    const aiMessageId = await chatService.createAIMessage(
      userMessage.conversationId,
      requestId
    );
    
    await chatService.updateAIMessage(
      aiMessageId,
      analyticsResult.result,
      responseMetadata,
      true
    );
    
    const aiMessage = { id: aiMessageId };
    
    // Update conversation title if new
    if (!conversationId) {
      await updateConversationTitle(userMessage.conversationId, message);
    }
    
    // Log analytics event
    logger.info('Analytics query processed', {
      userId,
      conversationId: userMessage.conversationId,
      taskType: analyticsResult.taskType,
      executionTime: responseMetadata.executionTime,
      confidence: analyticsResult.confidence
    });
    
    // Return response
    res.json({
      conversationId: userMessage.conversationId,
      messageId: aiMessage.id,
      content: analyticsResult.result,
      metadata: responseMetadata,
      tier
    });
    
  } catch (error) {
    logger.error('Chat V3 error', { error, userId: (req as AuthenticatedRequest).user.id });
    res.status(500).json({ 
      error: 'Failed to process your request. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * GET /api/chat/v3/conversations - Get user conversations
 */
router.get('/conversations', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const { limit = 20, offset = 0 } = req.query;
    
    const conversations = await db
      .select({
        id: chatConversations.id,
        title: chatConversations.title,
        category: chatConversations.category,
        createdAt: chatConversations.createdAt,
        dataSourceId: chatConversations.dataSourceId
      })
      .from(chatConversations)
      .where(eq(chatConversations.userId, userId))
      .orderBy(desc(chatConversations.createdAt))
      .limit(Number(limit))
      .offset(Number(offset));
    
    res.json(conversations);
    
  } catch (error) {
    logger.error('Error fetching conversations', { error, userId: (req as AuthenticatedRequest).user.id });
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * GET /api/chat/v3/messages/:conversationId - Get conversation messages
 */
router.get('/messages/:conversationId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const conversationId = parseInt(req.params.conversationId);
    
    // Verify conversation belongs to user
    const [conversation] = await db
      .select()
      .from(chatConversations)
      .where(and(
        eq(chatConversations.id, conversationId),
        eq(chatConversations.userId, userId)
      ))
      .limit(1);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Get messages
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(chatMessages.createdAt);
    
    res.json({
      conversation,
      messages
    });
    
  } catch (error) {
    logger.error('Error fetching messages', { error, userId: (req as AuthenticatedRequest).user.id });
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * POST /api/chat/v3/export - Export conversation or results
 */
router.post('/export', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const { conversationId, format = 'csv' } = req.body;
    
    // Check tier permissions
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    const tier = user?.subscriptionTier || 'starter';
    const tierConfig = TIER_LIMITS[tier as keyof typeof TIER_LIMITS];
    
    if (!tierConfig.allowExport) {
      return res.status(403).json({
        error: 'Export feature is not available on your plan. Please upgrade to Professional or Enterprise.',
        tier
      });
    }
    
    // Implementation for export would go here
    // For now, return a placeholder
    res.json({
      message: 'Export feature coming soon',
      format,
      conversationId
    });
    
  } catch (error) {
    logger.error('Export error', { error, userId: (req as AuthenticatedRequest).user.id });
    res.status(500).json({ error: 'Export failed' });
  }
});

/**
 * Smart visualization generator - Automatically creates charts when data is visual-worthy
 * Only for Professional and Enterprise tiers
 */
function smartGenerateVisualization(data: any[], schema: any, query: string): any {
  if (!data || data.length === 0) return null;
  
  const firstRow = data[0];
  const keys = Object.keys(firstRow);
  
  // Detect column types
  const numericColumns = keys.filter(key => {
    const value = firstRow[key];
    return typeof value === 'number' && !isNaN(value);
  });
  
  const dateColumns = keys.filter(key => {
    const lowerKey = key.toLowerCase();
    return lowerKey.includes('date') || 
           lowerKey.includes('time') ||
           lowerKey.includes('created') ||
           lowerKey.includes('updated') ||
           lowerKey.includes('month') ||
           lowerKey.includes('year') ||
           lowerKey.includes('day');
  });
  
  const categoryColumns = keys.filter(key => {
    const value = firstRow[key];
    return typeof value === 'string' && 
           !dateColumns.includes(key) &&
           key.toLowerCase() !== 'id';
  });
  
  // Check if data has enough variation to be visual-worthy
  const hasMultipleRows = data.length >= 3;
  if (!hasMultipleRows) return null;
  
  // Calculate variation in numeric columns
  const hasVariation = numericColumns.some(col => {
    const values = data.map(row => row[col]).filter(v => v != null);
    if (values.length < 2) return false;
    const min = Math.min(...values);
    const max = Math.max(...values);
    return max > min; // Some variation exists
  });
  
  if (!hasVariation && numericColumns.length > 0) return null;
  
  // Smart chart type selection based on data structure
  
  // 1. TIME SERIES: Date column + numeric column = Line chart
  if (dateColumns.length > 0 && numericColumns.length > 0) {
    const dateCol = dateColumns[0];
    const numCol = numericColumns[0];
    
    return {
      type: 'line',
      data: data.slice(0, 100).map(row => ({
        name: formatDateForChart(row[dateCol]),
        value: row[numCol]
      })),
      config: {
        xAxis: 'name',
        yAxis: 'value',
        title: `${formatColumnName(numCol)} over time`
      }
    };
  }
  
  // 2. COMPARISON: Category + numeric = Bar chart
  if (categoryColumns.length > 0 && numericColumns.length > 0 && data.length <= 50) {
    const catCol = categoryColumns[0];
    const numCol = numericColumns[0];
    
    return {
      type: 'bar',
      data: data.slice(0, 20).map(row => ({
        name: String(row[catCol] || 'Unknown').substring(0, 30),
        value: row[numCol]
      })),
      config: {
        xAxis: 'name',
        yAxis: 'value',
        title: `${formatColumnName(numCol)} by ${formatColumnName(catCol)}`
      }
    };
  }
  
  // 3. DISTRIBUTION: Grouped data (count, sum, etc.) = Pie chart
  if (data.length <= 10 && categoryColumns.length > 0 && numericColumns.length > 0) {
    const catCol = categoryColumns[0];
    const numCol = numericColumns[0];
    
    // Check if this looks like aggregated data
    const queryLower = query.toLowerCase();
    const isAggregation = queryLower.includes('group') || 
                         queryLower.includes('count') || 
                         queryLower.includes('sum') ||
                         queryLower.includes('total') ||
                         queryLower.includes('breakdown') ||
                         queryLower.includes('distribution');
    
    if (isAggregation) {
      return {
        type: 'pie',
        data: data.map(row => ({
          name: String(row[catCol] || 'Unknown').substring(0, 30),
          value: row[numCol]
        })),
        config: {
          valueKey: 'value',
          title: `${formatColumnName(numCol)} distribution`
        }
      };
    }
  }
  
  // 4. RANKING/TOP N: Limited rows with ranking keywords = Bar chart
  if (data.length <= 15 && numericColumns.length > 0) {
    const queryLower = query.toLowerCase();
    const isRanking = queryLower.includes('top') || 
                     queryLower.includes('best') || 
                     queryLower.includes('most') ||
                     queryLower.includes('highest') ||
                     queryLower.includes('lowest');
    
    if (isRanking && categoryColumns.length > 0) {
      const catCol = categoryColumns[0];
      const numCol = numericColumns[0];
      
      return {
        type: 'bar',
        data: data.slice(0, 15).map(row => ({
          name: String(row[catCol] || 'Unknown').substring(0, 30),
          value: row[numCol]
        })),
        config: {
          xAxis: 'name',
          yAxis: 'value',
          title: `Top ${formatColumnName(catCol)}`
        }
      };
    }
  }
  
  // If data doesn't fit any visual-worthy pattern, don't generate chart
  return null;
}

/**
 * Format date for chart display
 */
function formatDateForChart(dateValue: any): string {
  if (!dateValue) return 'Unknown';
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return String(dateValue);
  
  // Format as MMM DD or MMM YYYY depending on data
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format column name for display
 */
function formatColumnName(colName: string): string {
  return colName
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Helper function to update conversation title
 */
async function updateConversationTitle(conversationId: number, message: string) {
  try {
    // Generate a title from the first message
    const title = message.length > 50 
      ? message.substring(0, 47) + '...' 
      : message;
    
    await db
      .update(chatConversations)
      .set({ title })
      .where(eq(chatConversations.id, conversationId));
      
  } catch (error) {
    logger.error('Error updating conversation title', { error, conversationId });
  }
}

export default router;