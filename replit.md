# Euno - Data Platform for Small Businesses

## Overview
Euno is a secure, easy-to-use data platform for small businesses to upload, store, and analyze their data. It provides a secure upload portal, cloud storage integration, ETL processing, and AI-powered insights through a conversational interface. Euno's primary goal is to deliver fast, reliable, and accurate AI-driven business intelligence without complex dashboards. The platform supports both file uploads and live data integrations for real-time sync and advanced analysis, including multi-source database blending with AI-driven common field detection and cross-database insights via natural language queries.

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

### UI/UX Decisions
- **Color Scheme**: Sage green (hsl(142, 25%, 45%))
- **Brand Identity**: Euno glasses icon
- **Design**: Responsive mobile-first, professional appearance (no emojis), interactive elements (e.g., animated hero section, demo animation)

### Technical Implementations
- **Frontend**: React 18 with TypeScript, Tailwind CSS (shadcn/ui), TanStack Query, Wouter, Vite.
- **Backend**: Node.js with Express.js, TypeScript, ES modules.
- **Database**: PostgreSQL with Drizzle ORM.
- **File Processing**: Multer for uploads, XLSX for Excel, CSV parser.
- **AI Integration**: OpenAI API for data insights. AI acts as a senior data analyst, providing immediate, ultra-concise (1-2 sentences) responses by default using an answer-first approach, liberal query mapping, and metaphorical intelligence. It includes an agent-based validation system for SQL and multi-step analysis (tier-dependent), with unified conversation memory focused on business queries.
- **Data Integrations**: 
  - **Replit Connectors**: Google Sheets integration using Replit's managed connector (automatic OAuth, token refresh)
  - **OAuth 2.0 (PKCE)**: QuickBooks Online, Lightspeed Retail/Restaurant, Stripe (manual OAuth implementation)
  - **Direct Database Connections**: PostgreSQL/MySQL (read-only, encrypted connection strings)
  - **File Uploads**: CSV/Excel file uploads with schema detection
- **Core Systems**: Data ingestion pipeline (schema detection, quality checks), AI chat engine (context awareness, response length control), robust authentication/authorization with session management, subscription tier enforcement (query/connection limits, multi-source blending), message deduplication, logging, secure connection management (automatic token refresh).
- **Data Flow**: Uploaded files are validated, processed (parsed, AI schema analysis), and stored in PostgreSQL/AWS S3. Live integrations sync data via OAuth. Users query data via AI chat for analysis, recommendations, and optional visual charts. AI supports multi-source blending by detecting common fields.

### Feature Specifications
- **Frontend Features**: Drag-and-drop file upload, AI chat interface, authentication/authorization with subscription management, data sources overview, settings page, contact form, visual charts (Enterprise tier), secure connections module.
- **Security**: Comprehensive backend security (bcrypt, session management, rate limiting, input validation, Helmet.js, authorization middleware, security logging, sensitive data filtering). Data isolation with unique S3 folders per user, encrypted connection data, and row-level data isolation in PostgreSQL.
- **Database Design**: Tables for Users (auth, subscription, query tracking), Data Sources (metadata, `conversation_data_sources` for blending), Chat System (conversations, messages, AI titles), and Data Rows.

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
- **Replit Connectors**: Google Sheets connector for managed OAuth and API access

## Recent Changes

### November 11, 2025 - AI Chatbot Consistency & Reliability Enhancements (8/10 Complete)
**Goal**: Enhance chatbot consistency, dependability, and reliability through systematic improvements

**Completed Improvements**:
1. **Temperature Standardization (✅ Complete)**
   - Set `temperature=0` across all OpenAI API calls for maximum consistency
   - Applied to: prompts.ts, orchestrator.ts, analytics-agent.ts
   - Result: Deterministic, repeatable responses for identical queries

2. **SQL Validation Enhancement (✅ Complete)**
   - Tier-based query limits: Starter (3 validation attempts), Professional (5), Enterprise (10)
   - Safety checks: Enforces LIMIT on queries, detects expensive JOINs, 30-second max execution
   - Validates read-only operations (prevents INSERT/UPDATE/DELETE)
   - Respects user intent while ensuring query safety

