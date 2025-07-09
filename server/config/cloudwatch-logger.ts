import winston from 'winston';
import WinstonCloudWatch from 'winston-cloudwatch';

/**
 * CloudWatch logging configuration for AWS deployments
 * This file sets up Winston to send logs to AWS CloudWatch
 */

// Only initialize CloudWatch if running in AWS
const isAWS = process.env.AWS_REGION && process.env.AWS_ACCESS_KEY_ID;

export function setupCloudWatchLogging(logger: winston.Logger, logGroupName: string, logStreamName: string) {
  if (!isAWS) {
    console.log('CloudWatch logging not configured - not running in AWS environment');
    return;
  }

  try {
    const cloudwatchConfig = {
      logGroupName,
      logStreamName,
      awsRegion: process.env.AWS_REGION,
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY,
      messageFormatter: (item: any) => {
        return `${item.level}: ${item.message} ${JSON.stringify(item.meta)}`;
      },
      uploadRate: 2000, // 2 seconds
      errorHandler: (err: any) => {
        console.error('CloudWatch logging error:', err);
      }
    };

    logger.add(new WinstonCloudWatch(cloudwatchConfig));
    console.log(`CloudWatch logging configured for ${logGroupName}/${logStreamName}`);
  } catch (error) {
    console.error('Failed to setup CloudWatch logging:', error);
  }
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

  // Add CloudWatch transport if in AWS
  if (isAWS) {
    setupCloudWatchLogging(
      logger,
      `/aws/application/acre/${process.env.NODE_ENV}`,
      `${name}-${new Date().toISOString().split('T')[0]}`
    );
  }

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