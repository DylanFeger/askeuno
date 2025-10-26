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
- **Data Integrations**: Secure OAuth 2.0 (PKCE) for Google Sheets, QuickBooks Online, Lightspeed Retail/Restaurant, Stripe. Direct read-only database connections (PostgreSQL/MySQL). Encrypted OAuth tokens (AES-256-CBC). CSV/Excel file uploads.
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