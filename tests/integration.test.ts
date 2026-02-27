import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { createMockRequest, createMockResponse, createMockNext, createAuthenticatedRequest, createMockFile } from './utils/test-helpers';
import { mockStorage, mockLogger, mockS3Service, mockDataProcessor, mockChatService, mockRateLimiter } from './utils/mocks';

// Mock all dependencies
vi.mock('../server/storage', () => ({
  storage: mockStorage,
}));

vi.mock('../server/utils/logger', () => ({
  logger: mockLogger,
  logSecurityEvent: vi.fn(),
}));

vi.mock('../server/services/awsSes', () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../server/services/s3Service', () => mockS3Service);

vi.mock('../server/services/dataProcessor', () => mockDataProcessor);

vi.mock('../server/services/chatService', () => mockChatService);

vi.mock('../server/ai/rate', () => ({
  checkRateLimit: mockRateLimiter.checkRateLimit,
}));

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

vi.mock('../server/ai/analytics-agent', () => ({
  processAnalyticsQuery: vi.fn().mockResolvedValue({
    result: 'Analysis result',
    sql: 'SELECT * FROM table',
    taskType: 'DATA_ANALYSIS',
    confidence: 0.9,
    metadata: {},
  }),
  executeSQLQuery: vi.fn().mockResolvedValue({
    success: true,
    data: [{ id: 1, value: 100 }],
  }),
  generateFollowUpQuestions: vi.fn().mockReturnValue([]),
  AnalyticsTaskType: {
    DATA_ANALYSIS: 'DATA_ANALYSIS',
  },
}));

describe('Integration Tests - End-to-End User Journeys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete User Registration and Data Upload Flow', () => {
    it('should complete full registration → upload → query flow', async () => {
      // Step 1: User Registration
      const registerReq = createMockRequest({
        body: {
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'Test1234',
        },
      });
      const registerRes = createMockResponse();

      mockStorage.getUserByUsername.mockResolvedValue(null);
      mockStorage.getUserByEmail.mockResolvedValue(null);
      const hashedPassword = await bcrypt.hash('Test1234', 12);
      mockStorage.createUser.mockResolvedValue({
        id: 1,
        username: 'newuser',
        email: 'newuser@example.com',
        password: hashedPassword,
        subscriptionTier: 'starter',
        subscriptionStatus: 'active',
        role: 'main_user',
      });

      // Import and call register handler
      const authRouter = await import('../server/routes/auth');
      vi.spyOn(bcrypt, 'hash').mockResolvedValue(hashedPassword as never);
      
      await authRouter.default.handle(registerReq as Request, registerRes as Response, createMockNext());

      expect(mockStorage.createUser).toHaveBeenCalled();
      expect((registerReq.session as any).userId).toBe(1);

      // Step 2: File Upload
      const uploadReq = createAuthenticatedRequest(1);
      const uploadFile = createMockFile('sales.csv', 'date,amount\n2024-01-01,1000\n2024-01-02,1500');
      uploadReq.file = uploadFile;
      uploadReq.body = { dataSourceName: 'Sales Data' };

      const uploadRes = createMockResponse();

      mockStorage.getUser.mockResolvedValue({
        id: 1,
        username: 'newuser',
        subscriptionTier: 'starter',
        subscriptionStatus: 'active',
      });
      mockStorage.getDataSourcesByUserId.mockResolvedValue([]);

      mockDataProcessor.processUploadedFile.mockResolvedValue({
        success: true,
        data: {
          rows: [
            { date: '2024-01-01', amount: 1000 },
            { date: '2024-01-02', amount: 1500 },
          ],
          schema: { columns: ['date', 'amount'] },
          summary: '2 rows',
          columns: ['date', 'amount'],
        },
        s3Key: 'uploads/1/sales.csv',
      });

      mockDataProcessor.validateData.mockReturnValue({ isValid: true, errors: [] });
      mockDataProcessor.transformData.mockReturnValue([
        { date: '2024-01-01', amount: 1000 },
        { date: '2024-01-02', amount: 1500 },
      ]);

      mockStorage.createDataSource.mockResolvedValue({
        id: 1,
        userId: 1,
        name: 'Sales Data',
        type: 'file',
        connectionType: 'upload',
        status: 'processing',
      });

      mockStorage.insertDataRows.mockResolvedValue(undefined);
      mockStorage.updateDataSource.mockResolvedValue(undefined);

      const uploadRouter = await import('../server/routes/uploads');
      await uploadRouter.default.handle(uploadReq as Request, uploadRes as Response, createMockNext());

      expect(mockStorage.createDataSource).toHaveBeenCalled();
      expect((uploadRes.json as any).mock.calls[0][0].success).toBe(true);

      // Step 3: Query Data via Chat
      const chatReq = createAuthenticatedRequest(1);
      chatReq.body = {
        message: 'What are my total sales?',
        dataSourceId: 1,
      };
      const chatRes = createMockResponse();

      const { db } = require('../server/db');
      db.select.mockResolvedValueOnce([{
        id: 1,
        username: 'newuser',
        subscriptionTier: 'starter',
      }]).mockResolvedValueOnce([{
        id: 1,
        userId: 1,
        schema: { columns: ['date', 'amount'] },
      }]);

      mockRateLimiter.checkRateLimit.mockResolvedValue({ allowed: true, remaining: 5 });
      mockChatService.saveUserMessage.mockResolvedValue({
        id: 1,
        conversationId: 1,
        isDuplicate: false,
      });
      mockChatService.createAIMessage.mockResolvedValue(1);
      mockChatService.updateAIMessage.mockResolvedValue(undefined);

      const chatRouter = await import('../server/routes/chatV3');
      await chatRouter.default.handle(chatReq as Request, chatRes as Response, createMockNext());

      expect(mockChatService.saveUserMessage).toHaveBeenCalled();
      expect((chatRes.json as any).mock.calls[0][0].content).toBeDefined();
    });
  });

  describe('Error Scenario: Rate Limit Exceeded', () => {
    it('should handle rate limit exceeded during chat query', async () => {
      const chatReq = createAuthenticatedRequest(1);
      chatReq.body = {
        message: 'What are my sales?',
      };
      const chatRes = createMockResponse();

      const { db } = require('../server/db');
      db.select.mockResolvedValue([{
        id: 1,
        username: 'testuser',
        subscriptionTier: 'starter',
      }]);

      mockRateLimiter.checkRateLimit.mockResolvedValue({
        allowed: false,
        message: 'Rate limit exceeded. Please upgrade your plan.',
        retryAfter: 60,
      });

      const chatRouter = await import('../server/routes/chatV3');
      await chatRouter.default.handle(chatReq as Request, chatRes as Response, createMockNext());

      expect(chatRes.status).toHaveBeenCalledWith(429);
      expect((chatRes.json as any).mock.calls[0][0].error).toContain('Rate limit');
    });
  });

  describe('Error Scenario: Data Source Limit Reached', () => {
    it('should prevent upload when tier limit is reached', async () => {
      const uploadReq = createAuthenticatedRequest(1);
      const uploadFile = createMockFile('data.csv', 'col1,col2\nval1,val2');
      uploadReq.file = uploadFile;
      uploadReq.body = { dataSourceName: 'New Data' };

      const uploadRes = createMockResponse();

      mockStorage.getUser.mockResolvedValue({
        id: 1,
        username: 'testuser',
        subscriptionTier: 'starter', // 1 data source limit
        subscriptionStatus: 'active',
      });

      // User already has 1 data source
      mockStorage.getDataSourcesByUserId.mockResolvedValue([
        { id: 1, userId: 1, name: 'Existing Source' },
      ]);

      const uploadRouter = await import('../server/routes/uploads');
      await uploadRouter.default.handle(uploadReq as Request, uploadRes as Response, createMockNext());

      expect(uploadRes.status).toHaveBeenCalledWith(429);
      expect((uploadRes.json as any).mock.calls[0][0].error).toContain('limit');
    });
  });

  describe('Error Scenario: Invalid Authentication', () => {
    it('should reject protected routes without authentication', async () => {
      const chatReq = createMockRequest({
        body: { message: 'Test query' },
      });
      (chatReq.session as any).userId = undefined;

      const chatRes = createMockResponse();
      const next = createMockNext();

      const { requireAuth } = await import('../server/middleware/auth');
      await requireAuth(chatReq as Request, chatRes as Response, next);

      expect(chatRes.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Tier Enforcement Flow', () => {
    it('should enforce tier limits across all features', async () => {
      // Starter tier user
      const user = {
        id: 1,
        username: 'starteruser',
        subscriptionTier: 'starter',
        subscriptionStatus: 'active',
      };

      // Test chat query with row limit
      const chatReq = createAuthenticatedRequest(1);
      chatReq.body = { message: 'Show all data', dataSourceId: 1 };
      const chatRes = createMockResponse();

      const { db } = require('../server/db');
      db.select.mockResolvedValueOnce([user]).mockResolvedValueOnce([{
        id: 1,
        userId: 1,
        schema: {},
      }]);

      mockRateLimiter.checkRateLimit.mockResolvedValue({ allowed: true, remaining: 5 });
      mockChatService.saveUserMessage.mockResolvedValue({
        id: 1,
        conversationId: 1,
        isDuplicate: false,
      });
      mockChatService.createAIMessage.mockResolvedValue(1);
      mockChatService.updateAIMessage.mockResolvedValue(undefined);

      const { executeSQLQuery } = require('../server/ai/analytics-agent');
      
      const chatRouter = await import('../server/routes/chatV3');
      await chatRouter.default.handle(chatReq as Request, chatRes as Response, createMockNext());

      // Verify starter tier row limit (1000) was enforced
      expect(executeSQLQuery).toHaveBeenCalledWith(
        expect.any(String),
        1,
        1000, // Starter tier limit
        1
      );
    });
  });
});
