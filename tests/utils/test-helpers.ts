import { Request, Response } from 'express';
import { vi } from 'vitest';

/**
 * Create a mock Express request
 */
export function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  const req: any = {
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
  };

  // Keep url and path in sync for Express router matching.
  // Many tests set `req.path` but Express Router routes on `req.url`.
  let _path = (overrides as any).path ?? '/';
  Object.defineProperty(req, 'path', {
    get() {
      return _path;
    },
    set(value: string) {
      _path = value;
      req.url = value;
    },
    enumerable: true,
    configurable: true,
  });
  req.url = (overrides as any).url ?? _path;

  // Apply overrides after defining accessors so setters run.
  Object.keys(overrides).forEach((key) => {
    (req as any)[key] = (overrides as any)[key];
  });

  return req;
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
 * Run an Express router/handler and await completion.
 * Express routers are callback-based; they do not return promises.
 * We resolve when the handler sends a response (json/send/redirect) or calls next().
 */
export async function runHandler(
  handler: any,
  req: Partial<Request>,
  res: Partial<Response>,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let finished = false;
    const done = (err?: any) => {
      if (finished) return;
      finished = true;
      err ? reject(err) : resolve();
    };

    const wrap = (name: 'json' | 'send' | 'redirect') => {
      const original = (res as any)[name];
      (res as any)[name] = vi.fn((...args: any[]) => {
        try {
          return original?.(...args);
        } finally {
          done();
        }
      });
    };

    wrap('json');
    wrap('send');
    wrap('redirect');

    try {
      handler(req as any, res as any, done);
      // Fallback timeout so tests don't hang forever
      setTimeout(() => done(new Error('Handler did not finish')), 2000).unref?.();
    } catch (err) {
      done(err);
    }
  });
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
