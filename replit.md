# Euno - Data Platform for Small Businesses

## Overview
Euno is a secure, easy-to-use data platform for small businesses to upload, store, and analyze their data. It offers a secure upload portal, cloud storage integration, ETL processing, and AI-powered insights via a conversational interface. Euno aims to provide a fast, reliable, and accurate experience without complex dashboards, focusing on delivering concise, AI-driven business intelligence. The platform supports both file uploads and live data integrations, enabling real-time data sync and advanced analysis. Euno also provides multi-source database blending capabilities, allowing AI to automatically detect common fields and provide cross-database insights through natural language queries.

## User Preferences
Preferred communication style: Simple, everyday language.
Target audience: Small businesses
Pricing strategy: Subscription-based with 3 tiers:
- Starter: Free
- Professional: $99/month or $1,009/year (15% off annual)
- Enterprise: $249/month or $2,540/year (15% off annual)
Key principles: 
- Easy experience, not many tools
- Fast, reliable, accurate
- No complex dashboards
- AI acts as expert data analyst with conversational understanding
- Metaphorical intelligence for interpreting casual queries
- Proactive insights and action-oriented recommendations
- Toggle-able extended thinking for AI responses
- Smart clarification system that asks for specifics when queries are too general

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Build Tool**: Vite
- **UI/UX Decisions**: Sage green color scheme (hsl(142, 25%, 45%)), Euno brand identity with glasses icon, responsive mobile-first design, interactive elements for enhanced UX (e.g., animated hero section, demo animation), professional appearance with no emojis.
- **Key Features**: Drag-and-drop file upload, AI chat interface, authentication & authorization with subscription tier management, data sources overview (live connections & uploaded files), comprehensive settings page, contact form, visual charts for Enterprise tier, and secure connections module for data integrations.

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **File Processing**: Multer for uploads, XLSX for Excel files, CSV parser
- **AI Integration**: OpenAI API for data insights and analysis with agent-based validation system. The AI acts as a senior data analyst, providing immediate, ultra-concise (1-2 sentences) responses by default. It uses an answer-first approach, liberal query mapping, metaphorical intelligence (interpreting casual phrases as business insights), and asks minimal, context-specific follow-up questions. Agent system provides SQL validation (all tiers), multi-step analysis for complex queries (Professional/Enterprise only), and tier-aware intelligence coordination. Conversation memory is unified, and the AI strictly focuses on business-related queries.
- **Data Integrations**: Secure OAuth 2.0 connections with PKCE for Google Sheets, QuickBooks Online, Lightspeed Retail/Restaurant, and Stripe. Direct database connections (PostgreSQL/MySQL) with read-only verification. All OAuth tokens encrypted using AES-256-CBC. CSV/Excel file uploads for manual data import.
- **Core Systems**: Data ingestion pipeline (schema detection, data quality checks), AI chat engine with context awareness and response length control, robust authentication and authorization with session management, subscription tier enforcement (query limits, connection limits, multi-source blending), message deduplication, comprehensive logging, and secure connection management with automatic token refresh.
- **Data Flow**: Files are uploaded, validated, processed (parsed, AI schema analysis), and stored in PostgreSQL/AWS S3. Live integrations sync data via OAuth connections with encrypted tokens. Users query data via the AI chat interface, which provides analysis, recommendations, and optional visual charts. Multi-source database blending is supported by AI automatically detecting common fields and correlating data across connected sources.

### Database Design
- **Users**: Authentication, subscription, and query tracking.
- **Data Sources**: Metadata for uploaded files and live connections, including `conversation_data_sources` for multi-source blending.
- **Chat System**: Conversations, messages, and AI-generated titles.
- **Data Rows**: Structured storage of processed data.

### Security
- Comprehensive backend security: bcrypt password hashing, session management, rate limiting, input validation, security headers (Helmet.js), authorization middleware, security event logging, and sensitive data filtering.
- Data isolation: Secure file storage with unique folders per user in S3, encrypted connection data, and row-level data isolation in PostgreSQL.

