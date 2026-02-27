# ===========================================
# Ask Euno - Production Dockerfile
# ===========================================
# Optimized for AWS App Runner deployment
# ===========================================

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application (frontend + backend)
RUN npm run build

# Verify build output
RUN test -d dist/public && test -f dist/index.js || (echo "Build failed!" && exit 1)

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install runtime dependencies (wget for health checks)
RUN apk add --no-cache wget

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/drizzle.config.ts ./

# Create directories for uploads and logs
RUN mkdir -p uploads logs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port (App Runner will set PORT env var)
EXPOSE 5000

# Health check (App Runner compatible)
# App Runner will override this with its own health check configuration
# This is a fallback for local Docker testing
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start the application
# App Runner will set PORT environment variable automatically
CMD ["node", "dist/index.js"]
