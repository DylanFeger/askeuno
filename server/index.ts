import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { logger } from "./utils/logger";
import { sanitizeInput } from "./middleware/validation";
import { enforceHTTPS, httpsSecurityHeaders } from "./middleware/https";
import { pool, sessionPool } from "./db";

// Global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  console.error('Uncaught Exception:', error);
  // Don't exit the process in development to allow for debugging
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error for database connection issues
});

// Handle SIGTERM and SIGINT gracefully
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  pool.end();
  sessionPool.end();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  pool.end();
  sessionPool.end();
  process.exit(0);
});

const app = express();

// Trust proxy for rate limiting and HTTPS detection
app.set('trust proxy', 1);

// Enforce HTTPS (must be first middleware)
app.use(enforceHTTPS);
app.use(httpsSecurityHeaders);

// Security middleware with Stripe.js support
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:", "https://api.stripe.com", "https://ws.stripe.com"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
      mediaSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  message: { error: "Too many requests from this IP, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Session configuration
import * as connectPgSimple from 'connect-pg-simple';
const pgSession = connectPgSimple.default(session);

// Ensure SESSION_SECRET is set in production
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  logger.error('SESSION_SECRET is not set in production environment');
  throw new Error('SESSION_SECRET must be set in production environment');
}

app.use(session({
  store: new pgSession({
    pool: sessionPool,  // Use dedicated session pooly
    tableName: 'user_sessions',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'dev-secret-key-do-not-use-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Disable secure cookies for localhost development
    httpOnly: true, // Prevents XSS attacks
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax', // Better compatibility while maintaining CSRF protection
    path: '/', // Explicitly set cookie path
  },
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

// Enhanced logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const logData: any = {
        method: req.method,
        path: path,
        statusCode: res.statusCode,
        duration: duration,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: (req as any).user?.id,
      };

      // Only log response for successful requests and avoid logging sensitive data
      if (res.statusCode < 400 && capturedJsonResponse) {
        const sanitizedResponse = { ...capturedJsonResponse };
        delete sanitizedResponse.password;
        delete sanitizedResponse.token;
        logData.response = sanitizedResponse;
      }

      if (res.statusCode >= 400) {
        logger.warn('API Request Error', logData);
      } else {
        logger.info('API Request', logData);
      }

      // Keep backward compatibility for development
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Enhanced error handling middleware
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    
    // Log error details
    logger.error('Server Error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userId: (req as any).user?.id,
    });

    // Don't expose internal errors in production
    const message = status === 500 && process.env.NODE_ENV === 'production' 
      ? "Internal Server Error" 
      : err.message || "Internal Server Error";

    res.status(status).json({ 
      error: message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use PORT from environment variable with fallback to 5000
  // This allows the app to work in different deployment environments
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "localhost",
    // reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
