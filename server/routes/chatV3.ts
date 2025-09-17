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
    allowExport: false,
    models: ['gpt-4o']
  },
  professional: {
    maxQueriesPerHour: 25,
    maxRowsPerQuery: 5000,
    allowVisualization: true,
    allowExport: true,
    models: ['gpt-4o', 'gpt-4-turbo-preview']
  },
  enterprise: {
    maxQueriesPerHour: Infinity,
    maxRowsPerQuery: 50000,
    allowVisualization: true,
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
    
    // Check visualization permission
    if (requestVisualization && !tierConfig.allowVisualization) {
      return res.status(403).json({
        error: 'Visualizations are not available on your plan. Please upgrade to Professional or Enterprise.',
        tier
      });
    }
    
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
    let queryResults = null;
    if (analyticsResult.sql && dataSourceId) {
      const sqlResult = await executeSQLQuery(analyticsResult.sql, dataSourceId);
      if (sqlResult.success) {
        queryResults = sqlResult.data;
        
        // Re-analyze with actual results
        const enhancedResult = await processAnalyticsQuery({
          query: `Analyze these results: ${JSON.stringify(queryResults.slice(0, 10))}`,
          taskType: AnalyticsTaskType.DATA_ANALYSIS,
          userId,
          schema,
          sampleData: queryResults
        });
        
        analyticsResult.result = enhancedResult.result;
      }
    }
    
    // Generate visualization if requested and allowed
    let visualization = null;
    if (requestVisualization && tierConfig.allowVisualization && queryResults && queryResults.length > 0) {
      visualization = generateVisualization(queryResults, schema);
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
 * Helper function to generate visualization config
 */
function generateVisualization(data: any[], schema: any): any {
  if (!data || data.length === 0) return null;
  
  // Detect numeric and date columns
  const firstRow = data[0];
  const numericColumns = Object.keys(firstRow).filter(key => 
    typeof firstRow[key] === 'number'
  );
  const dateColumns = Object.keys(firstRow).filter(key =>
    key.toLowerCase().includes('date') || 
    key.toLowerCase().includes('time') ||
    key.toLowerCase().includes('created') ||
    key.toLowerCase().includes('updated')
  );
  
  // Simple heuristic for chart type selection
  if (dateColumns.length > 0 && numericColumns.length > 0) {
    // Time series chart
    return {
      type: 'line',
      data: data.slice(0, 100), // Limit data points
      config: {
        xAxis: dateColumns[0],
        yAxis: numericColumns[0],
        title: `${numericColumns[0]} over time`
      }
    };
  } else if (numericColumns.length >= 2) {
    // Bar chart for comparison
    return {
      type: 'bar',
      data: data.slice(0, 20),
      config: {
        xAxis: Object.keys(firstRow)[0],
        yAxis: numericColumns[0],
        title: `${numericColumns[0]} by ${Object.keys(firstRow)[0]}`
      }
    };
  }
  
  return null;
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