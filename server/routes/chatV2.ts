import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { handleChat } from '../ai/orchestrator';
import { getActiveDataSource } from '../data/datasource';
import { db } from '../db';
import { users, dataSources } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';
import * as chatService from '../services/chatService';
import { TIERS } from '../ai/tiers';
import { v4 as uuidv4 } from 'uuid';
import { 
  mapQueryToSchema, 
  generateRewriteRequest,
  generateClarifyingQuestion, 
  generateExampleQuestions, 
  logScopeMismatch,
  type DataSourceInfo 
} from '../ai/queryMapper';
import { 
  generateFollowUpSuggestions,
  generateSchemaBasedSuggestions,
  type FollowUpSuggestion 
} from '../ai/suggestionGenerator';

const router = Router();

// Helper to enforce tier restrictions
function enforceTierRestrictions(tier: string, features: any) {
  const tierConfig = TIERS[tier as keyof typeof TIERS] || TIERS.starter;
  
  return {
    allowCharts: tierConfig.allowCharts,  // Automatic for Pro/Enterprise (removed requestChart requirement)
    allowForecast: tierConfig.allowForecast && features.requestForecast,
    allowElaboration: tierConfig.allowElaboration,
    allowSuggestions: tierConfig.allowSuggestions,
    maxQueriesPerHour: tierConfig.maxQueriesPerHour
  };
}

