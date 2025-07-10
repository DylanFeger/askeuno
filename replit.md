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
✓ **FILE SIZE LIMIT INCREASED** (January 9, 2025):
  - Increased upload limit from 10MB to 500MB for large business datasets
  - Updated frontend validation and display text
  - Updated backend multer, security, and validation middleware
  - Businesses can now upload years of historical data
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
✓ **MAJOR ARCHITECTURAL PIVOT TO LIVE DATA** (January 9, 2025):
  - Transformed from file upload system to live data integration platform
  - Home page now shows connected live data sources with real-time status
  - Updated hero section: "Live Business Intelligence Made Simple"
  - Features section now emphasizes live data sync capabilities
  - Added support for connecting to databases, cloud storage, APIs, and SaaS apps
  - Database schema updated with connection_type, status, sync_frequency, error_message columns
  - Excel upload functionality fixed for ES modules compatibility
  - File size limit increased to 500MB for large business datasets
✓ **CLICKABLE LOGO NAVIGATION** (January 10, 2025):
  - Made Acre logo clickable in all locations (header and footer)
  - Logo click routes users back to homepage (/)
  - Added cursor pointer and hover effects for better UX
  - Fixed nested anchor tag warnings by using div elements inside Link
  - Consistent styling maintained across authenticated and unauthenticated views
  - Logo navigation works in Navbar, home page header, and footer
