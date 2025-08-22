import winston from 'winston';

/**
 * Logging configuration for application
 * This file sets up Winston for logging
 */

// CloudWatch logging has been removed as we no longer use AWS
const isCloudWatchEnabled = false;

export function setupCloudWatchLogging(logger: winston.Logger, logGroupName: string, logStreamName: string) {
  // CloudWatch logging has been removed
  console.log('CloudWatch logging has been disabled - using console logging instead');
  return;
}

// Export function to create CloudWatch-enabled loggers
export function createCloudWatchLogger(name: string, level: string = 'info'): winston.Logger {
  const logger = winston.createLogger({
    level,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ]
  });

  // CloudWatch transport has been removed

  return logger;
}

// Pre-configured loggers for different event types
export const cloudWatchLoggers = {
  fileUpload: createCloudWatchLogger('file-uploads'),
  etl: createCloudWatchLogger('etl-processing'),
  ai: createCloudWatchLogger('ai-calls'),
  payment: createCloudWatchLogger('payments'),
  security: createCloudWatchLogger('security', 'warn'),
  application: createCloudWatchLogger('application')
};