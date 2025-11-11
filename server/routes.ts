import express, { type Express, type Request } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { processFile, validateFile } from "./services/fileProcessor";
import { generateDataInsight } from "./services/openai";
import { insertDataSourceSchema, insertChatMessageSchema } from "@shared/schema";
import { requireAuth, createUserRateLimit, AuthenticatedRequest } from "./middleware/auth";
import { validateChatMessage, validateFileUpload, validateConversationId } from "./middleware/validation";
import { requireOwnership, validateFileUploadSecurity, monitorRequestSize, ipRateLimit } from "./middleware/security";
import { logger, logFileUpload, logETLProcess, logAICall, logPaymentEvent } from "./utils/logger";
import authRoutes from "./routes/auth";
import oauthHandlers from "./routes/oauth-handlers";
import dataSourcesRoutes from "./routes/data-sources";
import uploadRoutes from "./routes/uploads";
import webhookRoutes from "./routes/webhooks";
import subscriptionRoutes from "./routes/subscription";
import pipelineTestRoutes from "./routes/pipeline-test";
import apiPushRoutes from "./routes/api-push";
import healthRoutes from "./routes/health";
import blogRoutes from "./routes/blog";
import aiRoutes from "./routes/ai";
import teamRoutes from "./routes/team";
import chatV2Routes from "./routes/chatV2";
import chatV3Routes from "./routes/chatV3";
import connectionRoutes from "./routes/connections";
import lightspeedRoutes from "./routes/lightspeed";
import userRoutes from "./routes/user";
import googleSheetsRoutes from "./routes/google-sheets";
import { initializeScheduler, shutdownScheduler } from "./services/scheduler";
import { sendContactFormEmail } from "./services/awsSes";
import { getCachedResponse, cacheQueryResponse } from "./ai/queryCache";

