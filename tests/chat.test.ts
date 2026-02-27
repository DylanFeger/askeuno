import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import chatRouter from '../server/routes/chatV3';
import { createAuthenticatedRequest, createMockResponse, createMockNext } from './utils/test-helpers';
import { mockStorage, mockLogger, mockChatService, mockRateLimiter } from './utils/mocks';

// Mock dependencies
vi.mock('../server/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  },
}));

vi.mock('../server/storage', () => ({
  storage: mockStorage,
}));

vi.mock('../server/utils/logger', () => ({
  logger: mockLogger,
}));

vi.mock('../server/services/chatService', () => mockChatService);

vi.mock('../server/ai/rate', () => ({
  checkRateLimit: mockRateLimiter.checkRateLimit,
}));

vi.mock('../server/ai/analytics-agent', () => ({
  processAnalyticsQuery: vi.fn().mockResolvedValue({
    result: 'Test analysis result',
    sql: 'SELECT * FROM table LIMIT 10',
    taskType: 'DATA_ANALYSIS',
    confidence: 0.9,
    metadata: { dataQuality: 'good' },
  }),
  executeSQLQuery: vi.fn().mockResolvedValue({
    success: true,
    data: [{ id: 1, value: 100 }],
  }),
  generateFollowUpQuestions: vi.fn().mockReturnValue([
    'What are the trends?',
    'Can you break this down by category?',
  ]),
  AnalyticsTaskType: {
    DATA_ANALYSIS: 'DATA_ANALYSIS',
    TREND_ANALYSIS: 'TREND_ANALYSIS',
    PREDICTION: 'PREDICTION',
  },
}));

