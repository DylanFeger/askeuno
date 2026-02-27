import { Request, Response } from 'express';
import { vi } from 'vitest';

/**
 * Create a mock Express request
 */
export function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    ip: '127.0.0.1',
    get: vi.fn((header: string) => {
      if (header === 'User-Agent') return 'test-agent';
      return undefined;
    }),
    session: {
      userId: undefined,
      username: undefined,
      subscriptionTier: undefined,
      destroy: vi.fn((callback?: (err?: any) => void) => {
        if (callback) callback();
      }),
      regenerate: vi.fn((callback?: (err?: any) => void) => {
        if (callback) callback();
      }),
      save: vi.fn((callback?: (err?: any) => void) => {
        if (callback) callback();
      }),
      reload: vi.fn((callback?: (err?: any) => void) => {
        if (callback) callback();
      }),
    } as any,
    ...overrides,
  };
}

/**
 * Create a mock Express response
 */
export function createMockResponse(): Partial<Response> {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    getHeader: vi.fn(),
  };
  return res;
}

/**
 * Create a mock Express next function
 */
export function createMockNext(): ReturnType<typeof vi.fn> {
  return vi.fn();
}

/**
 * Create a mock authenticated request
 */
export function createAuthenticatedRequest(userId: number, overrides: Partial<Request> = {}): Partial<Request> {
  const req = createMockRequest(overrides);
  (req.session as any).userId = userId;
  (req.session as any).username = 'testuser';
  (req.session as any).subscriptionTier = 'starter';
  return req;
}

/**
 * Wait for async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create mock file for upload tests
 */
export function createMockFile(
  filename: string = 'test.csv',
  content: string = 'name,value\ntest,123',
  mimetype: string = 'text/csv'
): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: filename,
    encoding: '7bit',
    mimetype,
    size: Buffer.from(content).length,
    buffer: Buffer.from(content),
    destination: '',
    filename: filename,
    path: '',
    stream: null as any,
  };
}
