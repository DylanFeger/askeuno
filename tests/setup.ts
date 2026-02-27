import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { vi } from 'vitest';

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';
process.env.SESSION_SECRET = 'test-session-secret-key-for-testing-only';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.AWS_ACCESS_KEY_ID = 'test-aws-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-aws-secret';
process.env.AWS_REGION = 'us-east-1';
process.env.S3_BUCKET_NAME = 'test-bucket';
process.env.STRIPE_SECRET_KEY = 'sk_test_test';
process.env.SENDGRID_API_KEY = 'SG.test';

// Global test setup
beforeAll(() => {
  // Suppress console errors in tests unless needed
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});
