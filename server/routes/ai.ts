import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { handleChat } from "../ai/orchestrator";
import { getActiveDataSource } from "../data/datasource";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "../utils/logger";

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
    
    // Handle chat
    const response = await handleChat({
      userId,
      tier,
      message,
      conversationId
    });
    
    res.json(response);
    
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