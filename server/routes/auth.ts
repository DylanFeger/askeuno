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

// Preferences validation
const preferencesValidation = [
  body('extendedResponses')
    .optional()
    .isBoolean()
    .withMessage('Extended responses must be a boolean'),
  handleValidationErrors
];

// Login validation - accepts either email or username
const loginValidation = [
  body('username')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Email or username is required'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required'),
  handleValidationErrors
];

// Register endpoint
router.post('/register', registerValidation, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Trim inputs
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    
    // Check if user already exists (case-insensitive)
    const existingUser = await storage.getUserByUsername(trimmedUsername);
    if (existingUser) {
      logSecurityEvent('REGISTRATION_ATTEMPT_DUPLICATE_USERNAME', {
        username: trimmedUsername,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const existingEmail = await storage.getUserByEmail(trimmedEmail);
    if (existingEmail) {
      logSecurityEvent('REGISTRATION_ATTEMPT_DUPLICATE_EMAIL', {
        email: trimmedEmail,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create user with trimmed values - automatically gets starter tier with active status
    const user = await storage.createUser({
      username: trimmedUsername,
      email: trimmedEmail,
      password: hashedPassword
    });
    
    // No trial needed for free tier - they get immediate access
    
    // Create session with user_id, username, and subscription_tier
    (req.session as any).userId = user.id;
    (req.session as any).username = user.username;
    (req.session as any).subscriptionTier = user.subscriptionTier;
    
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
        role: user.role,
        subscriptionTier: user.subscriptionTier
      }
    });
  } catch (error: any) {
    logger.error('Registration error', { error, body: req.body });
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Test tier override endpoint (DEVELOPMENT ONLY)
router.post('/test-tier-override', async (req, res) => {
  // Only allow in development mode
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }
  
  const userId = (req.session as any)?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const { tier } = req.body;
  const validTiers = ['starter', 'professional', 'enterprise'];
  
  if (!validTiers.includes(tier)) {
    return res.status(400).json({ error: 'Invalid tier' });
  }
  
  try {
    // Update user tier in database
    await storage.updateUserSubscription(userId, tier, 'active');
    
    // Update session
    (req.session as any).subscriptionTier = tier;
    
    logger.info('Test tier override', { userId, tier });
    
    res.json({ 
      message: `Test tier updated to ${tier}`,
      tier 
    });
  } catch (error) {
    logger.error('Test tier override error', { error, userId });
    res.status(500).json({ error: 'Failed to update test tier' });
  }
});

// Login endpoint
router.post('/login', loginValidation, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Trim whitespace from username/email
    const trimmedUsername = username.trim();
    
    // Check if input is email or username
    const isEmail = trimmedUsername.includes('@');
    const user = isEmail 
      ? await storage.getUserByEmail(trimmedUsername)
      : await storage.getUserByUsername(trimmedUsername);
    
    if (!user) {
      logSecurityEvent('LOGIN_ATTEMPT_INVALID_CREDENTIALS', {
        loginInput: username,
        isEmail,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(401).json({ error: 'Invalid email or username. Please check your credentials and try again.' });
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
    
    // Create session with user_id, username, and subscription_tier
    (req.session as any).userId = user.id;
    (req.session as any).username = user.username;
    (req.session as any).subscriptionTier = user.subscriptionTier;
    
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
        role: user.role,
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
      role: user.role,
      subscriptionTier: user.subscriptionTier,
      subscriptionStatus: user.subscriptionStatus,
      trialStartDate: user.trialStartDate,
      trialEndDate: user.trialEndDate,
      invitedBy: user.invitedBy,
      preferences: {
        extendedResponses: (req.session as any)?.extendedResponses || false
      }
    });
  } catch (error: any) {
    logger.error('Get current user error', { error, userId: (req.session as any)?.userId });
    res.status(500).json({ error: 'Failed to get user information' });
  }
});

// Update preferences endpoint (Professional and Enterprise only)
router.patch('/preferences', preferencesValidation, async (req, res) => {
  try {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Only Professional and Enterprise users can toggle extended responses
    if (user.subscriptionTier !== 'professional' && user.subscriptionTier !== 'enterprise') {
      return res.status(403).json({ 
        error: 'Extended responses are only available for Professional and Enterprise tiers' 
      });
    }
    
    const { extendedResponses } = req.body;
    
    // Store preference in session
    (req.session as any).extendedResponses = extendedResponses;
    
    logger.info('User preferences updated', { 
      userId,
      extendedResponses 
    });
    
    res.json({ 
      message: 'Preferences updated successfully',
      preferences: { extendedResponses } 
    });
  } catch (error) {
    logger.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

export default router;