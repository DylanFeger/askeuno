import { Router } from 'express';
import { db } from '../db';
import { storage } from '../storage';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { sql } from 'drizzle-orm';

const router = Router();

/**
 * Simple health check endpoint
 */
router.get('/', (req, res) => {
  res.status(200).json({ ok: true });
});

/**
 * Public health check endpoint for deployment monitoring
 */
router.get('/check', async (req, res) => {
  try {
    // Test database connection
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    const dbResponseTime = Date.now() - start;

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        responseTime: `${dbResponseTime}ms`
      }
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        error: 'Database connection failed'
      }
    });
  }
});

/**
 * Detailed system status for authenticated users
 */
router.get('/status', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    
    // Get user data
    const dataSources = await storage.getDataSourcesByUserId(userId);
    const conversations = await storage.getConversationsByUserId(userId);
    
    // Calculate stats
    const totalDataRows = await Promise.all(
      dataSources.map(async (ds) => {
        try {
          const rows = await storage.getDataRows(ds.id, 1);
          return rows.length > 0 ? ds.rowCount || 0 : 0;
        } catch {
          return 0;
        }
      })
    );
    
    const totalRows = totalDataRows.reduce((sum, count) => sum + count, 0);
    
    // Get recent activity
    const recentUpload = dataSources
      .filter(ds => ds.type === 'file')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    
    const recentSync = dataSources
      .filter(ds => ds.connectionType === 'live' && ds.lastSyncAt)
      .sort((a, b) => new Date(b.lastSyncAt!).getTime() - new Date(a.lastSyncAt!).getTime())[0];
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      user: {
        id: userId,
        email: req.user.email,
        username: req.user.username,
        subscriptionTier: req.user.subscriptionTier,
        subscriptionStatus: req.user.subscriptionStatus
      },
      system: {
        dataSources: {
          total: dataSources.length,
          live: dataSources.filter(ds => ds.connectionType === 'live').length,
          files: dataSources.filter(ds => ds.type === 'file').length,
          active: dataSources.filter(ds => ds.status === 'active').length,
          errors: dataSources.filter(ds => ds.status === 'error').length
        },
        data: {
          totalRows,
          processedToday: totalRows // This would need more sophisticated tracking
        },
        activity: {
          lastUpload: recentUpload ? recentUpload.createdAt : null,
          lastSync: recentSync ? recentSync.lastSyncAt : null,
          totalConversations: conversations.length
        }
      }
    });
  } catch (error) {
    logger.error('System status check failed', { error, userId: req.user.id });
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve system status'
    });
  }
});

export default router;