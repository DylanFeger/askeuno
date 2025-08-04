# Euno - Data Platform for Small Businesses

## Overview
Euno is a secure, easy-to-use data platform for small businesses to upload, store, and analyze their data. It offers a secure upload portal, cloud storage integration, ETL processing, and AI-powered insights via a conversational interface. Euno aims to provide a fast, reliable, and accurate experience without complex dashboards, focusing on delivering concise, AI-driven business intelligence. The platform supports both file uploads and live data integrations, enabling real-time data sync and advanced analysis.

## User Preferences
Preferred communication style: Simple, everyday language.
Target audience: Small businesses
Pricing strategy: Subscription-based with 3 tiers (Starter: Free, Professional: $49/mo, Enterprise: $79/mo)
Key principles: 
- Easy experience, not many tools
- Fast, reliable, accurate
- No complex dashboards
- AI responses should be brief unless users ask for more details
- Toggle-able extended thinking for AI responses

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Build Tool**: Vite
- **UI/UX Decisions**: Sage green color scheme (hsl(142, 25%, 45%)), Euno brand identity with glasses icon, responsive mobile-first design, interactive elements for enhanced UX (e.g., animated hero section, demo animation), professional appearance with no emojis.
- **Key Features**: Drag-and-drop file upload, AI chat interface, authentication & authorization with subscription tier management, data sources overview (live connections & uploaded files), comprehensive settings page, contact form, and visual charts for Enterprise tier.

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **File Processing**: Multer for uploads, XLSX for Excel files, CSV parser
- **AI Integration**: OpenAI API for data insights and analysis
- **Core Systems**: Data ingestion pipeline (schema detection, data quality checks), AI chat engine with context awareness and response length control, robust authentication and authorization with session management, subscription tier enforcement (query limits, connection limits), and comprehensive logging.
- **Data Flow**: Files are uploaded, validated, processed (parsed, AI schema analysis), and stored in PostgreSQL/AWS S3. Users query data via the AI chat interface, which provides analysis, recommendations, and optional visual charts.

### Database Design
- **Users**: Authentication, subscription, and query tracking.
- **Data Sources**: Metadata for uploaded files and live connections.
- **Chat System**: Conversations, messages, and AI-generated titles.
- **Data Rows**: Structured storage of processed data.

### Security
- Comprehensive backend security: bcrypt password hashing, session management, rate limiting, input validation, security headers (Helmet.js), authorization middleware, security event logging, and sensitive data filtering.
- Data isolation: Secure file storage with unique folders per user in S3, encrypted connection data, and row-level data isolation in PostgreSQL.

## External Dependencies

- **Database**: Neon PostgreSQL (serverless PostgreSQL)
- **AI Services**: OpenAI API
- **Cloud Storage**: AWS S3 (for user file uploads)
- **Email Service**: AWS SES (Simple Email Service for transactional emails and contact form)
- **Payment Processing**: Stripe (for subscription management)
- **Component Library**: Radix UI primitives
- **Icons**: Lucide React icons
- **Forms**: React Hook Form with Zod validation
- **Charting Library**: Recharts (for visual data representation)