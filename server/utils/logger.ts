import winston from 'winston';
import path from 'path';

// Create logs directory if it doesn't exist
import { mkdirSync } from 'fs';
const logsDir = path.join(process.cwd(), 'logs');
try {
  mkdirSync(logsDir, { recursive: true });
} catch (error) {
  // Directory might already exist
}

// Custom format to remove sensitive information
const sensitiveDataFilter = winston.format((info) => {
  // Remove or mask sensitive fields
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
  
  const maskSensitive = (obj: any): any => {
    if (typeof obj === 'object' && obj !== null) {
      const masked = { ...obj };
      for (const key in masked) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          masked[key] = '[REDACTED]';
        } else if (typeof masked[key] === 'object') {
          masked[key] = maskSensitive(masked[key]);
        }
      }
      return masked;
    }
    return obj;
  };
  
  return maskSensitive(info);
});

// Logger configuration
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    sensitiveDataFilter(),
    winston.format.json()
  ),
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // File transport for errors
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ]
});

// Security event logger
export const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'security.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    })
  ]
});

// Helper function to log security events
export const logSecurityEvent = (event: string, details: any) => {
  securityLogger.info('Security Event', {
    event,
    timestamp: new Date().toISOString(),
    ...details
  });
};

export default logger;