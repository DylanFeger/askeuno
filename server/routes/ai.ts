import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { handleChat } from "../ai/orchestrator";
import { getActiveDataSource } from "../data/datasource";
import { db } from "../db";
import { users, conversations, chatMessages } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "../utils/logger";
import { storage } from "../storage";

const router = Router();

// POST /api/ai/chat - Main chat endpoint
router.post("/chat", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { message, conversationId } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: "Message is required" });
    }
    
    // Get user tier
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Use tier directly (default to starter for free users)
    const tier = user.subscriptionTier || 'starter';
    
    // Get active data source for conversation
    const dataSource = await getActiveDataSource(userId);
    const dataSourceId = dataSource.active && dataSource.tables.length > 0 ? 
      (await storage.getDataSourcesByUserId(userId))[0]?.id : undefined;
    
    // Create or get conversation
    let actualConversationId = conversationId;
    
    if (!actualConversationId) {
      // Create new conversation
      const newConversation = await storage.createConversation(userId, dataSourceId);
      actualConversationId = newConversation.id;
      
      // Update conversation title based on the message
      await storage.updateConversation(actualConversationId, {
        title: message.substring(0, 50) + (message.length > 50 ? '...' : '')
      });
    }
    
    // Save user message
    await storage.createChatMessage({
      conversationId: actualConversationId,
      role: 'user',
      content: message,
      metadata: {}
    });
    
    // Get extended responses preference from session
    const extendedResponses = (req.session as any)?.extendedResponses || false;
    
    // Handle chat and get AI response
    const response = await handleChat({
      userId,
      tier,
      message,
      conversationId: actualConversationId,
      extendedResponses
    });
    
    // Save AI response
    await storage.createChatMessage({
      conversationId: actualConversationId,
      role: 'assistant',
      content: response.text,
      metadata: response.meta || {}
    });
    
    // Return response with conversation ID
    res.json({
      ...response,
      conversationId: actualConversationId
    });
    
  } catch (error) {
    logger.error("Chat endpoint error:", error);
    res.status(500).json({ error: "Failed to process chat message" });
  }
});

// GET /api/ai/active-datasource - Check active data source
router.get("/active-datasource", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const dataSource = await getActiveDataSource(userId);
    
    res.json({
      active: dataSource.active,
      type: dataSource.type,
      tables: dataSource.tables,
      reason: dataSource.reason
    });
    
  } catch (error) {
    logger.error("Active datasource endpoint error:", error);
    res.status(500).json({ error: "Failed to get active data source" });
  }
});

export default router;