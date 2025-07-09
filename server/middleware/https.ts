import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Middleware to enforce HTTPS connections
 * Redirects HTTP requests to HTTPS in production
 */
export const enforceHTTPS = (req: Request, res: Response, next: NextFunction) => {
  // Skip HTTPS enforcement in development
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  // Check if request is already HTTPS
  // Support for various proxy headers
  const isHttps = 
    req.secure || 
    req.headers['x-forwarded-proto'] === 'https' ||
    req.headers['x-forwarded-protocol'] === 'https' ||
    req.headers['x-url-scheme'] === 'https' ||
    req.headers['front-end-https'] === 'on';

  if (!isHttps) {
    // Log the redirect for monitoring
    logger.info('HTTP to HTTPS redirect', {
      originalUrl: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Construct HTTPS URL
    const httpsUrl = `https://${req.headers.host}${req.originalUrl}`;
    
    // Permanent redirect to HTTPS
    return res.redirect(301, httpsUrl);
  }

  // Add Strict-Transport-Security header for HTTPS requests
  // This tells browsers to always use HTTPS for this domain
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  next();
};

/**
 * Middleware to add security headers for HTTPS connections
 */
export const httpsSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Only add these headers in production with HTTPS
  if (process.env.NODE_ENV === 'production') {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS filter
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Control referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Feature policy
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=()'
    );
  }
  
  next();
};