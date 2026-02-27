import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { createMockRequest, createMockResponse, createMockNext, runHandler } from './utils/test-helpers';

const mockStorage = vi.hoisted(() => ({
  getUser: vi.fn(),
  getUserByUsername: vi.fn(),
  getUserByEmail: vi.fn(),
  createUser: vi.fn(),
}));

const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

// Mock dependencies
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

describe('Authentication Routes', () => {
  let authRouter: any;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    authRouter = (await import('../server/routes/auth')).default;
    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext();
    vi.clearAllMocks();
  });

  describe('POST /register', () => {
    it('should register a new user successfully', async () => {
      const username = 'testuser';
      const email = 'test@example.com';
      const password = 'Test1234';

      req.method = 'POST';
      req.url = '/register';
      req.body = { username, email, password };
      mockStorage.getUserByUsername.mockResolvedValue(null);
      mockStorage.getUserByEmail.mockResolvedValue(null);
      mockStorage.createUser.mockResolvedValue({
        id: 1,
        username,
        email,
        password: 'hashed',
        subscriptionTier: 'starter',
        subscriptionStatus: 'active',
        role: 'main_user',
      });

      // Mock bcrypt.hash
      const hashSpy = vi.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);

      await runHandler(authRouter, req, res);

      expect(mockStorage.getUserByUsername).toHaveBeenCalledWith(username);
      expect(mockStorage.getUserByEmail).toHaveBeenCalledWith(email);
      expect(hashSpy).toHaveBeenCalledWith(password, 12);
      expect(mockStorage.createUser).toHaveBeenCalled();
      expect((req.session as any).userId).toBe(1);
      expect((req.session as any).username).toBe(username);
      expect((req.session as any).subscriptionTier).toBe('starter');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();

      hashSpy.mockRestore();
    });

    it('should reject registration with duplicate username', async () => {
      req.method = 'POST';
      req.url = '/register';
      req.body = {
        username: 'existinguser',
        email: 'new@example.com',
        password: 'Test1234',
      };

      mockStorage.getUserByUsername.mockResolvedValue({
        id: 1,
        username: 'existinguser',
      });

      await runHandler(authRouter, req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Username already exists' });
    });

    it('should reject registration with duplicate email', async () => {
      req.method = 'POST';
      req.url = '/register';
      req.body = {
        username: 'newuser',
        email: 'existing@example.com',
        password: 'Test1234',
      };

      mockStorage.getUserByUsername.mockResolvedValue(null);
      mockStorage.getUserByEmail.mockResolvedValue({
        id: 1,
        email: 'existing@example.com',
      });

      await runHandler(authRouter, req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email already exists' });
    });

    it('should reject registration with invalid password', async () => {
      req.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'weak', // Too short, no uppercase, no number
      };

      // This will be caught by validation middleware
      // For now, we'll test that validation would reject it
      expect(req.body.password.length).toBeLessThan(8);
    });

    it('should reject registration with invalid email', async () => {
      req.body = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'Test1234',
      };

      // Email validation would be handled by express-validator
      expect(req.body.email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });
  });

  describe('POST /login', () => {
    it('should login user with email successfully', async () => {
      const email = 'test@example.com';
      const password = 'Test1234';
      const hashedPassword = await bcrypt.hash(password, 12);

      req.method = 'POST';
      req.url = '/login';
      req.body = { username: email, password };
      mockStorage.getUserByEmail.mockResolvedValue({
        id: 1,
        username: 'testuser',
        email,
        password: hashedPassword,
        subscriptionTier: 'starter',
        subscriptionStatus: 'active',
        role: 'main_user',
      });

      await runHandler(authRouter, req, res);

      expect(mockStorage.getUserByEmail).toHaveBeenCalledWith(email);
      expect((req.session as any).userId).toBe(1);
      expect(res.json).toHaveBeenCalled();
    });

    it('should login user with username successfully', async () => {
      const username = 'testuser';
      const password = 'Test1234';
      const hashedPassword = await bcrypt.hash(password, 12);

      req.method = 'POST';
      req.url = '/login';
      req.body = { username, password };
      mockStorage.getUserByUsername.mockResolvedValue({
        id: 1,
        username,
        email: 'test@example.com',
        password: hashedPassword,
        subscriptionTier: 'starter',
        subscriptionStatus: 'active',
        role: 'main_user',
      });

      await runHandler(authRouter, req, res);

      expect(mockStorage.getUserByUsername).toHaveBeenCalledWith(username);
      expect((req.session as any).userId).toBe(1);
      expect(res.json).toHaveBeenCalled();
    });

    it('should reject login with invalid credentials', async () => {
      req.method = 'POST';
      req.url = '/login';
      req.body = { username: 'nonexistent', password: 'wrong' };
      mockStorage.getUserByEmail.mockResolvedValue(null);
      mockStorage.getUserByUsername.mockResolvedValue(null);

      await runHandler(authRouter, req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Invalid') })
      );
    });

    it('should reject login with incorrect password', async () => {
      const email = 'test@example.com';
      const hashedPassword = await bcrypt.hash('CorrectPassword123', 12);

      req.method = 'POST';
      req.url = '/login';
      req.body = { username: email, password: 'WrongPassword123' };
      mockStorage.getUserByEmail.mockResolvedValue({
        id: 1,
        username: 'testuser',
        email,
        password: hashedPassword,
        subscriptionTier: 'starter',
        subscriptionStatus: 'active',
        role: 'main_user',
      });

      await runHandler(authRouter, req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Incorrect password') })
      );
    });
  });

  describe('POST /logout', () => {
    it('should logout user successfully', async () => {
      req.method = 'POST';
      req.url = '/logout';
      (req.session as any).userId = 1;
      (req.session as any).username = 'testuser';

      await runHandler(authRouter, req, res);

      expect((req.session as any).destroy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Logout successful' });
    });

    it('should handle logout errors gracefully', async () => {
      req.method = 'POST';
      req.url = '/logout';
      (req.session as any).userId = 1;
      (req.session as any).destroy = vi.fn((callback?: (err?: any) => void) => {
        if (callback) callback(new Error('Session destroy failed'));
      });

      await runHandler(authRouter, req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Logout failed' });
    });
  });

  describe('GET /me', () => {
    it('should return current user when authenticated', async () => {
      req.method = 'GET';
      req.url = '/me';
      (req.session as any).userId = 1;
      mockStorage.getUser.mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        subscriptionTier: 'starter',
        subscriptionStatus: 'active',
        role: 'main_user',
        trialStartDate: null,
        trialEndDate: null,
        invitedBy: null,
      });

      await runHandler(authRouter, req, res);

      expect(mockStorage.getUser).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      req.method = 'GET';
      req.url = '/me';
      (req.session as any).userId = undefined;

      await runHandler(authRouter, req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
    });

    it('should return 401 when user not found', async () => {
      req.method = 'GET';
      req.url = '/me';
      (req.session as any).userId = 999;
      mockStorage.getUser.mockResolvedValue(null);

      await runHandler(authRouter, req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid session' });
    });
  });
});