## External Dependencies

- **Database**: Neon PostgreSQL
- **AI Services**: OpenAI API
- **Cloud Storage**: AWS S3
- **Email Service**: AWS SES
- **Payment Processing**: Stripe
- **Component Library**: Radix UI primitives
- **Icons**: Lucide React icons
- **Forms**: React Hook Form with Zod validation
- **Charting Library**: Recharts

## Recent Changes

### Agent-Based AI Validation System (October 22, 2025)
Implemented tier-aware agent system to enhance AI accuracy and provide differentiated capabilities across subscription tiers:

**Features Implemented:**
1. **SQL Validation Agent** (all tiers): Validates all generated SQL queries for correctness, security, and optimization before execution. Uses GPT-4 with lenient validation that only blocks queries with critical security/syntax issues.

2. **Multi-Step Analysis Agent** (Professional/Enterprise): Automatically detects complex queries requiring multi-step investigation and breaks them into analytical sub-queries:
   - Professional tier: Up to 3 sub-queries per analysis
   - Enterprise tier: Unlimited sub-queries for comprehensive investigation
   - Synthesis engine combines multi-step findings into cohesive insights

3. **Tier Configuration** (server/ai/tiers.ts): Enhanced tier system with `agentConfig` settings:
   - Starter/Beginner: SQL validation only, no multi-step (maxSubAgents: 0)
   - Professional/Pro: SQL validation + limited multi-step (maxSubAgents: 3)
   - Enterprise/Elite: Full agent capabilities (maxSubAgents: unlimited)

**Technical Implementation:**
- New `AIAgentOrchestrator` class (server/ai/agentOrchestrator.ts) coordinates validation and multi-step analysis
- Integrated into both single-source and multi-source query execution paths
- Preserves all existing tier features (response length, charts, forecasting, suggestions)
- Dual tier naming support (starter/professional/enterprise AND beginner/pro/elite)

**Benefits:**
- Improved query accuracy through validation
- Enhanced security with SQL safety checks
- Richer insights for higher tiers through multi-step analysis
- Clear tier differentiation in AI capabilities

### Lightspeed OAuth Integration Fix (October 20, 2025)
Fixed Lightspeed Retail OAuth integration to work with production environment:

**Changes Made:**
1. Removed duplicate `lightspeed-oauth.ts` file that was causing redirect URI conflicts
2. Updated OAuth endpoints to use Lightspeed's correct API URLs:
   - Authorization: `https://cloud.lightspeedapp.com/auth/oauth/authorize` (was using old `/oauth/authorize`)
   - Token exchange: `https://cloud.lightspeedapp.com/auth/oauth/token`
   - Token refresh: `https://cloud.lightspeedapp.com/auth/oauth/token`
3. Unified redirect URI to match Lightspeed Developer Portal registration: `https://askeuno.com/api/oauth/callback/lightspeed`
4. Added debug logging to both OAuth handlers for troubleshooting
5. Both frontend OAuth flows maintained:
   - Direct connect: `/connections` → `/api/auth/lightspeed/connect` (oauth-handlers.ts)
   - Store URL setup: `/lightspeed-setup` → `/api/lightspeed/start` (lightspeed.ts)

**Environment Configuration:**
- `LS_CLIENT_ID`: OAuth client ID from Lightspeed Developer Portal
- `LS_CLIENT_SECRET`: OAuth client secret
- `APP_URL`: https://askeuno.com
- Registered redirect URI in Lightspeed: `https://askeuno.com/api/oauth/callback/lightspeed`

**OAuth Flow:**
1. User initiates connection via `/connections` or `/lightspeed-setup`
2. Backend generates PKCE challenge and state for security
3. User redirects to Lightspeed authorization page
4. User approves access on Lightspeed
5. Lightspeed redirects back to `/api/oauth/callback/lightspeed` with authorization code
6. Backend exchanges code for access/refresh tokens with PKCE verifier
7. Tokens encrypted and stored in database with automatic refresh