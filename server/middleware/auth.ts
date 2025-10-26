import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { logger } from '../utils/logger';

// Extend Request interface for user session
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        email: string;
        subscriptionTier: string;
        subscriptionStatus: string;
      };
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    username: string;
    email: string;
    subscriptionTier: string;
    subscriptionStatus: string;
    role?: string;
  };
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is authenticated via session
    const userId = (req.session as any)?.userId;
    
    if (!userId) {
      logger.warn('Unauthorized access attempt', { 
        ip: req.ip, 
        userAgent: req.get('User-Agent'),
        path: req.path 
      });
      return res.status(401).json({ 
        error: 'Authentication required. Please log in.' 
      });
    }

    // Get user from database
    const user = await storage.getUser(userId);
    if (!user) {
      logger.warn('Invalid user session', { userId });
      return res.status(401).json({ 
        error: 'Invalid session. Please log in again.' 
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      subscriptionTier: user.subscriptionTier,
      subscriptionStatus: user.subscriptionStatus,
      role: user.role
    };

    next();
  } catch (error) {
    logger.error('Authentication error', { error, userId: (req.session as any)?.userId });
    res.status(500).json({ error: 'Authentication failed' });
  }
};

export const requireSubscriptionTier = (requiredTier: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userTier = req.user.subscriptionTier;
    const userStatus = req.user.subscriptionStatus;
    const tierLevels = { 'starter': 1, 'professional': 2, 'enterprise': 3 };
    
    // For paid tiers, check if subscription is active
    if (requiredTier !== 'starter' && userStatus !== 'active') {
      logger.warn('Inactive subscription', { 
        userId: req.user.id,
        userTier,
        userStatus,
        requiredTier 
      });
      return res.status(403).json({ 
        error: `Active ${requiredTier} subscription required`,
        requiresUpgrade: true,
        currentTier: userTier,
        requiredTier: requiredTier
      });
    }
    
    if (tierLevels[userTier as keyof typeof tierLevels] < tierLevels[requiredTier as keyof typeof tierLevels]) {
      logger.warn('Insufficient subscription tier', { 
        userId: req.user.id,
        userTier,
        requiredTier 
      });
      return res.status(403).json({ 
        error: `This feature requires ${requiredTier} subscription or higher`,
        requiresUpgrade: true,
        currentTier: userTier,
        requiredTier: requiredTier
      });
    }
    
    next();
  };
};

// Check if user has active paid subscription
export const requirePaidSubscription = () => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userTier = req.user.subscriptionTier;
    const userStatus = req.user.subscriptionStatus;
    
    if (userTier === 'starter' || userStatus !== 'active') {
      logger.warn('Paid subscription required', { 
        userId: req.user.id,
        userTier,
        userStatus
      });
      return res.status(403).json({ 
        error: 'This feature requires an active paid subscription',
        requiresUpgrade: true,
        currentTier: userTier
      });
    }
    
    next();
  };
};

// Require main user (block chat-only users from administrative actions)
export const requireMainUser = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const user = req.user;
  
  if (user.role === 'chat_only_user') {
    logger.warn('Chat-only user attempted restricted action', {
      userId: user.id,
      path: req.path,
      method: req.method
    });
    return res.status(403).json({
      error: 'This action requires main user access',
      chatOnlyAccess: true
    });
  }
  
  next();
};

// Rate limiting by user
export const createUserRateLimit = (windowMs: number, max: number, message: string) => {
  const userRequests = new Map<number, { count: number; resetTime: number }>();
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user.id;
    const now = Date.now();
    
    let userLimit = userRequests.get(userId);
    if (!userLimit || now > userLimit.resetTime) {
      userLimit = { count: 0, resetTime: now + windowMs };
      userRequests.set(userId, userLimit);
    }
    
    if (userLimit.count >= max) {
      logger.warn('Rate limit exceeded', { userId, path: req.path });
      return res.status(429).json({ error: message });
    }
    
    userLimit.count++;
    next();
  };
};