// Extend Express Request interface for file uploads
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },
  fileFilter: (req: any, file: any, cb: any) => {
    const validation = validateFile(file);
    if (validation.valid) {
      cb(null, true);
    } else {
      cb(new Error(validation.error || 'Invalid file'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint - no authentication required
  app.get('/health', (req, res) => {
    const startTime = process.hrtime();
    
    // Check database connection
    storage.getUser(1).then(() => {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const responseTime = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
      
      res.status(200).json({
        status: 'healthy',
        message: 'Euno API is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
        database: 'connected',
        responseTime: `${responseTime.toFixed(2)}ms`
      });
    }).catch((error) => {
      logger.error('Health check failed - database connection error', { error });
      res.status(503).json({
        status: 'unhealthy',
        message: 'Database connection failed',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        error: 'Database unavailable'
      });
    });
  });

  // Authentication routes with IP rate limiting
  app.use('/api/auth', ipRateLimit(50, 15 * 60 * 1000), authRoutes); // 50 attempts per 15 minutes
  
  // OAuth routes for external service connections
  app.use('/api', oauthHandlers); // OAuth routes handle their own paths
  
  // Connection management routes
  app.use('/api', connectionRoutes); // Connection routes for data integrations
  
  // Lightspeed OAuth routes  
  app.use('/api', lightspeedRoutes);
  
  // Google Sheets routes (using Replit connector)
  app.use('/api', googleSheetsRoutes);
  
  // Subscription routes
  app.use('/api/subscription', subscriptionRoutes);
  
  // Data sources routes
  app.use('/api/data-sources', dataSourcesRoutes);
  
  // File upload routes
  app.use('/api/files', uploadRoutes);
  
  // Webhook routes - no auth required (webhooks verify themselves)
  app.use('/api/webhooks', webhookRoutes);
  
  // Pipeline test routes
  app.use('/api/pipeline', pipelineTestRoutes);
  
  // API Push routes for user-specific data endpoints
  app.use('/api/push', apiPushRoutes);
  
  // Health check routes
  app.use('/api/health', healthRoutes);
  
  // Blog routes
  app.use('/api/blog', blogRoutes);
  
  // AI Chat routes
  app.use('/api/ai', aiRoutes);
  
  // User routes (profile, data export, etc.)
  app.use('/api/user', userRoutes);
  
  // Improved Chat V2 routes with deduplication
  app.use('/api/chat/v2', chatV2Routes);
  
  // Enhanced Chat V3 routes with advanced analytics agent
  app.use('/api/chat/v3', chatV3Routes);

  // Team management routes
  app.use('/api', teamRoutes);

  // Contact form endpoint - public with rate limiting
  app.post('/api/contact', 
    ipRateLimit(5, 15 * 60 * 1000), // 5 submissions per 15 minutes
    express.json(),
    async (req, res) => {
      try {
        const { name, email, subject, message } = req.body;
        
        // Validate required fields
        if (!name || !email || !subject || !message) {
          return res.status(400).json({ 
            error: 'All fields are required: name, email, subject, message' 
          });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({ 
            error: 'Please provide a valid email address' 
          });
        }

        // Send the email
        const result = await sendContactFormEmail({ name, email, subject, message });
        
        if (result.success) {
          logger.info('Contact form submission sent', { 
            from: email, 
            subject,
            messageId: result.messageId 
          });
          
          res.json({ 
            success: true, 
            message: 'Your message has been sent successfully. We\'ll get back to you within 24 hours.' 
          });
        } else {
          logger.error('Failed to send contact form email', { 
            error: result.error,
            from: email 
          });
          
          res.status(500).json({ 
            error: 'Failed to send message. Please try again later or email us directly at support@askeuno.com' 
          });
        }
      } catch (error: any) {
        logger.error('Contact form error', { error: error.message });
        res.status(500).json({ 
          error: 'An unexpected error occurred. Please try again later.' 
        });
      }
    }
  );

  // Rate limiting for AI features
  const aiRateLimit = createUserRateLimit(
    60 * 60 * 1000, // 1 hour
    50, // 50 requests per hour
    'AI usage limit exceeded. Please upgrade your plan or try again later.'
  );

  // File upload endpoint - protected with comprehensive security
  app.post('/api/upload', 
    requireAuth, 
    monitorRequestSize,
    upload.single('file'), 
    validateFileUpload,
    validateFileUploadSecurity,
    async (req: MulterRequest, res) => {
      // Log file details for debugging
      if (!req.file) {
        logger.warn('Upload attempt with no file', { userId: req.user?.id });
        return res.status(400).json({ error: 'No file uploaded' });
      }
    const startTime = Date.now();
    const userId = (req as AuthenticatedRequest).user.id;
    
    try {
      if (!req.file) {
        logFileUpload(userId, 'unknown', 'failure', { error: 'No file uploaded' });
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileExt = path.extname(req.file.originalname).substring(1);
      logger.info('File upload started', { userId, fileName: req.file.originalname, fileSize: req.file.size });
      
      // ETL Stage 1: File Processing
      logETLProcess(0, 'file_processing', 'started', { fileName: req.file.originalname });
      const processedData = await processFile(req.file.path, fileExt);
      logETLProcess(0, 'file_processing', 'completed', { 
        rowsProcessed: processedData.rowCount,
        duration: Date.now() - startTime 
      });
      
      // Check user's tier and data source limits
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const currentDataSources = await storage.getDataSourcesByUserId(userId);
      const dataSourceLimit = DATA_SOURCE_LIMITS[user.subscriptionTier as keyof typeof DATA_SOURCE_LIMITS] || DATA_SOURCE_LIMITS.starter;
      
      if (currentDataSources.length >= dataSourceLimit) {
        logFileUpload(userId, req.file.originalname, 'failure', { error: 'Data source limit exceeded' });
        return res.status(429).json({ 
          error: `You've reached your limit of ${dataSourceLimit} database connection${dataSourceLimit === 1 ? '' : 's'}. Please upgrade your plan or remove an existing connection.`,
          currentCount: currentDataSources.length,
          limit: dataSourceLimit,
          tier: user.subscriptionTier
        });
      }

      // ETL Stage 2: Data Storage
      const storageStartTime = Date.now();
      logETLProcess(0, 'data_storage', 'started');
      const dataSource = await storage.createDataSource({
        userId,
        name: req.file.originalname,
        type: fileExt,
        filePath: req.file.path,
        schema: processedData.schema,
        rowCount: processedData.rowCount,
        lastSyncAt: new Date(),
      });

      // Insert data rows
      await storage.insertDataRows(dataSource.id, processedData.data);
      logETLProcess(dataSource.id, 'data_storage', 'completed', { 
        rowsProcessed: processedData.rowCount,
        duration: Date.now() - storageStartTime 
      });

      // Log successful upload
      logFileUpload(userId, req.file.originalname, 'success', {
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        processingTime: Date.now() - startTime,
        rowsProcessed: processedData.rowCount,
      });

      res.json({
        success: true,
        dataSource: {
          id: dataSource.id,
          name: dataSource.name,
          type: dataSource.type,
          rowCount: dataSource.rowCount,
          schema: dataSource.schema,
        }
      });
    } catch (error: any) {
      logger.error('Upload error:', error);
      logFileUpload(userId, req.file?.originalname || 'unknown', 'failure', { 
        error: error.message,
        fileSize: req.file?.size,
        processingTime: Date.now() - startTime,
      });
      logETLProcess(0, 'error', 'failed', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's data sources - protected
  app.get('/api/data-sources', requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const dataSources = await storage.getDataSourcesByUserId(userId);
      res.json(dataSources);
    } catch (error: any) {
      console.error('Data sources error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get conversations by data source
  app.get('/api/data-sources/:id/conversations', requireAuth, async (req, res) => {
    try {
      const dataSourceId = parseInt(req.params.id);
      
      // Check data source ownership
      const dataSource = await storage.getDataSource(dataSourceId);
      if (!dataSource || dataSource.userId !== (req as AuthenticatedRequest).user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      const conversations = await storage.getConversationsByDataSourceId(dataSourceId);
      res.json(conversations);
    } catch (error: any) {
      console.error('Get conversations by data source error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete data source - protected with ownership check
  app.delete('/api/data-sources/:id', requireAuth, requireOwnership('dataSource'), async (req, res) => {
    try {
      const dataSourceId = parseInt(req.params.id);
      const dataSource = await storage.getDataSource(dataSourceId);
      
      if (!dataSource) {
        return res.status(404).json({ error: 'Data source not found' });
      }

      // Delete S3 file if exists
      if (dataSource.filePath && dataSource.filePath.includes('s3://')) {
        const s3Key = dataSource.filePath.replace('s3://', '');
        const { deleteFromS3 } = await import('./services/s3Service');
        await deleteFromS3(s3Key);
      }

      // Delete the data source (this will cascade delete conversations, messages, and data rows)
      await storage.deleteDataSource(dataSourceId);

      res.json({ success: true, message: 'Data source deleted successfully' });
    } catch (error: any) {
      console.error('Delete data source error:', error);
      res.status(500).json({ error: error.message });
    }
  });



  // Define query limits per tier
  const QUERY_LIMITS = {
    starter: 5,
    professional: 20,
    enterprise: 50
  };

  // Define data source limits per tier
  const DATA_SOURCE_LIMITS = {
    starter: 1,
    professional: 3,
    enterprise: 10
  };

  // Chat endpoint - protected with AI rate limiting
  app.post('/api/chat', requireAuth, aiRateLimit, validateChatMessage, async (req, res) => {
    try {
      const { message, conversationId, dataSourceId, extendedThinking = false, currentCategory = 'general' } = req.body;
      const userId = (req as AuthenticatedRequest).user.id;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Check and reset query count if needed (new month)
      const user = await storage.checkAndResetQueryCount(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get the query limit for the user's tier
      const queryLimit = QUERY_LIMITS[user.subscriptionTier as keyof typeof QUERY_LIMITS] || QUERY_LIMITS.starter;
      
      // Check if user has exceeded their monthly query limit
      if (user.monthlyQueryCount >= queryLimit) {
        return res.status(429).json({ 
          error: `You've reached your monthly limit of ${queryLimit} queries. Please upgrade your plan for more queries.`,
          currentUsage: user.monthlyQueryCount,
          limit: queryLimit,
          tier: user.subscriptionTier
        });
      }

      // Get or create conversation
      let conversation;
      if (conversationId) {
        conversation = await storage.getConversation(conversationId);
        if (!conversation) {
          return res.status(404).json({ error: 'Conversation not found' });
        }
      } else {
        // Use provided dataSourceId or get the most recent
        let selectedDataSourceId = dataSourceId;
        if (!selectedDataSourceId) {
          const dataSources = await storage.getDataSourcesByUserId(userId);
          selectedDataSourceId = dataSources.length > 0 ? dataSources[0].id : undefined;
        }
        conversation = await storage.createConversation(userId, selectedDataSourceId);
      }

      // Get conversation history
      const messages = await storage.getMessagesByConversationId(conversation.id);
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Save user message
      await storage.createChatMessage({
        conversationId: conversation.id,
        role: 'user',
        content: message,
      });

      // Get the data source for this conversation
      let dataSource;
      if (conversation.dataSourceId) {
        dataSource = await storage.getDataSource(conversation.dataSourceId);
      } else if (dataSourceId) {
        // Use the provided data source ID from the request
        dataSource = await storage.getDataSource(dataSourceId);
      }
      
      if (!dataSource) {
        const aiResponse = {
          answer: "I'd love to help you analyze your data! Please upload a file first (CSV, Excel, or JSON) so I can provide insights about your business.",
          confidence: 1.0,
          suggestedFollowUps: [
            "How do I upload my data?",
            "What file formats do you support?",
            "Can you connect to my existing tools?"
          ]
        };

        // Save AI response
        await storage.createChatMessage({
          conversationId: conversation.id,
          role: 'assistant',
          content: aiResponse.answer,
          metadata: aiResponse,
        });

        return res.json({
          response: aiResponse,
          conversationId: conversation.id,
        });
      }

      // Verify ownership of the data source
      if (dataSource.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized access to data source' });
      }

      // Check cache first for identical queries
      const cachedResponse = await getCachedResponse(userId, conversation.id, message);
      
      let aiResponse;
      let responseFromCache = false;
      
      if (cachedResponse) {
        // Use cached response
        aiResponse = cachedResponse.metadata || {
          answer: cachedResponse.content,
          confidence: 1.0,
          fromCache: true
        };
        responseFromCache = true;
        
        logger.info('Returning cached response', {
          userId,
          conversationId: conversation.id,
          cacheAge: Date.now() - cachedResponse.createdAt.getTime()
        });
      } else {
        // Generate fresh response
        // Get sample data from the specific data source
        const sampleData = await storage.queryDataRows(dataSource.id, '');

        // Generate AI response (pass user tier for tier-specific features)
        aiResponse = await generateDataInsight(
          message,
          dataSource.schema,
          sampleData,
          conversationHistory,
          userId,
          conversation.id,
          extendedThinking,
          user.subscriptionTier,
          currentCategory
        );
      }

      // Save AI response (even if from cache, to maintain conversation flow)
      const savedMessage = await storage.createChatMessage({
        conversationId: conversation.id,
        role: 'assistant',
        content: aiResponse.answer,
        metadata: aiResponse,
      });
      
      // Cache the response for future identical queries
      if (!responseFromCache && savedMessage?.id) {
        await cacheQueryResponse(savedMessage.id, userId, conversation.id, message);
      }
      
      // Update conversation category if it changed
      if (aiResponse.category && aiResponse.category !== 'general') {
        await storage.updateConversation(conversation.id, { category: aiResponse.category });
      }
      
      // Increment query count after successful response
      await storage.incrementUserQueryCount(userId);

      // Generate title if this is the first exchange (conversation has no title yet)
      const currentConversation = await storage.getConversation(conversation.id);
      if (!currentConversation?.title) {
        // Get the messages for title generation
        const messagesForTitle = [
          { role: 'user', content: message },
          { role: 'assistant', content: aiResponse.answer }
        ];
        
        // Get data source name if available
        const dataSourceName = dataSource?.name;
        
        // Import generateConversationTitle
        const { generateConversationTitle } = await import('./services/openai');
        
        // Generate and save title
        const title = await generateConversationTitle(messagesForTitle, dataSourceName);
        await storage.updateConversation(conversation.id, { title });
      }

      res.json({
        response: aiResponse,
        conversationId: conversation.id,
      });
    } catch (error: any) {
      console.error('Chat error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Search conversations (must be before :id routes)
  app.get('/api/conversations/search', requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const searchTerm = req.query.q as string;
      
      if (!searchTerm || searchTerm.trim().length === 0) {
        return res.json([]);
      }
      
      const results = await storage.searchConversations(userId, searchTerm);
      res.json(results);
    } catch (error: any) {
      console.error('Search conversations error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all conversations for the current user
  app.get('/api/conversations', requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const conversations = await storage.getConversationsByUserId(userId);
      res.json(conversations);
    } catch (error: any) {
      console.error('Get conversations error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete a conversation - protected with ownership check
  app.delete('/api/conversations/:id', requireAuth, requireOwnership('conversation'), async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      
      // Delete all messages first
      const messages = await storage.getMessagesByConversationId(conversationId);
      for (const message of messages) {
        // Delete each message (we need to add this method to storage)
      }
      
      // Delete the conversation
      await storage.deleteConversation(conversationId);
      
      res.json({ success: true, message: 'Conversation deleted successfully' });
    } catch (error: any) {
      console.error('Delete conversation error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get conversation history - protected with ownership check
  app.get('/api/conversations/:id/messages', requireAuth, validateConversationId, requireOwnership('conversation'), async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messages = await storage.getMessagesByConversationId(conversationId);
      res.json(messages);
    } catch (error: any) {
      console.error('Messages error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get single conversation - protected with ownership check
  app.get('/api/conversations/:id', requireAuth, validateConversationId, requireOwnership('conversation'), async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getConversation(conversationId);
      res.json(conversation);
    } catch (error: any) {
      console.error('Get conversation error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