3. **Data Quality Disclosure (✅ Complete)**
   - Row-level completeness analysis detects: NULL values, outliers, bad dates, mixed types
   - Transparent disclosure in AI responses (e.g., "Note: 15 of 100 records have missing data.")
   - **Never auto-fixes** - always discloses and proceeds with analysis on available data
   - Helps users understand data limitations and make informed decisions

4. **Improved Error Messages (✅ Complete)**
   - Actionable, transparent error messages throughout orchestrator
   - Suggests data source updates when quality issues detected
   - Example: "I found 20% missing revenue data. Results may not reflect full picture. Consider updating your data source."

5. **Semantic Chart Analysis (✅ Complete)**
   - Upgraded from keyword-based to semantic analysis using OpenAI
   - AI determines best chart type based on actual data structure and query intent
   - Graceful fallback to heuristics with pre-populated fields for consistent behavior
   - Supports: line, bar, pie, area, scatter charts with proper field detection

6. **Response Validation (✅ Complete)**
   - Prevents hallucinations by verifying AI mentions only numbers from actual query results
   - Regex validation handles: negative numbers, percentages, accounting formats, currency
   - Pattern: `/-?\$?\d+(?:,\d{3})*(?:\.\d+)?%?/g`
   - Flags suspiciously short/generic answers, blocks references to non-existent columns

7. **Smart Query Caching (✅ Complete)**
   - SHA-256 hash-based deduplication with query normalization
   - 1-hour TTL for cached responses
   - Normalization: lowercase, trim, collapse whitespace, strip punctuation
   - Integration preserves conversation flow while improving response speed

8. **User Feedback System (✅ Complete)**
   - Thumbs up/down buttons on each AI response
   - Database storage with `uniqueIndex` on (userId, messageId) preventing duplicates
   - Upsert logic handles concurrent submissions gracefully
   - Weekly feedback report aggregates last 7 days by user with satisfaction rate
   - API routes: POST /api/feedback, GET /api/feedback/stats, GET /api/feedback/weekly-report

**Remaining Tasks**:
9. Comprehensive test suite for common business queries
10. Logging and monitoring for AI quality metrics

**Technical Files Modified**:
- `server/ai/prompts.ts`, `server/ai/orchestrator.ts`, `server/ai/sqlValidator.ts`
- `server/ai/responseValidator.ts`, `server/ai/semanticChartAnalyzer.ts`, `server/ai/queryCache.ts`
- `server/routes/feedback.ts`, `shared/schema.ts`, `server/storage.ts`
- `client/src/components/ChatInterface.tsx`

### October 30, 2025 - Critical Stripe Payment Security Fix
- **Problem**: Users could gain premium tier access before payment confirmation (privilege escalation vulnerability)
- **Solution**: Implemented secure webhook-based tier upgrades with comprehensive payment verification
- **Implementation**:
  - Modified `/api/subscription/get-or-create-subscription` to keep users on current tier with `pending_payment` status
  - Created secure webhook endpoint `/api/subscription/webhook` with:
    * Raw body parsing for Stripe signature verification
    * `stripe.webhooks.constructEvent()` to validate webhook authenticity
    * Comprehensive event handlers (payment_intent.succeeded, payment_failed, subscription.updated/deleted)
  - Tier upgrades now only occur AFTER `payment_intent.succeeded` webhook event
  - Added `getUserByStripeCustomerId()` storage method for webhook user lookups
  - Frontend displays "Payment Processing" status for pending payments with animated loader
- **Security Benefits**: 
  - Prevents free premium access exploit
  - Webhook signature verification blocks forged events
  - Comprehensive logging for payment debugging
  - Proper status transitions (pending → active/failed)

### October 27, 2025 - Google Sheets Connector Integration
- **Problem**: Manual OAuth flow for Google Sheets was failing with "missing client_id" error
- **Solution**: Integrated Replit's Google Sheets connector for automatic OAuth management
- **Implementation**:
  - Created `server/services/googleSheetsConnector.ts` using Replit connector SDK
  - Added `/api/google-sheets/status`, `/api/google-sheets/spreadsheets`, `/api/google-sheets/import` endpoints
  - Frontend now shows spreadsheet selection dialog instead of OAuth redirect
  - User connects Google Sheets via Replit UI, then selects which spreadsheet to import
  - Data automatically stored in `data_sources` and `data_rows` tables
- **Benefits**: No manual OAuth configuration, automatic token refresh, better security