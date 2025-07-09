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
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
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

// Event-specific loggers
export const fileUploadLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'file-uploads.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    })
  ]
});

export const etlLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'etl-processing.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    })
  ]
});

export const aiLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'ai-calls.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    })
  ]
});

export const paymentLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'payments.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 20, // Keep more payment logs
    })
  ]
});

// Logging helper functions
export const logFileUpload = (userId: number, fileName: string, status: 'success' | 'failure', details?: any) => {
  fileUploadLogger.info('File Upload Event', {
    userId,
    fileName,
    status,
    timestamp: new Date().toISOString(),
    fileSize: details?.fileSize,
    fileType: details?.fileType,
    processingTime: details?.processingTime,
    error: details?.error,
    rowsProcessed: details?.rowsProcessed,
  });
};

export const logETLProcess = (dataSourceId: number, stage: string, status: 'started' | 'completed' | 'failed', details?: any) => {
  etlLogger.info('ETL Process Event', {
    dataSourceId,
    stage,
    status,
    timestamp: new Date().toISOString(),
    rowsProcessed: details?.rowsProcessed,
    duration: details?.duration,
    error: details?.error,
    schemaDetected: details?.schemaDetected,
  });
};

export const logAICall = (userId: number, operation: string, status: 'success' | 'failure', details?: any) => {
  aiLogger.info('AI API Call', {
    userId,
    operation,
    status,
    timestamp: new Date().toISOString(),
    model: details?.model || 'gpt-4o',
    tokensUsed: details?.tokensUsed,
    responseTime: details?.responseTime,
    error: details?.error,
    conversationId: details?.conversationId,
  });
};

export const logPaymentEvent = (userId: number, event: string, amount?: number, details?: any) => {
  paymentLogger.info('Payment Event', {
    userId,
    event,
    amount,
    timestamp: new Date().toISOString(),
    currency: details?.currency || 'USD',
    subscriptionTier: details?.subscriptionTier,
    paymentMethod: details?.paymentMethod,
    transactionId: details?.transactionId,
    status: details?.status,
    error: details?.error,
  });
};

export default logger;