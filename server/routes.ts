import type { Express, Request } from "express";
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
import dataSourcesRoutes from "./routes/data-sources";
import uploadRoutes from "./routes/uploads";
import webhookRoutes from "./routes/webhooks";

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
        message: 'Acre API is running',
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
  
  // Data sources routes
  app.use('/api/data-sources', dataSourcesRoutes);
  
  // File upload routes
  app.use('/api/files', uploadRoutes);
  
  // Webhook routes - no auth required (webhooks verify themselves)
  app.use('/api/webhooks', webhookRoutes);

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
      if (!dataSource || dataSource.userId !== req.user.id) {
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

  // Get conversations by data source - protected with ownership check
  app.get('/api/data-sources/:id/conversations', requireAuth, requireOwnership('dataSource'), async (req, res) => {
    try {
      const dataSourceId = parseInt(req.params.id);
      const conversations = await storage.getConversationsByDataSourceId(dataSourceId);
      res.json(conversations);
    } catch (error: any) {
      console.error('Get conversations error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Chat endpoint - protected with AI rate limiting
  app.post('/api/chat', requireAuth, aiRateLimit, validateChatMessage, async (req, res) => {
    try {
      const { message, conversationId, extendedThinking = false } = req.body;
      const userId = (req as AuthenticatedRequest).user.id;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Get or create conversation
      let conversation;
      if (conversationId) {
        conversation = await storage.getConversation(conversationId);
        if (!conversation) {
          return res.status(404).json({ error: 'Conversation not found' });
        }
      } else {
        // Get the most recent data source to link to the conversation
        const dataSources = await storage.getDataSourcesByUserId(userId);
        const dataSourceId = dataSources.length > 0 ? dataSources[0].id : undefined;
        conversation = await storage.createConversation(userId, dataSourceId);
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

      // Get user's data sources for context
      const dataSources = await storage.getDataSourcesByUserId(userId);
      
      if (dataSources.length === 0) {
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

      // Get sample data from the most recent data source
      const latestDataSource = dataSources[0];
      const sampleData = await storage.queryDataRows(latestDataSource.id, '');

      // Generate AI response
      const aiResponse = await generateDataInsight(
        message,
        latestDataSource.schema,
        sampleData,
        conversationHistory,
        userId,
        conversation.id,
        extendedThinking
      );

      // Save AI response
      await storage.createChatMessage({
        conversationId: conversation.id,
        role: 'assistant',
        content: aiResponse.answer,
        metadata: aiResponse,
      });

      // Generate title if this is the first exchange (conversation has no title yet)
      const currentConversation = await storage.getConversation(conversation.id);
      if (!currentConversation?.title) {
        // Get the messages for title generation
        const messagesForTitle = [
          { role: 'user', content: message },
          { role: 'assistant', content: aiResponse.answer }
        ];
        
        // Get data source name if available
        const dataSourceName = latestDataSource?.name;
        
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

  // Get user's conversations - protected
  app.get('/api/conversations', requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const conversations = await storage.getConversationsByUserId(userId);
      res.json(conversations);
    } catch (error: any) {
      console.error('Conversations error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