describe('AI Chat Routes', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    req = createAuthenticatedRequest(1);
    res = createMockResponse();
    next = createMockNext();
    vi.clearAllMocks();

    // Setup default mocks
    const { db } = require('../server/db');
    db.select.mockResolvedValue([{
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      subscriptionTier: 'starter',
      subscriptionStatus: 'active',
    }]);

    mockRateLimiter.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 5,
    });

    mockChatService.saveUserMessage.mockResolvedValue({
      id: 1,
      conversationId: 1,
      isDuplicate: false,
    });

    mockChatService.createAIMessage.mockResolvedValue(1);
    mockChatService.updateAIMessage.mockResolvedValue(undefined);
    mockChatService.getExistingAIResponse.mockResolvedValue(null);
  });

  describe('POST /api/chat/v3/analyze', () => {
    it('should process chat query successfully', async () => {
      req.body = {
        message: 'What are my sales?',
        dataSourceId: 1,
      };

      const { db } = require('../server/db');
      db.select.mockResolvedValueOnce([{
        id: 1,
        username: 'testuser',
        subscriptionTier: 'starter',
      }]).mockResolvedValueOnce([{
        id: 1,
        userId: 1,
        schema: { columns: ['id', 'value'] },
      }]);

      await chatRouter.handle(req as Request, res as Response, next);

      expect(mockRateLimiter.checkRateLimit).toHaveBeenCalled();
      expect(mockChatService.saveUserMessage).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
      const response = (res.json as any).mock.calls[0][0];
      expect(response.content).toBeDefined();
      expect(response.metadata).toBeDefined();
    });

    it('should reject query without message', async () => {
      req.body = {
        dataSourceId: 1,
      };

      await chatRouter.handle(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Message is required' });
    });

    it('should enforce rate limiting', async () => {
      mockRateLimiter.checkRateLimit.mockResolvedValue({
        allowed: false,
        message: 'Rate limit exceeded',
        retryAfter: 60,
      });

      req.body = {
        message: 'What are my sales?',
      };

      await chatRouter.handle(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Rate limit'),
          retryAfter: 60,
        })
      );
    });

    it('should enforce tier limits for row counts', async () => {
      const { executeSQLQuery } = require('../server/ai/analytics-agent');
      
      req.body = {
        message: 'Show me all sales',
        dataSourceId: 1,
      };

      const { db } = require('../server/db');
      db.select.mockResolvedValueOnce([{
        id: 1,
        username: 'testuser',
        subscriptionTier: 'starter', // Starter tier has 1000 row limit
      }]).mockResolvedValueOnce([{
        id: 1,
        userId: 1,
        schema: { columns: ['id', 'value'] },
      }]);

      await chatRouter.handle(req as Request, res as Response, next);

      expect(executeSQLQuery).toHaveBeenCalledWith(
        expect.any(String),
        1,
        1000, // Starter tier limit
        1
      );
    });

    it('should handle data source not found', async () => {
      req.body = {
        message: 'What are my sales?',
        dataSourceId: 999,
      };

      const { db } = require('../server/db');
      db.select.mockResolvedValueOnce([{
        id: 1,
        username: 'testuser',
        subscriptionTier: 'starter',
      }]).mockResolvedValueOnce([]); // No data source found

      await chatRouter.handle(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Data source not found' });
    });

    it('should handle SQL execution errors gracefully', async () => {
      const { executeSQLQuery } = require('../server/ai/analytics-agent');
      
      executeSQLQuery.mockResolvedValue({
        success: false,
        error: 'SQL syntax error',
      });

      req.body = {
        message: 'What are my sales?',
        dataSourceId: 1,
      };

      const { db } = require('../server/db');
      db.select.mockResolvedValueOnce([{
        id: 1,
        username: 'testuser',
        subscriptionTier: 'starter',
      }]).mockResolvedValueOnce([{
        id: 1,
        userId: 1,
        schema: { columns: ['id', 'value'] },
      }]);

      await chatRouter.handle(req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalled();
      const response = (res.json as any).mock.calls[0][0];
      expect(response.content).toContain('unable to execute the query');
    });

    it('should return duplicate response if message is duplicate', async () => {
      mockChatService.saveUserMessage.mockResolvedValue({
        id: 1,
        conversationId: 1,
        isDuplicate: true,
      });

      mockChatService.getExistingAIResponse.mockResolvedValue({
        id: 2,
        content: 'Cached response',
        metadata: {},
      });

      req.body = {
        message: 'What are my sales?',
      };

      await chatRouter.handle(req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalled();
      const response = (res.json as any).mock.calls[0][0];
      expect(response.isDuplicate).toBe(true);
      expect(response.content).toBe('Cached response');
    });
  });

  describe('GET /api/chat/v3/conversations', () => {
    it('should return user conversations', async () => {
      const { db } = require('../server/db');
      db.select.mockResolvedValue([
        {
          id: 1,
          title: 'Sales Analysis',
          category: 'sales',
          createdAt: new Date(),
          dataSourceId: 1,
        },
      ]);

      req.method = 'GET';
      req.path = '/conversations';
      req.query = { limit: '20', offset: '0' };

      await chatRouter.handle(req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalled();
      const response = (res.json as any).mock.calls[0][0];
      expect(Array.isArray(response)).toBe(true);
    });
  });

  describe('GET /api/chat/v3/messages/:conversationId', () => {
    it('should return conversation messages', async () => {
      const { db } = require('../server/db');
      db.select.mockResolvedValueOnce([{
        id: 1,
        userId: 1,
      }]).mockResolvedValueOnce([
        {
          id: 1,
          role: 'user',
          content: 'What are my sales?',
          createdAt: new Date(),
        },
        {
          id: 2,
          role: 'assistant',
          content: 'Here are your sales...',
          createdAt: new Date(),
        },
      ]);

      req.method = 'GET';
      req.path = '/messages/1';
      req.params = { conversationId: '1' };

      await chatRouter.handle(req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalled();
      const response = (res.json as any).mock.calls[0][0];
      expect(response.conversation).toBeDefined();
      expect(response.messages).toBeDefined();
    });

    it('should reject access to other user\'s conversation', async () => {
      const { db } = require('../server/db');
      db.select.mockResolvedValueOnce([]); // Conversation not found or not owned by user

      req.method = 'GET';
      req.path = '/messages/999';
      req.params = { conversationId: '999' };

      await chatRouter.handle(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Conversation not found' });
    });
  });

  describe('POST /api/chat/v3/export', () => {
    it('should allow export for professional tier', async () => {
      const { db } = require('../server/db');
      db.select.mockResolvedValue([{
        id: 1,
        subscriptionTier: 'professional',
      }]);

      req.method = 'POST';
      req.path = '/export';
      req.body = {
        conversationId: 1,
        format: 'csv',
      };

      await chatRouter.handle(req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalled();
    });

    it('should reject export for starter tier', async () => {
      const { db } = require('../server/db');
      db.select.mockResolvedValue([{
        id: 1,
        subscriptionTier: 'starter',
      }]);

      req.method = 'POST';
      req.path = '/export';
      req.body = {
        conversationId: 1,
        format: 'csv',
      };

      await chatRouter.handle(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('not available'),
          tier: 'starter',
        })
      );
    });
  });
});
