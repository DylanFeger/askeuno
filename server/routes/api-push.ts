import { Router } from 'express';
import { storage } from '../storage';
import { body, validationResult } from 'express-validator';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const router = Router();

// Generate a unique API token for the user
function generateApiToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Validate API token middleware
async function validateApiToken(req: any, res: any, next: any) {
  const token = req.headers['x-api-key'] || req.query.apiKey;
  
  if (!token) {
    return res.status(401).json({ error: 'API key required' });
  }

  try {
    // Find user by API token
    const user = await storage.getUserByApiToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('API token validation error', { error });
    res.status(500).json({ error: 'Authentication failed' });
  }
}

// Get user's API endpoint info
router.get('/info/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate API token if user doesn't have one
    if (!user.apiToken) {
      const apiToken = generateApiToken();
      await storage.updateUser(userId, { apiToken });
      user.apiToken = apiToken;
    }

    res.json({
      endpoint: `${process.env.API_URL || 'https://askeuno.com'}/api/push/data/${userId}`,
      apiKey: user.apiToken,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': user.apiToken,
      },
      example: {
        name: 'Sales Data',
        data: [
          { date: '2025-01-17', product: 'Widget A', revenue: 1000 },
        ],
      },
    });
  } catch (error) {
    logger.error('Error getting API info', { error });
    res.status(500).json({ error: 'Failed to get API info' });
  }
});

// Push data endpoint for each user
router.post(
  '/data/:userId',
  validateApiToken,
  [
    body('name').notEmpty().withMessage('Data source name is required'),
    body('data').isArray().withMessage('Data must be an array'),
    body('data').notEmpty().withMessage('Data array cannot be empty'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = parseInt(req.params.userId);
      
      // Verify user matches token
      if (req.user.id !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const { name, data } = req.body;

      // Analyze data structure
      const firstRow = data[0];
      const columns = Object.keys(firstRow);
      const schema: Record<string, any> = {};
      
      columns.forEach(col => {
        const value = firstRow[col];
        schema[col] = {
          name: col,
          type: typeof value === 'number' ? 'number' : 'string',
          description: `${col} field from API push`,
        };
      });

      // Check if data source exists
      let dataSource = await storage.getDataSourceByNameAndUser(name, userId);
      
      if (dataSource) {
        // Update existing data source
        await storage.clearDataRows(dataSource.id);
        await storage.insertDataRows(dataSource.id, data);
        await storage.updateDataSource(dataSource.id, {
          lastSyncAt: new Date(),
          rowCount: data.length,
          schema,
        });
      } else {
        // Create new data source
        dataSource = await storage.createDataSource({
          userId,
          name,
          type: 'api',
          connectionType: 'push',
          connectionData: { apiPush: true },
          schema,
          rowCount: data.length,
          status: 'active',
          lastSyncAt: new Date(),
        });
        
        await storage.insertDataRows(dataSource.id, data);
      }

      logger.info('API push data received', {
        userId,
        dataSourceId: dataSource.id,
        rowCount: data.length,
      });

      res.json({
        success: true,
        message: 'Data received successfully',
        dataSource: {
          id: dataSource.id,
          name: dataSource.name,
          rowCount: data.length,
        },
      });
    } catch (error) {
      logger.error('Error processing API push', { error, userId: req.params.userId });
      res.status(500).json({ error: 'Failed to process data' });
    }
  }
);

// Test endpoint
router.post('/test', validateApiToken, (req, res) => {
  res.json({
    success: true,
    message: 'API key is valid',
    user: {
      id: req.user.id,
      username: req.user.username,
    },
  });
});

export default router;