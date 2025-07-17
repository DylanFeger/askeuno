import { Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { logger } from '../utils/logger';

// Generic validation error handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors', { 
      errors: errors.array(),
      path: req.path,
      userId: (req as any).user?.id 
    });
    
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.param,
        message: error.msg
      }))
    });
  }
  next();
};

// Chat message validation
export const validateChatMessage = [
  body('message')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters')
    .escape(),
  body('conversationId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Conversation ID must be a positive integer'),
  body('dataSourceId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Data Source ID must be a positive integer'),
  handleValidationErrors
];

// File upload validation (additional to multer)
export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // Additional security checks
  const file = req.file;
  const allowedMimeTypes = [
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/json',
    'application/octet-stream' // Generic binary type, will check extension
  ];
  
  // Check MIME type first
  if (!allowedMimeTypes.includes(file.mimetype)) {
    logger.warn('Invalid file type uploaded', { 
      mimetype: file.mimetype, 
      originalname: file.originalname,
      userId: (req as any).user?.id 
    });
    return res.status(400).json({ error: 'Invalid file type' });
  }
  
  // For generic MIME types, also check file extension
  if (file.mimetype === 'application/octet-stream') {
    const allowedExtensions = ['csv', 'xlsx', 'xls', 'json'];
    const fileExt = file.originalname.split('.').pop()?.toLowerCase();
    
    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      logger.warn('Invalid file extension for generic MIME type', { 
        mimetype: file.mimetype, 
        originalname: file.originalname,
        extension: fileExt,
        userId: (req as any).user?.id 
      });
      return res.status(400).json({ error: 'Invalid file type. Please upload CSV, Excel, or JSON files.' });
    }
  }
  
  // Check file size again (belt and suspenders)
  if (file.size > 500 * 1024 * 1024) {
    logger.warn('File too large', { 
      size: file.size, 
      originalname: file.originalname,
      userId: (req as any).user?.id 
    });
    return res.status(400).json({ error: 'File too large' });
  }
  
  next();
};

// Parameter validation
export const validateConversationId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Conversation ID must be a positive integer'),
  handleValidationErrors
];

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Remove any potentially dangerous characters from string inputs
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      return value.replace(/[<>\"']/g, '');
    }
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = {};
      for (const key in value) {
        sanitized[key] = sanitizeValue(value[key]);
      }
      return sanitized;
    }
    return value;
  };
  
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  
  next();
};