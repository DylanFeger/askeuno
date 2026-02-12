/**
 * Environment Variable Validation
 * Ensures all required environment variables are set before startup
 */

import { logger } from '../utils/logger';

interface EnvConfig {
  required: string[];
  optional: string[];
  validators: Record<string, (value: string) => boolean | string>;
}

const envConfig: EnvConfig = {
  required: [
    'DATABASE_URL',
    'SESSION_SECRET',
    'ENCRYPTION_KEY',
    'NODE_ENV',
  ],
  
  optional: [
    'SENTRY_DSN',
    'OPENAI_API_KEY',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'SENDGRID_API_KEY',
    'LS_CLIENT_ID',
    'LS_CLIENT_SECRET',
    'LS_REDIRECT_URI',
    'PORT',
    'APP_VERSION',
  ],
  
  validators: {
    ENCRYPTION_KEY: (value: string) => {
      if (value.length !== 64) {
        return 'ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes for AES-256)';
      }
      if (!/^[0-9a-fA-F]+$/.test(value)) {
        return 'ENCRYPTION_KEY must be a valid hex string';
      }
      return true;
    },
    
    SESSION_SECRET: (value: string) => {
      if (value.length < 32) {
        return 'SESSION_SECRET must be at least 32 characters long';
      }
      return true;
    },
    
    DATABASE_URL: (value: string) => {
      if (!value.startsWith('postgresql://') && !value.startsWith('postgres://')) {
        return 'DATABASE_URL must be a valid PostgreSQL connection string';
      }
      return true;
    },
    
    NODE_ENV: (value: string) => {
      const valid = ['development', 'production', 'test'];
      if (!valid.includes(value)) {
        return `NODE_ENV must be one of: ${valid.join(', ')}`;
      }
      return true;
    },
  },
};

/**
 * Validate all environment variables
 * Throws error if validation fails
 */
export function validateEnv(): void {
  const missing: string[] = [];
  const invalid: Array<{ name: string; error: string }> = [];
  
  // Check required variables
  for (const varName of envConfig.required) {
    const value = process.env[varName];
    
    if (!value) {
      missing.push(varName);
      continue;
    }
    
    // Run validator if exists
    const validator = envConfig.validators[varName];
    if (validator) {
      const result = validator(value);
      if (result !== true) {
        invalid.push({ name: varName, error: result as string });
      }
    }
  }
  
  // Check optional variables that are set (validate format if provided)
  for (const varName of envConfig.optional) {
    const value = process.env[varName];
    if (value) {
      const validator = envConfig.validators[varName];
      if (validator) {
        const result = validator(value);
        if (result !== true) {
          invalid.push({ name: varName, error: result as string });
        }
      }
    }
  }
  
  // Report errors
  if (missing.length > 0) {
    const error = new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env file or environment configuration.\n` +
      `Required variables: ${envConfig.required.join(', ')}`
    );
    logger.error('Environment validation failed', { missing });
    throw error;
  }
  
  if (invalid.length > 0) {
    const errors = invalid.map(i => `  - ${i.name}: ${i.error}`).join('\n');
    const error = new Error(
      `Invalid environment variable values:\n${errors}\n` +
      `Please fix these values in your .env file or environment configuration.`
    );
    logger.error('Environment validation failed', { invalid });
    throw error;
  }
  
  // Log successful validation
  logger.info('Environment variables validated successfully', {
    required: envConfig.required.length,
    optional: envConfig.optional.length,
    environment: process.env.NODE_ENV,
  });
  
  // Warn about missing optional but recommended variables
  const recommended = ['SENTRY_DSN', 'OPENAI_API_KEY'];
  const missingRecommended = recommended.filter(v => !process.env[v]);
  if (missingRecommended.length > 0 && process.env.NODE_ENV === 'production') {
    logger.warn('Missing recommended environment variables', {
      missing: missingRecommended,
      note: 'These are optional but recommended for production',
    });
  }
}

/**
 * Get environment variable with type safety
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is not set and no default provided`);
  }
  return value || defaultValue!;
}

/**
 * Get boolean environment variable
 */
export function getEnvBool(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Get number environment variable
 */
export function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is not set and no default provided`);
  }
  const num = value ? parseInt(value, 10) : defaultValue!;
  if (isNaN(num)) {
    throw new Error(`Environment variable ${key} is not a valid number`);
  }
  return num;
}