// POST /api/chat/v2/send - Send message with deduplication and uniform off-topic handling
router.post('/send', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { 
      message, 
      conversationId, 
      requestId = uuidv4(), 
      requestChart = false,
      requestForecast = false 
    } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Get user tier
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const tier = user.subscriptionTier || 'starter';
    
    // Load connected data sources and schemas
    const userDataSources = await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.userId, userId));
    
    const dataSourceInfos: DataSourceInfo[] = userDataSources.map(ds => ({
      id: ds.id,
      name: ds.name,
      type: ds.type,
      schema: ds.schema || {}
    }));
    
    // Map query to available schema fields (uniform across all tiers)
    const queryMapping = await mapQueryToSchema(message, dataSourceInfos);
    
    // Save user message (with deduplication)
    const userMessage = await chatService.saveUserMessage({
      userId,
      conversationId,
      content: message,
      requestId,
      dataSourceId: dataSourceInfos[0]?.id
    });
    
    // If message was a duplicate, try to find existing AI response
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
    
    // Create placeholder AI message
    const aiMessageId = await chatService.createAIMessage(
      userMessage.conversationId,
      requestId
    );
    
    let responseContent: string;
    let responseMetadata: any = { tier, mappingResult: queryMapping };
    
    // Handle based on mapping result (uniform across all tiers)
    if (dataSourceInfos.length === 0) {
      // No data sources connected
      responseContent = "Please connect a database or upload a file first. Go to the Data Sources page to add your data.";
      responseMetadata.intent = 'no_data';
    } else if (!queryMapping.isValid) {
      // Query doesn't align with data - only for truly unrelated queries
      const sourceNames = dataSourceInfos.map(ds => ds.name).join(', ');
      responseContent = `That question doesn't align with the data you've connected. I analyze your ${sourceNames}. Try a metric + segment + time range.`;
      
      // Add example questions
      const examples = generateExampleQuestions(dataSourceInfos);
      if (examples.length > 0) {
        responseContent += '\n\nExample questions:\n• ' + examples.join('\n• ');
      }
      
      // Log scope mismatch
      logScopeMismatch(
        userId,
        tier,
        dataSourceInfos.map(ds => ds.name),
        queryMapping,
        message
      );
      
      responseMetadata.intent = 'scope_mismatch';
      responseMetadata.examples = examples;
    } else if (queryMapping.needsClarification) {
      // Query needs clarification for better accuracy
      const availableFields = dataSourceInfos.flatMap(ds => 
        Object.values(ds.schema || {}).map((col: any) => col.name)
      );
      
      // Generate intelligent clarifying question based on query context
      responseContent = queryMapping.clarificationNeeded || 
                       await generateClarifyingQuestion(
                         message, 
                         availableFields,
                         queryMapping.interpretedIntent
                       );
      
      // Generate smart follow-up suggestions for clarification
      const clarificationSuggestions = generateSchemaBasedSuggestions(dataSourceInfos[0]?.schema || {});
      
      responseMetadata.intent = 'needs_clarification';
      responseMetadata.interpretedIntent = queryMapping.interpretedIntent;
      responseMetadata.suggestions = clarificationSuggestions;
    } else if (queryMapping.missingPieces && queryMapping.missingPieces.length > 0) {
      // Missing information for valid query
      responseContent = await generateRewriteRequest(message, queryMapping.missingPieces);
      
      // Generate contextual suggestions based on what's missing
      const contextSuggestions = generateSchemaBasedSuggestions(dataSourceInfos[0]?.schema || {});
      
      responseMetadata.intent = 'missing_info';
      responseMetadata.missingPieces = queryMapping.missingPieces;
      responseMetadata.suggestions = contextSuggestions;
    } else {
      // Valid query - process with AI
      const extendedResponses = (req.session as any)?.extendedResponses || false;
      
      // Get tier features for advanced functionality (charts, forecasts)
      const tierFeatures = enforceTierRestrictions(tier, { requestChart, requestForecast });
      
      const aiResponse = await handleChat({
        userId,
        tier,
        message,
        conversationId: userMessage.conversationId,
        extendedResponses
      });
      
      // Filter response based on tier restrictions (only for advanced features)
      responseContent = aiResponse.text;
      
      // Generate follow-up suggestions based on context
      const availableFields = dataSourceInfos.flatMap(ds => 
        Object.values(ds.schema || {}).map((col: any) => col.name)
      );
      
      const followUpSuggestions = await generateFollowUpSuggestions(
        message,
        aiResponse.text,
        availableFields,
        tier
      );
      
      responseMetadata = {
        ...responseMetadata,
        ...aiResponse.meta,
        chart: tierFeatures.allowCharts ? aiResponse.chart : undefined,
        suggestions: followUpSuggestions,
        tierRestrictions: {
          chartsBlocked: !tierFeatures.allowCharts && !!aiResponse.chart,
          forecastBlocked: !tierFeatures.allowForecast && aiResponse.meta?.forecast
        }
      };
    }
    
    // Update AI message with complete response
    await chatService.updateAIMessage(
      aiMessageId,
      responseContent,
      responseMetadata,
      true
    );
    
    res.json({
      conversationId: userMessage.conversationId,
      messageId: aiMessageId,
      content: responseContent,
      metadata: responseMetadata,
      isDuplicate: false,
      tier
    });
    
  } catch (error) {
    logger.error('Chat V2 send error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// GET /api/chat/v2/messages/:conversationId - Get conversation messages
router.get('/messages/:conversationId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const conversationId = parseInt(req.params.conversationId);
    
    if (!conversationId || isNaN(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }
    
    const messages = await chatService.getConversationMessages(conversationId, userId);
    
    res.json({ messages });
    
  } catch (error) {
    logger.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// POST /api/chat/v2/stream - Stream AI response
router.post('/stream', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { 
      message, 
      conversationId, 
      requestId = uuidv4() 
    } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    
    // Get user tier
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!user) {
      res.write(`data: ${JSON.stringify({ error: 'User not found' })}\n\n`);
      res.end();
      return;
    }
    
    const tier = user.subscriptionTier || 'starter';
    
    // Save user message
    const userMessage = await chatService.saveUserMessage({
      userId,
      conversationId,
      content: message,
      requestId
    });
    
    // If duplicate, return cached response
    if (userMessage.isDuplicate) {
      const existingResponse = await chatService.getExistingAIResponse(userMessage.id);
      if (existingResponse) {
        res.write(`data: ${JSON.stringify({
          type: 'complete',
          conversationId: userMessage.conversationId,
          messageId: existingResponse.id,
          content: existingResponse.content,
          metadata: existingResponse.metadata,
          isDuplicate: true
        })}\n\n`);
        res.end();
        return;
      }
    }
    
    // Create AI message placeholder
    const aiMessageId = await chatService.createAIMessage(
      userMessage.conversationId,
      requestId
    );
    
    // Send initial event
    res.write(`data: ${JSON.stringify({
      type: 'start',
      conversationId: userMessage.conversationId,
      messageId: aiMessageId
    })}\n\n`);
    
    // Simulate streaming (in production, integrate with OpenAI streaming)
    const extendedResponses = (req.session as any)?.extendedResponses || false;
    const aiResponse = await handleChat({
      userId,
      tier,
      message,
      conversationId: userMessage.conversationId,
      extendedResponses
    });
    
    // Stream the response in chunks
    const words = aiResponse.text.split(' ');
    let accumulated = '';
    
    for (let i = 0; i < words.length; i++) {
      accumulated += (i > 0 ? ' ' : '') + words[i];
      
      // Send chunk event
      res.write(`data: ${JSON.stringify({
        type: 'chunk',
        messageId: aiMessageId,
        content: accumulated
      })}\n\n`);
      
      // Update message in database periodically
      if (i % 10 === 0 || i === words.length - 1) {
        await chatService.updateAIMessage(
          aiMessageId,
          accumulated,
          i === words.length - 1 ? aiResponse.meta : undefined,
          i === words.length - 1
        );
      }
      
      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Send complete event
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      messageId: aiMessageId,
      content: aiResponse.text,
      chart: aiResponse.chart,
      metadata: aiResponse.meta
    })}\n\n`);
    
    res.end();
    
  } catch (error) {
    logger.error('Chat V2 stream error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Failed to stream response' })}\n\n`);
    res.end();
  }
});

// GET /api/chat/v2/tier - Get user tier and restrictions
router.get('/tier', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const tier = user.subscriptionTier || 'starter';
    const tierConfig = TIERS[tier as keyof typeof TIERS] || TIERS.starter;
    
    res.json({
      tier,
      features: {
        maxQueriesPerHour: tierConfig.maxQueriesPerHour,
        allowCharts: tierConfig.allowCharts,
        allowForecast: tierConfig.allowForecast,
        allowElaboration: tierConfig.allowElaboration,
        allowSuggestions: tierConfig.allowSuggestions
      }
    });
    
  } catch (error) {
    logger.error('Get tier error:', error);
    res.status(500).json({ error: 'Failed to get tier information' });
  }
});

export default router;