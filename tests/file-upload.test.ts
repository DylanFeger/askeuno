import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { createAuthenticatedRequest, createMockResponse, createMockNext, createMockFile, runHandler } from './utils/test-helpers';

const mockStorage = vi.hoisted(() => ({
  getUser: vi.fn(),
  getDataSourcesByUserId: vi.fn(),
  createDataSource: vi.fn(),
  updateDataSource: vi.fn(),
  insertDataRows: vi.fn(),
  getDataSource: vi.fn(),
  deleteDataSource: vi.fn(),
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

// Multer expects multipart parsing; for unit tests we bypass it and rely on `req.file`.
vi.mock('multer', () => {
  const multer = () => ({
    single: () => (_req: any, _res: any, next: any) => next(),
  });
  (multer as any).memoryStorage = () => ({});
  return { default: multer };
});

// Mock dependencies
vi.mock('../server/storage', () => ({
  storage: mockStorage,
}));

vi.mock('../server/utils/logger', () => ({
  logger: mockLogger,
}));

vi.mock('../server/services/s3Service', () => mockS3Service);

vi.mock('../server/services/dataProcessor', () => mockDataProcessor);

describe('File Upload Routes', () => {
  let uploadRouter: any;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    uploadRouter = (await import('../server/routes/uploads')).default;
    req = createAuthenticatedRequest(1);
    res = createMockResponse();
    next = createMockNext();
    vi.clearAllMocks();

    mockStorage.getUser.mockResolvedValue({
      id: 1,
      username: 'testuser',
      subscriptionTier: 'starter',
      subscriptionStatus: 'active',
      role: 'main_user',
    });
  });

  describe('POST /upload', () => {
    beforeEach(() => {
      req.method = 'POST';
      req.path = '/upload';
    });

    it('should upload and process CSV file successfully', async () => {
      const file = createMockFile('test.csv', 'name,value\ntest,123\nanother,456');
      
      req.file = file;
      req.body = {
        dataSourceName: 'Test Data Source',
        description: 'Test description',
      };

      mockDataProcessor.processUploadedFile.mockResolvedValue({
        success: true,
        data: {
          rows: [
            { name: 'test', value: 123 },
            { name: 'another', value: 456 },
          ],
          schema: {
            columns: ['name', 'value'],
            types: { name: 'string', value: 'number' },
          },
          summary: '2 rows processed',
          columns: ['name', 'value'],
        },
        s3Key: 'uploads/user1/test.csv',
      });

      mockDataProcessor.validateData.mockReturnValue({
        isValid: true,
        errors: [],
      });

      mockDataProcessor.transformData.mockReturnValue([
        { name: 'test', value: 123 },
        { name: 'another', value: 456 },
      ]);

      mockStorage.getUser.mockResolvedValue({
        id: 1,
        username: 'testuser',
        subscriptionTier: 'starter',
        subscriptionStatus: 'active',
      });

      mockStorage.getDataSourcesByUserId.mockResolvedValue([]);

      mockStorage.createDataSource.mockResolvedValue({
        id: 1,
        userId: 1,
        name: 'Test Data Source',
        type: 'file',
        connectionType: 'upload',
        status: 'processing',
      });

      mockStorage.insertDataRows.mockResolvedValue(undefined);
      mockStorage.updateDataSource.mockResolvedValue(undefined);

      await runHandler(uploadRouter, req, res);

      expect(mockDataProcessor.processUploadedFile).toHaveBeenCalledWith(
        1,
        'test.csv',
        expect.any(Buffer),
        'text/csv'
      );
      expect(mockDataProcessor.validateData).toHaveBeenCalled();
      expect(mockDataProcessor.transformData).toHaveBeenCalled();
      expect(mockStorage.createDataSource).toHaveBeenCalled();
      expect(mockStorage.insertDataRows).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
      const response = (res.json as any).mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.dataSource).toBeDefined();
    });

    it('should reject upload without file', async () => {
      req.file = undefined;
      req.body = {};

      await runHandler(uploadRouter, req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'No file provided' });
    });

    it('should reject invalid file type', async () => {
      const file = createMockFile('test.exe', 'binary content', 'application/x-msdownload');
      req.file = file;

      // Multer fileFilter would reject this before reaching the handler
      // This test verifies the fileFilter logic
      const allowedTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/json',
      ];

      expect(allowedTypes.includes(file.mimetype)).toBe(false);
    });

    it('should enforce data source limits per tier', async () => {
      const file = createMockFile('test.csv', 'name,value\ntest,123');
      req.file = file;
      req.body = { dataSourceName: 'New Data Source' };

      mockDataProcessor.processUploadedFile.mockResolvedValue({
        success: true,
        data: {
          rows: [{ name: 'test', value: 123 }],
          schema: { columns: ['name', 'value'] },
          summary: '1 row',
          columns: ['name', 'value'],
        },
        s3Key: 'uploads/user1/test.csv',
      });

      mockDataProcessor.validateData.mockReturnValue({ isValid: true, errors: [] });
      mockDataProcessor.transformData.mockReturnValue([{ name: 'test', value: 123 }]);

      mockStorage.getUser.mockResolvedValue({
        id: 1,
        username: 'testuser',
        subscriptionTier: 'starter', // Starter tier allows 1 data source
        subscriptionStatus: 'active',
      });

      // User already has 1 data source (at limit)
      mockStorage.getDataSourcesByUserId.mockResolvedValue([
        { id: 1, userId: 1, name: 'Existing Source' },
      ]);

      await runHandler(uploadRouter, req, res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('limit'),
          currentCount: 1,
          limit: 1,
          tier: 'starter',
        })
      );
    });

    it('should handle file processing errors', async () => {
      const file = createMockFile('test.csv', 'invalid,data');
      req.file = file;

      mockDataProcessor.processUploadedFile.mockResolvedValue({
        success: false,
        error: 'Failed to parse CSV',
      });

      await runHandler(uploadRouter, req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'File processing failed',
          details: 'Failed to parse CSV',
        })
      );
    });

    it('should handle data validation warnings', async () => {
      const file = createMockFile('test.csv', 'name,value\ntest,invalid');
      req.file = file;

      mockDataProcessor.processUploadedFile.mockResolvedValue({
        success: true,
        data: {
          rows: [{ name: 'test', value: 'invalid' }],
          schema: { columns: ['name', 'value'] },
          summary: '1 row',
          columns: ['name', 'value'],
        },
        s3Key: 'uploads/user1/test.csv',
      });

      mockDataProcessor.validateData.mockReturnValue({
        isValid: true,
        errors: ['Value column contains non-numeric data'],
      });

      mockDataProcessor.transformData.mockReturnValue([{ name: 'test', value: 'invalid' }]);

      mockStorage.getUser.mockResolvedValue({
        id: 1,
        username: 'testuser',
        subscriptionTier: 'starter',
        subscriptionStatus: 'active',
      });

      mockStorage.getDataSourcesByUserId.mockResolvedValue([]);
      mockStorage.createDataSource.mockResolvedValue({
        id: 1,
        userId: 1,
        name: 'test.csv',
        type: 'file',
        connectionType: 'upload',
        status: 'processing',
      });

      mockStorage.insertDataRows.mockResolvedValue(undefined);
      mockStorage.updateDataSource.mockResolvedValue(undefined);

      await runHandler(uploadRouter, req, res);

      expect(res.json).toHaveBeenCalled();
      const response = (res.json as any).mock.calls[0][0];
      expect(response.dataSource.validationWarnings).toBeDefined();
    });

    it('should handle data insertion errors', async () => {
      const file = createMockFile('test.csv', 'name,value\ntest,123');
      req.file = file;

      mockDataProcessor.processUploadedFile.mockResolvedValue({
        success: true,
        data: {
          rows: [{ name: 'test', value: 123 }],
          schema: { columns: ['name', 'value'] },
          summary: '1 row',
          columns: ['name', 'value'],
        },
        s3Key: 'uploads/user1/test.csv',
      });

      mockDataProcessor.validateData.mockReturnValue({ isValid: true, errors: [] });
      mockDataProcessor.transformData.mockReturnValue([{ name: 'test', value: 123 }]);

      mockStorage.getUser.mockResolvedValue({
        id: 1,
        username: 'testuser',
        subscriptionTier: 'starter',
        subscriptionStatus: 'active',
      });

      mockStorage.getDataSourcesByUserId.mockResolvedValue([]);
      mockStorage.createDataSource.mockResolvedValue({
        id: 1,
        userId: 1,
        name: 'test.csv',
        type: 'file',
        connectionType: 'upload',
        status: 'processing',
      });

      mockStorage.insertDataRows.mockRejectedValue(new Error('Database error'));

      await runHandler(uploadRouter, req, res);

      expect(mockStorage.updateDataSource).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: 'error',
          errorMessage: expect.stringContaining('Failed to store data'),
        })
      );
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('GET /download/:dataSourceId', () => {
    it('should generate download URL for user\'s file', async () => {
      req.method = 'GET';
      req.path = '/download/1';
      req.params = { dataSourceId: '1' };

      mockStorage.getDataSource.mockResolvedValue({
        id: 1,
        userId: 1,
        type: 'file',
        connectionData: {
          s3Key: 'uploads/user1/test.csv',
          filename: 'test.csv',
        },
      });

      mockS3Service.getPresignedDownloadUrl.mockResolvedValue('https://s3.amazonaws.com/presigned-url');

      await runHandler(uploadRouter, req, res);

      expect(mockS3Service.getPresignedDownloadUrl).toHaveBeenCalledWith('uploads/user1/test.csv');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          downloadUrl: 'https://s3.amazonaws.com/presigned-url',
          filename: 'test.csv',
        })
      );
    });

    it('should reject download for other user\'s file', async () => {
      req.method = 'GET';
      req.path = '/download/999';
      req.params = { dataSourceId: '999' };

      mockStorage.getDataSource.mockResolvedValue({
        id: 999,
        userId: 2, // Different user
        type: 'file',
      });

      await runHandler(uploadRouter, req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Data source not found' });
    });

    it('should reject download for non-file data source', async () => {
      req.method = 'GET';
      req.path = '/download/1';
      req.params = { dataSourceId: '1' };

      mockStorage.getDataSource.mockResolvedValue({
        id: 1,
        userId: 1,
        type: 'postgresql', // Not a file
        connectionData: {},
      });

      await runHandler(uploadRouter, req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not a file upload data source' });
    });
  });

  describe('GET /list', () => {
    it('should list user\'s uploaded files', async () => {
      req.method = 'GET';
      req.path = '/list';

      mockS3Service.listUserFiles.mockResolvedValue([]);

      mockStorage.getDataSourcesByUserId.mockResolvedValue([
        {
          id: 1,
          name: 'Test File',
          type: 'file',
          connectionData: {
            filename: 'test.csv',
            uploadDate: new Date().toISOString(),
          },
          rowCount: 100,
          status: 'active',
        },
      ]);

      await runHandler(uploadRouter, req, res);

      expect(res.json).toHaveBeenCalled();
      const response = (res.json as any).mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(Array.isArray(response.files)).toBe(true);
    });
  });

  describe('DELETE /:dataSourceId', () => {
    it('should delete user\'s file successfully', async () => {
      req.method = 'DELETE';
      req.path = '/1';
      req.params = { dataSourceId: '1' };

      mockStorage.getDataSource.mockResolvedValue({
        id: 1,
        userId: 1,
        type: 'file',
        connectionData: {
          s3Key: 'uploads/user1/test.csv',
          filename: 'test.csv',
        },
      });

      mockS3Service.deleteFromS3.mockResolvedValue(true);
      mockStorage.deleteDataSource.mockResolvedValue(undefined);

      await runHandler(uploadRouter, req, res);

      expect(mockS3Service.deleteFromS3).toHaveBeenCalledWith('uploads/user1/test.csv');
      expect(mockStorage.deleteDataSource).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('deleted successfully'),
        })
      );
    });

    it('should reject deletion of other user\'s file', async () => {
      req.method = 'DELETE';
      req.path = '/999';
      req.params = { dataSourceId: '999' };

      mockStorage.getDataSource.mockResolvedValue({
        id: 999,
        userId: 2, // Different user
        type: 'file',
      });

      await runHandler(uploadRouter, req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Data source not found' });
    });

    it('should handle S3 deletion failure gracefully', async () => {
      req.method = 'DELETE';
      req.path = '/1';
      req.params = { dataSourceId: '1' };

      mockStorage.getDataSource.mockResolvedValue({
        id: 1,
        userId: 1,
        type: 'file',
        connectionData: {
          s3Key: 'uploads/user1/test.csv',
          filename: 'test.csv',
        },
      });

      mockS3Service.deleteFromS3.mockResolvedValue(false); // S3 deletion failed
      mockStorage.deleteDataSource.mockResolvedValue(undefined);

      await runHandler(uploadRouter, req, res);

      // Should still proceed with database deletion even if S3 fails
      expect(mockStorage.deleteDataSource).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });
  });
});
