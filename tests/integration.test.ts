import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { createMockRequest, createMockResponse, createMockNext, createAuthenticatedRequest, createMockFile, runHandler } from './utils/test-helpers';

const mockStorage = vi.hoisted(() => ({
  getUser: vi.fn(),
  getUserByUsername: vi.fn(),
  getUserByEmail: vi.fn(),
  createUser: vi.fn(),
  getDataSourcesByUserId: vi.fn(),
  createDataSource: vi.fn(),
  updateDataSource: vi.fn(),
  insertDataRows: vi.fn(),
  checkAndResetQueryCount: vi.fn(),
  getConversation: vi.fn(),
  createConversation: vi.fn(),
  getMessagesByConversationId: vi.fn(),
}));

const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

const mockS3Service = vi.hoisted(() => ({
  getPresignedDownloadUrl: vi.fn(),
  deleteFromS3: vi.fn(),
  listUserFiles: vi.fn(),
}));

const mockDataProcessor = vi.hoisted(() => ({
  processUploadedFile: vi.fn(),
  transformData: vi.fn(),
  validateData: vi.fn(),
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
  q.select = vi.fn(chain);
  q.insert = vi.fn(chain);
  q.update = vi.fn(chain);
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

// Multer expects multipart parsing; for unit tests we bypass it and rely on `req.file`.
vi.mock('multer', () => {
  const multer = () => ({
    single: () => (_req: any, _res: any, next: any) => next(),
  });
  (multer as any).memoryStorage = () => ({});
  return { default: multer };
});

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
  db: mockDb,
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
    dbQueue.results = [];
  });

  describe('Complete User Registration and Data Upload Flow', () => {
    it('should complete full registration → upload → query flow', async () => {
      // Step 1: User Registration
      const registerReq = createMockRequest({
        method: 'POST',
        path: '/register',
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
      
      await runHandler(authRouter.default, registerReq, registerRes);

      expect(mockStorage.createUser).toHaveBeenCalled();
      expect((registerReq.session as any).userId).toBe(1);

      // Step 2: File Upload
      const uploadReq = createAuthenticatedRequest(1);
      uploadReq.method = 'POST';
      uploadReq.path = '/upload';
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
      await runHandler(uploadRouter.default, uploadReq, uploadRes);

      expect(mockStorage.createDataSource).toHaveBeenCalled();
      expect((uploadRes.json as any).mock.calls[0][0].success).toBe(true);

      // Step 3: Query Data via Chat
      const chatReq = createAuthenticatedRequest(1);
      chatReq.method = 'POST';
      chatReq.path = '/analyze';
      chatReq.body = {
        message: 'What are my total sales?',
        dataSourceId: 1,
      };
      const chatRes = createMockResponse();

      dbQueue.results.push(
        [{
          id: 1,
          username: 'newuser',
          subscriptionTier: 'starter',
          subscriptionStatus: 'active',
        }],
        [{
          id: 1,
          userId: 1,
          schema: { columns: ['date', 'amount'] },
        }]
      );

      mockRateLimiter.checkRateLimit.mockResolvedValue({ allowed: true, remaining: 5 });
      mockChatService.saveUserMessage.mockResolvedValue({
        id: 1,
        conversationId: 1,
        isDuplicate: false,
      });
      mockChatService.createAIMessage.mockResolvedValue(1);
      mockChatService.updateAIMessage.mockResolvedValue(undefined);

      const chatRouter = await import('../server/routes/chatV3');
      await runHandler(chatRouter.default, chatReq, chatRes);

      expect(mockChatService.saveUserMessage).toHaveBeenCalled();
      expect((chatRes.json as any).mock.calls[0][0].content).toBeDefined();
    });
  });

  describe('Error Scenario: Rate Limit Exceeded', () => {
    it('should handle rate limit exceeded during chat query', async () => {
      const chatReq = createAuthenticatedRequest(1);
      chatReq.method = 'POST';
      chatReq.path = '/analyze';
      chatReq.body = {
        message: 'What are my sales?',
      };
      const chatRes = createMockResponse();

      mockStorage.getUser.mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        subscriptionTier: 'starter',
        subscriptionStatus: 'active',
        role: 'main_user',
      });

      dbQueue.results.push([{
        id: 1,
        username: 'testuser',
        subscriptionTier: 'starter',
        subscriptionStatus: 'active',
      }]);

      mockRateLimiter.checkRateLimit.mockResolvedValue({
        allowed: false,
        message: 'Rate limit exceeded. Please upgrade your plan.',
        retryAfter: 60,
      });

      const chatRouter = await import('../server/routes/chatV3');
      await runHandler(chatRouter.default, chatReq, chatRes);

      expect(chatRes.status).toHaveBeenCalledWith(429);
      expect((chatRes.json as any).mock.calls[0][0].error).toContain('Rate limit');
    });
  });

  describe('Error Scenario: Data Source Limit Reached', () => {
    it('should prevent upload when tier limit is reached', async () => {
      const uploadReq = createAuthenticatedRequest(1);
      uploadReq.method = 'POST';
      uploadReq.path = '/upload';
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
      await runHandler(uploadRouter.default, uploadReq, uploadRes);

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
      chatReq.method = 'POST';
      chatReq.path = '/analyze';
      chatReq.body = { message: 'Show all data', dataSourceId: 1 };
      const chatRes = createMockResponse();

      dbQueue.results.push(
        [user],
        [{
          id: 1,
          userId: 1,
          schema: {},
        }]
      );

      mockRateLimiter.checkRateLimit.mockResolvedValue({ allowed: true, remaining: 5 });
      mockChatService.saveUserMessage.mockResolvedValue({
        id: 1,
        conversationId: 1,
        isDuplicate: false,
      });
      mockChatService.createAIMessage.mockResolvedValue(1);
      mockChatService.updateAIMessage.mockResolvedValue(undefined);

      const { executeSQLQuery } = await import('../server/ai/analytics-agent');
      
      const chatRouter = await import('../server/routes/chatV3');
      await runHandler(chatRouter.default, chatReq, chatRes);

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
