# Acre - Data Platform for Small Businesses

## Overview

Acre is a secure, easy-to-use data platform designed to help small businesses upload, store, and analyze their data. The application provides a secure upload portal, cloud storage integration, ETL processing, and AI-powered insights through a conversational interface.

## User Preferences

Preferred communication style: Simple, everyday language.
Target audience: Small businesses
Pricing strategy: Subscription-based with 3 tiers (Starter, Professional, Enterprise)
Key principles: 
- Easy experience, not many tools
- Fast, reliable, accurate
- No complex dashboards
- AI responses should be brief unless users ask for more details
- Toggle-able extended thinking for AI responses

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **File Processing**: Multer for uploads, XLSX for Excel files, CSV parser
- **AI Integration**: OpenAI API for data insights and analysis

### Database Design
- **Users**: Authentication and subscription management
- **Data Sources**: Metadata for uploaded files and connections
- **Chat System**: Conversations and messages for AI interactions
- **Data Rows**: Structured storage of processed data

## Key Components

### Data Ingestion System
- **File Upload**: Drag-and-drop interface supporting CSV, Excel, and JSON files
- **Validation**: Server-side file type and size validation (10MB limit)
- **Processing Pipeline**: Automated ETL using OpenAI for schema detection
- **Storage**: File metadata and processed data stored in PostgreSQL

### AI Chat Interface
- **Conversational UI**: Real-time chat interface for data queries
- **Context Awareness**: AI maintains conversation history and data context
- **Insight Generation**: Automated analysis and business recommendations
- **Follow-up Suggestions**: AI-generated relevant questions

### Authentication & Authorization
- **User Management**: Basic user registration and login system
- **Subscription Tiers**: Starter, Professional, Enterprise with different limits
- **Session Management**: Session-based authentication

### UI Component System
- **Design System**: shadcn/ui components with consistent theming
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Accessibility**: ARIA-compliant components from Radix UI

## Data Flow

1. **File Upload**: Users drag/drop files to the upload component
2. **Validation**: Server validates file type, size, and format
3. **Processing**: Files are parsed and schema is analyzed using OpenAI
4. **Storage**: Processed data is stored in PostgreSQL with metadata
5. **Chat Interface**: Users can query data through conversational AI
6. **Insights**: AI provides analysis and recommendations based on data

## External Dependencies

### Core Services
- **Database**: Neon PostgreSQL (serverless PostgreSQL)
- **AI Services**: OpenAI API for data analysis and chat responses
- **Email Service**: AWS SES (Simple Email Service) for transactional emails
- **File Processing**: Local file system for temporary uploads

### Development Tools
- **Package Manager**: npm with lockfile version 3
- **TypeScript**: Full type safety across frontend and backend
- **Database Migrations**: Drizzle Kit for schema management
- **Development Server**: Vite with hot module replacement

### UI Libraries
- **Component Library**: Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Icons**: Lucide React icons
- **Forms**: React Hook Form with Zod validation

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds React app to `dist/public`
- **Backend**: esbuild bundles Node.js server to `dist/index.js`
- **Database**: Drizzle migrations applied via `db:push` command

### Environment Configuration
- **Development**: Local development with tsx for TypeScript execution
- **Production**: Bundled Node.js application
- **Database**: PostgreSQL connection via `DATABASE_URL` environment variable
- **AI**: OpenAI API key required for chat functionality

### File Structure
```
├── client/          # React frontend
├── server/          # Express backend
├── shared/          # Shared types and schemas
├── migrations/      # Database migrations
└── dist/           # Built application
```

The application follows a monorepo structure with clear separation between frontend, backend, and shared code, enabling efficient development and deployment workflows.

## Recent Changes

✓ Fixed TypeScript errors in routes.ts with proper type definitions
✓ Added multer types for file uploads
✓ Updated database schema to include missing fields
✓ Generated and applied database migrations
✓ Implemented expandable follow-up questions in chat interface
✓ Added clickable suggested questions for better user experience
✓ Set up PostgreSQL database with proper environment configuration
✓ **SECURITY HARDENING COMPLETED** - Comprehensive backend security implementation:
  - Authentication system with bcrypt password hashing
  - Session management with PostgreSQL session store
  - Rate limiting (global IP-based and per-user for AI features)
  - Input validation and sanitization for all endpoints
  - Security headers with Helmet.js
  - Authorization middleware with resource ownership checks
  - Comprehensive logging system with sensitive data filtering
  - File upload security validation
  - Request size monitoring
  - Security event logging for audit trails
✓ **COMPREHENSIVE LOGGING SYSTEM IMPLEMENTED** (January 9, 2025):
  - Event-specific loggers for file uploads, ETL processes, AI calls, and payments
  - Structured JSON logging with automatic rotation (5MB files, 10-20 backups)
  - CloudWatch integration configuration for AWS deployments
  - Security-focused logging with sensitive data redaction
  - Python logging example for comparison/integration
  - Log files organized by category with retention policies
✓ **HEALTH CHECK ENDPOINT ADDED** (January 9, 2025):
  - /health endpoint for deployment monitoring
  - Database connectivity check with response time metrics
  - Health check script for automated monitoring
  - Comprehensive deployment documentation for Replit and AWS
✓ **UI THEME UPDATE COMPLETED** (January 9, 2025):
  - Replaced logo with glasses icon
  - Changed color theme from purple to sage green (hsl(142, 25%, 45%))
  - Updated all UI components to use new color scheme
✓ **EMAIL SERVICE MIGRATION** (January 9, 2025):
  - Replaced SendGrid with AWS SES (Simple Email Service)
  - Implemented welcome emails, password reset, and weekly reports using AWS SES
  - Created comprehensive AWS SES setup documentation
  - Added TypeScript implementation with proper error handling and retry logic
✓ **EXTENDED THINKING TOGGLE** (January 9, 2025):
  - Implemented toggle switch in chat interface for extended AI responses
  - Brief mode (default): 2-3 sentence responses focused on key insights
  - Extended mode: Detailed analysis with multiple perspectives and calculations
  - Adjusts OpenAI token limits based on mode (300 vs 1500 tokens)
  - UI toggle clearly visible next to chat status indicator
✓ **PRIVACY POLICY PAGE ADDED** (January 9, 2025):
  - Created comprehensive Privacy Policy page at /privacy route
  - Covers data collection, usage, security, cookie policy, and user rights
  - Professional yet friendly tone with clear sections and icons
  - Includes contact information (support@[mydomain].com placeholder)
  - Linked from footer of home page for easy access
→ OpenAI API key configured and working
→ Waiting for AWS SES credentials to enable email functionality
→ Backend is now production-ready with enterprise-grade security and monitoring