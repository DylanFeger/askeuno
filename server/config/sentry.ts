/**
 * Sentry Error Monitoring Configuration
 * Tracks errors, exceptions, and performance issues
 */

import * as Sentry from "@sentry/node";

/**
 * Initialize Sentry for backend
 * Only initializes if SENTRY_DSN is provided (optional in development)
 */
export async function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || 'development';
  
  // Sentry is optional - only initialize if DSN is provided
  if (!dsn) {
    // Sentry not configured - this is okay for development
    return;
  }

  try {
    // Try to load profiling integration (optional)
    let profilingIntegration: any = undefined;
    try {
      const profilingModule = await import("@sentry/profiling-node");
      profilingIntegration = profilingModule.nodeProfilingIntegration;
    } catch (e) {
      // Profiling is optional - package might not be installed
    }
    
    Sentry.init({
      dsn,
      environment,
      
      // Performance Monitoring
      tracesSampleRate: environment === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
      
      // Profiling (optional, requires @sentry/profiling-node)
      profilesSampleRate: profilingIntegration ? (environment === 'production' ? 0.1 : 1.0) : 0,
      integrations: [
        ...(profilingIntegration ? [profilingIntegration()] : []),
        // Automatically instrument Express
        Sentry.httpIntegration({ tracing: true }),
      ],
      
      // Release tracking
      release: process.env.APP_VERSION || undefined,
      
      // Filter out health checks and static assets
      beforeSend(event, hint) {
        // Don't send events for health checks
        if (event.request?.url?.includes('/health')) {
          return null;
        }
        
        // Don't send events for static assets
        if (event.request?.url?.match(/\.(css|js|png|jpg|gif|ico|svg|woff|woff2)$/)) {
          return null;
        }
        
        return event;
      },
      
      // Ignore common non-critical errors
      ignoreErrors: [
        'ECONNRESET',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ENOTFOUND',
        'Request timeout',
        'Network request failed',
      ],
    });

    logger.info('[Sentry] Initialized successfully');
  } catch (error) {
    logger.error('[Sentry] Failed to initialize', { error });
    // Don't throw - Sentry is optional
  }
}

/**
 * Set user context for error tracking
 */
export function setSentryUser(userId: number, email?: string, username?: string) {
  Sentry.setUser({
    id: userId.toString(),
    email,
    username,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

/**
 * Capture exception manually
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Capture message manually
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
      Sentry.captureMessage(message, level);
    });
  } else {
    Sentry.captureMessage(message, level);
  }
}
