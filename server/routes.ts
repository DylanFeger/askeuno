import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { processFile, validateFile } from "./services/fileProcessor";
import { generateDataInsight } from "./services/openai";
import { insertDataSourceSchema, insertChatMessageSchema } from "@shared/schema";

// Extend Express Request interface for file uploads
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
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
  // File upload endpoint
  app.post('/api/upload', upload.single('file'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const userId = 1; // TODO: Get from authenticated user session
      const fileExt = path.extname(req.file.originalname).substring(1);
      
      // Process the file
      const processedData = await processFile(req.file.path, fileExt);
      
      // Create data source record
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
      console.error('Upload error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's data sources
  app.get('/api/data-sources', async (req, res) => {
    try {
      const userId = 1; // TODO: Get from authenticated user session
      const dataSources = await storage.getDataSourcesByUserId(userId);
      res.json(dataSources);
    } catch (error: any) {
      console.error('Data sources error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Chat endpoint
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, conversationId } = req.body;
      const userId = 1; // TODO: Get from authenticated user session
      
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
        conversation = await storage.createConversation(userId);
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
        conversationHistory
      );

      // Save AI response
      await storage.createChatMessage({
        conversationId: conversation.id,
        role: 'assistant',
        content: aiResponse.answer,
        metadata: aiResponse,
      });

      res.json({
        response: aiResponse,
        conversationId: conversation.id,
      });
    } catch (error: any) {
      console.error('Chat error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get conversation history
  app.get('/api/conversations/:id/messages', async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messages = await storage.getMessagesByConversationId(conversationId);
      res.json(messages);
    } catch (error: any) {
      console.error('Messages error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's conversations
  app.get('/api/conversations', async (req, res) => {
    try {
      const userId = 1; // TODO: Get from authenticated user session
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
