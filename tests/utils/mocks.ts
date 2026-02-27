import { vi } from 'vitest';

/**
 * Mock storage service
 */
export const mockStorage = {
  getUser: vi.fn(),
  getUserById: vi.fn(),
  getUserByUsername: vi.fn(),
  getUserByEmail: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  getDataSourcesByUserId: vi.fn(),
  getDataSource: vi.fn(),
  createDataSource: vi.fn(),
  updateDataSource: vi.fn(),
  deleteDataSource: vi.fn(),
  insertDataRows: vi.fn(),
};

/**
 * Mock database connection
 */
export const mockDb = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
};

/**
 * Mock OpenAI service
 */
export const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn(),
    },
  },
};

/**
 * Mock S3 service
 */
export const mockS3Service = {
  uploadFile: vi.fn(),
  getPresignedDownloadUrl: vi.fn(),
  deleteFromS3: vi.fn(),
  listUserFiles: vi.fn(),
};

/**
 * Mock data processor
 */
export const mockDataProcessor = {
  processUploadedFile: vi.fn(),
  transformData: vi.fn(),
  validateData: vi.fn(),
};

/**
 * Mock chat service
 */
export const mockChatService = {
  saveUserMessage: vi.fn(),
  createAIMessage: vi.fn(),
  updateAIMessage: vi.fn(),
  getExistingAIResponse: vi.fn(),
};

/**
 * Mock rate limiter
 */
export const mockRateLimiter = {
  checkRateLimit: vi.fn(),
};

/**
 * Mock logger
 */
export const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

/**
 * Reset all mocks
 */
export function resetAllMocks() {
  Object.values(mockStorage).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
  Object.values(mockDb).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
  Object.values(mockOpenAI).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
  Object.values(mockS3Service).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
  Object.values(mockDataProcessor).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
  Object.values(mockChatService).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
  Object.values(mockRateLimiter).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
  Object.values(mockLogger).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
}
