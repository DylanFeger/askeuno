import express from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import { storage } from "../storage";
import { insertMessageFeedbackSchema } from "@shared/schema";
import { logger } from "../utils/logger";

const router = express.Router();

router.post("/api/feedback", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { messageId, rating, comment } = req.body;
    const userId = req.user.id;

    if (!messageId || !rating) {
      return res.status(400).json({ error: "messageId and rating are required" });
    }

    if (!["positive", "negative"].includes(rating)) {
      return res.status(400).json({ error: "rating must be 'positive' or 'negative'" });
    }

    const feedbackData = insertMessageFeedbackSchema.parse({
      messageId,
      userId,
      rating,
      comment: comment || null,
    });

    const feedback = await storage.createMessageFeedback(feedbackData);

    logger.info("Message feedback submitted", {
      feedbackId: feedback.id,
      messageId,
      userId,
      rating,
    });

    res.json({ success: true, feedback });
  } catch (error: any) {
    logger.error("Error submitting feedback", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/feedback/stats", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    
    const stats = await storage.getMessageFeedbackStats(userId);
    
    res.json(stats);
  } catch (error: any) {
    logger.error("Error fetching feedback stats", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/feedback/weekly-report", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const report = await storage.getWeeklyFeedbackReport();
    
    res.json({ 
      report,
      generatedAt: new Date(),
      period: 'Last 7 days'
    });
  } catch (error: any) {
    logger.error("Error generating weekly feedback report", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
