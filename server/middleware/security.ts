import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { storage } from '../storage';
import { logger, logSecurityEvent } from '../utils/logger';

// Authorization middleware - check if user owns the resource
export const requireOwnership = (resourceType: 'conversation' | 'dataSource') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const resourceId = parseInt(req.params.id);

      if (isNaN(resourceId)) {
        return res.status(400).json({ error: 'Invalid resource ID' });
      }

      let isOwner = false;

      if (resourceType === 'conversation') {
        const conversation = await storage.getConversation(resourceId);
        isOwner = conversation && conversation.userId === userId;
      } else if (resourceType === 'dataSource') {
        const dataSource = await storage.getDataSource(resourceId);
        isOwner = dataSource && dataSource.userId === userId;
      }

      if (!isOwner) {
        logSecurityEvent('UNAUTHORIZED_RESOURCE_ACCESS', {
          userId,
          resourceType,
          resourceId,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        });
        return res.status(403).json({ error: 'Access denied' });
      }

      next();
    } catch (error) {
      logger.error('Authorization error', { error, resourceType, resourceId: req.params.id });
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

// File upload security checks
export const validateFileUploadSecurity = (req: Request, res: Response, next: NextFunction) => {
  const file = req.file;
  if (!file) {
    return next();
  }

  // Check file extension vs mime type consistency
  const fileExt = file.originalname.split('.').pop()?.toLowerCase();
  const mimeTypeMapping: { [key: string]: string[] } = {
    'csv': ['text/csv', 'application/csv', 'application/octet-stream'],
    'xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream'],
    'xls': ['application/vnd.ms-excel', 'application/octet-stream'],
    'json': ['application/json', 'application/octet-stream']
  };

  if (fileExt && mimeTypeMapping[fileExt]) {
    if (!mimeTypeMapping[fileExt].includes(file.mimetype)) {
      logSecurityEvent('FILE_EXTENSION_MISMATCH', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        expectedExtension: fileExt,
        userId: (req as any).user?.id,
        ip: req.ip,
      });
      return res.status(400).json({ error: 'File extension does not match file type' });
    }
  }

  // Check for suspicious file names
  const suspiciousPatterns = [
    /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|php|py|rb|sh|ps1)$/i,
    /\.\./,
    /[<>:"|?*]/,
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i
  ];

  if (suspiciousPatterns.some(pattern => pattern.test(file.originalname))) {
    logSecurityEvent('SUSPICIOUS_FILE_NAME', {
      originalname: file.originalname,
      userId: (req as any).user?.id,
      ip: req.ip,
    });
    return res.status(400).json({ error: 'File name contains suspicious characters' });
  }

  next();
};

// Request size monitoring
export const monitorRequestSize = (req: Request, res: Response, next: NextFunction) => {
  if (req.get('content-length')) {
    const contentLength = parseInt(req.get('content-length') || '0');
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (contentLength > maxSize) {
      logSecurityEvent('LARGE_REQUEST_BLOCKED', {
        contentLength,
        maxSize,
        path: req.path,
        userId: (req as any).user?.id,
        ip: req.ip,
      });
      return res.status(413).json({ error: 'Request too large' });
    }
  }
  next();
};

// IP-based rate limiting for sensitive operations
const ipAttempts = new Map<string, { count: number; resetTime: number }>();

export const ipRateLimit = (maxAttempts: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip;
    const now = Date.now();

    let attempts = ipAttempts.get(ip);
    if (!attempts || now > attempts.resetTime) {
      attempts = { count: 0, resetTime: now + windowMs };
      ipAttempts.set(ip, attempts);
    }

    if (attempts.count >= maxAttempts) {
      logSecurityEvent('IP_RATE_LIMIT_EXCEEDED', {
        ip,
        maxAttempts,
        windowMs,
        path: req.path,
      });
      return res.status(429).json({ error: 'Too many requests from this IP' });
    }

    attempts.count++;
    next();
  };
};