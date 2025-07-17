import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { body } from 'express-validator';
import { storage } from '../storage';
import { logger, logSecurityEvent } from '../utils/logger';
import { handleValidationErrors } from '../middleware/validation';
import { insertUserSchema } from '@shared/schema';
import { sendWelcomeEmail } from '../services/awsSes';

const router = Router();

// Register validation
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  handleValidationErrors
];

// Login validation
const loginValidation = [
  body('username')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Username is required'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required'),
  handleValidationErrors
];

// Register endpoint
router.post('/register', registerValidation, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      logSecurityEvent('REGISTRATION_ATTEMPT_DUPLICATE_USERNAME', {
        username,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const existingEmail = await storage.getUserByEmail(email);
    if (existingEmail) {
      logSecurityEvent('REGISTRATION_ATTEMPT_DUPLICATE_EMAIL', {
        email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const user = await storage.createUser({
      username,
      email,
      password: hashedPassword
    });
    
    // Create session
    (req.session as any).userId = user.id;
    
    logSecurityEvent('USER_REGISTERED', {
      userId: user.id,
      username: user.username,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    logger.info('User registered successfully', { userId: user.id, username: user.username });
    
    // Send welcome email (don't wait for it)
    sendWelcomeEmail(user.email, user.username)
      .then(result => {
        if (result.success) {
          logger.info('Welcome email sent', { userId: user.id, email: user.email });
        } else {
          logger.warn('Failed to send welcome email', { userId: user.id, error: result.error });
        }
      })
      .catch(error => {
        logger.error('Error sending welcome email', { userId: user.id, error });
      });
    
    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        subscriptionTier: user.subscriptionTier
      }
    });
  } catch (error: any) {
    logger.error('Registration error', { error, body: req.body });
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login endpoint
router.post('/login', loginValidation, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Get user
    const user = await storage.getUserByUsername(username);
    if (!user) {
      logSecurityEvent('LOGIN_ATTEMPT_INVALID_USERNAME', {
        username,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(401).json({ error: 'Username not found. Please check your username and try again.' });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      logSecurityEvent('LOGIN_ATTEMPT_INVALID_PASSWORD', {
        userId: user.id,
        username: user.username,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }
    
    // Create session
    (req.session as any).userId = user.id;
    
    logSecurityEvent('USER_LOGGED_IN', {
      userId: user.id,
      username: user.username,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    logger.info('User logged in successfully', { userId: user.id, username: user.username });
    
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        subscriptionTier: user.subscriptionTier
      }
    });
  } catch (error: any) {
    logger.error('Login error', { error, username: req.body.username });
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  const userId = (req.session as any)?.userId;
  
  req.session.destroy((err) => {
    if (err) {
      logger.error('Logout error', { error: err, userId });
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    if (userId) {
      logSecurityEvent('USER_LOGGED_OUT', {
        userId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }
    
    res.json({ message: 'Logout successful' });
  });
});

// Current user endpoint
router.get('/me', async (req, res) => {
  try {
    const userId = (req.session as any)?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid session' });
    }
    
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      subscriptionTier: user.subscriptionTier
    });
  } catch (error: any) {
    logger.error('Get current user error', { error, userId: (req.session as any)?.userId });
    res.status(500).json({ error: 'Failed to get user information' });
  }
});

export default router;