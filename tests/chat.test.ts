import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { createAuthenticatedRequest, createMockResponse, createMockNext, runHandler } from './utils/test-helpers';

const mockStorage = vi.hoisted(() => ({
  getUser: vi.fn(),
  getDataSource: vi.fn(),
  getConversationsByUserId: vi.fn(),
}));

const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

const mockChatService = vi.hoisted(() => ({
  saveUserMessage: vi.fn(),
  createAIMessage: vi.fn(),
  updateAIMessage: vi.fn(),
  getExistingAIResponse: vi.fn(),
}));

const mockRateLimiter = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
}));

const dbQueue = vi.hoisted(() => ({
  results: [] as any[],
}));

const mockDbQuery = vi.hoisted(() => {
  const q: any = {};
  const chain = () => q;
  q.from = vi.fn(chain);
  q.where = vi.fn(chain);
  q.limit = vi.fn(chain);
  q.offset = vi.fn(chain);
  q.orderBy = vi.fn(chain);
  q.set = vi.fn(chain);
  q.values = vi.fn(chain);
  q.returning = vi.fn(chain);
  q.then = (onFulfilled: any, onRejected: any) =>
    Promise.resolve(dbQueue.results.shift()).then(onFulfilled, onRejected);
  return q;
});

const mockDb = vi.hoisted(() => ({
  select: vi.fn(() => mockDbQuery),
  insert: vi.fn(() => mockDbQuery),
  update: vi.fn(() => mockDbQuery),
}));

// Mock dependencies
vi.mock('../server/db', () => ({
  db: mockDb,
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
  let chatRouter: any;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    chatRouter = (await import('../server/routes/chatV3')).default;
    req = createAuthenticatedRequest(1);
    req.method = 'POST';
    req.url = '/analyze';
    res = createMockResponse();
    next = createMockNext();
    vi.clearAllMocks();
    dbQueue.results = [];

    mockRateLimiter.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 5,
    });

    mockStorage.getUser.mockResolvedValue({
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      subscriptionTier: 'starter',
      subscriptionStatus: 'active',
      role: 'main_user',
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

      dbQueue.results.push(
        [{
          id: 1,
          username: 'testuser',
          subscriptionTier: 'starter',
        }],
        [{
          id: 1,
          userId: 1,
          schema: { columns: ['id', 'value'] },
        }]
      );

      await runHandler(chatRouter, req, res);

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

      await runHandler(chatRouter, req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Message is required' });
    });

    it('should enforce rate limiting', async () => {
      mockRateLimiter.checkRateLimit.mockResolvedValue({
        allowed: false,
        message: 'Rate limit exceeded',
        retryAfter: 60,
      });

      dbQueue.results.push([{
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        subscriptionTier: 'starter',
        subscriptionStatus: 'active',
      }]);

      req.body = {
        message: 'What are my sales?',
      };

      await runHandler(chatRouter, req, res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Rate limit'),
          retryAfter: 60,
        })
      );
    });

    it('should enforce tier limits for row counts', async () => {
      const { executeSQLQuery } = await import('../server/ai/analytics-agent');
      
      req.body = {
        message: 'Show me all sales',
        dataSourceId: 1,
      };

      dbQueue.results.push(
        [{
          id: 1,
          username: 'testuser',
          subscriptionTier: 'starter', // Starter tier has 1000 row limit
        }],
        [{
          id: 1,
          userId: 1,
          schema: { columns: ['id', 'value'] },
        }]
      );

      await runHandler(chatRouter, req, res);

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

      dbQueue.results.push(
        [{
          id: 1,
          username: 'testuser',
          subscriptionTier: 'starter',
        }],
        [] // No data source found
      );

      await runHandler(chatRouter, req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Data source not found' });
    });

    it('should handle SQL execution errors gracefully', async () => {
      const { executeSQLQuery } = await import('../server/ai/analytics-agent');
      
      executeSQLQuery.mockResolvedValue({
        success: false,
        error: 'SQL syntax error',
      });

      req.body = {
        message: 'What are my sales?',
        dataSourceId: 1,
      };

      dbQueue.results.push(
        [{
          id: 1,
          username: 'testuser',
          subscriptionTier: 'starter',
        }],
        [{
          id: 1,
          userId: 1,
          schema: { columns: ['id', 'value'] },
        }]
      );

      await runHandler(chatRouter, req, res);

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

      dbQueue.results.push([{
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        subscriptionTier: 'starter',
        subscriptionStatus: 'active',
      }]);

      await runHandler(chatRouter, req, res);

      expect(res.json).toHaveBeenCalled();
      const response = (res.json as any).mock.calls[0][0];
      expect(response.isDuplicate).toBe(true);
      expect(response.content).toBe('Cached response');
    });
  });

  describe('GET /api/chat/v3/conversations', () => {
    it('should return user conversations', async () => {
      dbQueue.results.push([
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
      req.url = '/conversations';
      req.query = { limit: '20', offset: '0' };

      await runHandler(chatRouter, req, res);

      expect(res.json).toHaveBeenCalled();
      const response = (res.json as any).mock.calls[0][0];
      expect(Array.isArray(response)).toBe(true);
    });
  });

  describe('GET /api/chat/v3/messages/:conversationId', () => {
    it('should return conversation messages', async () => {
      dbQueue.results.push(
        [{
          id: 1,
          userId: 1,
        }],
        [
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
        ]
      );

      req.method = 'GET';
      req.path = '/messages/1';
      req.url = '/messages/1';
      req.params = { conversationId: '1' };

      await runHandler(chatRouter, req, res);

      expect(res.json).toHaveBeenCalled();
      const response = (res.json as any).mock.calls[0][0];
      expect(response.conversation).toBeDefined();
      expect(response.messages).toBeDefined();
    });

    it('should reject access to other user\'s conversation', async () => {
      dbQueue.results.push([]); // Conversation not found or not owned by user

      req.method = 'GET';
      req.path = '/messages/999';
      req.url = '/messages/999';
      req.params = { conversationId: '999' };

      await runHandler(chatRouter, req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Conversation not found' });
    });
  });

  describe('POST /api/chat/v3/export', () => {
    it('should allow export for professional tier', async () => {
      dbQueue.results.push([{
        id: 1,
        subscriptionTier: 'professional',
      }]);

      req.method = 'POST';
      req.path = '/export';
      req.url = '/export';
      req.body = {
        conversationId: 1,
        format: 'csv',
      };

      await runHandler(chatRouter, req, res);

      expect(res.json).toHaveBeenCalled();
    });

    it('should reject export for starter tier', async () => {
      dbQueue.results.push([{
        id: 1,
        subscriptionTier: 'starter',
      }]);

      req.method = 'POST';
      req.path = '/export';
      req.url = '/export';
      req.body = {
        conversationId: 1,
        format: 'csv',
      };

      await runHandler(chatRouter, req, res);

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