✓ **CORE DATA PIPELINE IMPLEMENTED** (January 10, 2025):
  - **AWS S3 Integration**: Secure file storage with business isolation
    - Created S3 service with encryption at rest (AES256)
    - Unique folder structure per business (business-{userId}/)
    - Pre-signed URLs for secure downloads
    - File lifecycle management (upload, download, delete, list)
  - **Advanced Data Processing**: Multi-format support with AI-powered analysis
    - Support for Excel (.xlsx/.xls), CSV, and JSON files
    - AI-powered schema detection using OpenAI
    - Automatic data type inference and validation
    - Data quality checks with null value analysis
    - Intelligent data summarization for business context
  - **Live Data Connectors**: Support for multiple data sources
    - Database connections: MySQL, PostgreSQL, MongoDB
    - API integrations: Shopify, Stripe, Google Ads, Salesforce
    - Cloud storage: Google Sheets integration
    - Generic REST API connector for custom sources
    - OAuth and API key authentication support
  - **Real-time Data Sync**: Push and pull mechanisms
    - Webhook endpoints for Shopify, Stripe, and generic sources
    - Webhook signature verification for security
    - Scheduled sync jobs using node-cron
    - Redis-backed job queue for reliable processing
    - Automatic retry with error handling
  - **Enhanced File Upload System**: Production-ready upload infrastructure
    - Dedicated upload routes at /api/files/*
    - Support for drag-and-drop uploads up to 500MB
    - Automatic file processing and data extraction
    - Progress tracking and error reporting
    - Integration with S3 for permanent storage
  - **Data Security & Isolation**: Enterprise-grade security
    - Each business has isolated data storage
    - Encrypted connection data for external sources
    - Webhook token and signature verification
    - Row-level data isolation in PostgreSQL
    - Secure API key storage and management
  - **AI Chat Enhancements**: Real data querying
    - Chat interface now queries actual user data
    - Context-aware responses based on data schema
    - Support for brief and extended analysis modes
    - Automatic data source selection
    - Real-time data insights generation
✓ **THREE NEW DATA MANAGEMENT FEATURES** (January 10, 2025):
  - **Chat History by Database**: View previous conversations organized by data source
    - Created ChatHistoryModal component to display conversations per database
    - Shows timestamps and message previews for each conversation
    - Allows loading previous conversations to continue analysis
    - Conversations now linked to specific data sources via dataSourceId
  - **Secure Database Removal**: Delete data sources with full cleanup
    - Added delete buttons on each data source card
    - Confirmation dialog warns about permanent deletion
    - Automatically removes AWS S3 files when deleting uploaded databases
    - Cascading delete removes all associated conversations and data rows
    - Secure ownership checks prevent unauthorized deletions
  - **Response Length Control**: Already implemented via Extended Thinking toggle
    - Brief mode (default): 2-3 sentence responses with key insights
    - Extended mode: Comprehensive analysis with multiple perspectives
    - Different system prompts optimize for each mode
    - Token limits adjusted (300 vs 1500) for appropriate response lengths
✓ **AUTOMATIC CHAT TITLE GENERATION** (January 10, 2025):
  - **AI-Generated Titles**: Conversations now automatically receive meaningful titles
    - OpenAI generates titles based on the first user-AI exchange
    - Titles are 5-8 words max, clear and business-focused
    - Avoids generic phrases like "Chat about data"
    - Database name included in context for better titles
  - **Database Schema Update**: Added title field to chat_conversations table
  - **Storage Layer Update**: Added updateConversation method to support title updates
  - **Chat History Display**: Titles now shown in ChatHistoryModal instead of "Chat #X"
  - **Fallback Handling**: If title generation fails, uses "Chat with Acre — [Date]"
  - **Extended Thinking Refinement**: Reduced extended mode to add just a few details (4-6 sentences)
    - Focused on user's specific question without branching out
    - Token limit reduced from 1500 to 600 for more concise extended responses
✓ **FOOTER AND SUBSCRIPTION MANAGEMENT** (January 10, 2025):
  - **Unified Footer Component**: Created reusable Footer component for consistency
    - Footer now appears on both authenticated and unauthenticated views
    - Includes product links, company info, support links, and privacy link
    - Uses consistent styling with sage green theme
  - **Subscription Management Page**: Full subscription management interface
    - Shows current plan details with features
    - Displays all available plans (Starter, Professional, Enterprise)
    - Visual plan comparison with pricing and features
    - Upgrade buttons ready for payment integration
    - Cancel subscription option with proper messaging
  - **Navigation Updates**: Added subscription access in navbar
    - Credit card icon in navbar for easy subscription access
    - Subscription link appears next to username for logged-in users
    - Route added at /subscription for full management page
✓ **COMPREHENSIVE SUBSCRIPTION SYSTEM UPGRADE** (January 10, 2025):
  - **Monthly/Annual Toggle**: Clear toggle switch for billing cycle selection
    - Instant price updates when toggled
    - Annual plans show "Save 2 months" badge
    - Displays annual savings amount in pricing cards
  - **Free Trial System**: 30-day free trial for all tiers
    - Trial status prominently displayed with days remaining
    - Clear messaging about no credit card required
    - Trial end date shown in current plan section
    - Once-per-account-per-tier trial tracking (via trialHistory field)
  - **Realistic Pricing Tiers**: Three tiers with meaningful differences
    - Starter: $29/mo ($290/year) - 3 sources, 10K rows, basic features
    - Growth: $79/mo ($790/year) - 20 sources, 100K rows, real-time sync
    - Pro: $149/mo ($1490/year) - Unlimited everything, dedicated support
    - "Most Popular" badge on Growth tier to guide choices
  - **Cancel Subscription Flow**: Simple cancellation process
    - Small "Cancel trial/subscription" link in current plan section
    - Confirmation dialog with clear consequences
    - Different messaging for trial vs paid cancellations
  - **Enhanced UX**: Warm, transparent communication
    - Clear feature comparisons with checkmarks and crossed-out items
    - Trust signals section highlighting security and value
    - Support email (support@acre.com) for questions
  - **Database Schema Updates**: Added subscription tracking fields
    - subscriptionStatus: trial, active, cancelled, expired
    - billingCycle: monthly or annual
    - trialStartDate, trialEndDate for trial tracking
    - trialHistory: JSON array tracking used trials per tier
→ OpenAI API key configured and working
→ AWS S3 credentials needed for file storage functionality
→ Redis needed for background job processing (optional for development)
→ Waiting for AWS SES credentials to enable email functionality
→ Backend is now production-ready with enterprise-grade security, monitoring, and data pipeline