# Acre - AI-Powered Data Platform

A secure, easy-to-use data platform for small businesses that helps you upload, store, and analyze your data through natural language queries.

## Features

- **Simple File Upload**: Drag & drop CSV, Excel, and JSON files for instant analysis
- **AI Chat Interface**: Ask questions about your data in plain English
- **Secure Authentication**: User registration and login with session management
- **Real-time Insights**: Get instant answers and suggestions from your data
- **Subscription Tiers**: Flexible pricing for businesses of all sizes

## Security Features

- **HTTPS Enforcement**: Automatic HTTP to HTTPS redirection in production
- **Authentication**: Secure user registration and login with bcrypt password hashing
- **Authorization**: Resource ownership verification and role-based access control
- **Rate Limiting**: IP-based and user-based rate limiting to prevent abuse
- **Input Validation**: Comprehensive validation and sanitization of all user inputs
- **File Upload Security**: Strict validation of file types, sizes, and content
- **Session Management**: Secure session storage in PostgreSQL with HTTPS-only cookies
- **Logging**: Comprehensive audit trails with sensitive data filtering
- **Security Headers**: Helmet.js configuration with HSTS, CSP, and other security headers
- **SSL/TLS**: Support for modern TLS protocols with strong cipher suites

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- OpenAI API key (optional, for AI features)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (copy `.env.example` to `.env` and update):
   ```bash
   DATABASE_URL=your_postgresql_connection_string
   SESSION_SECRET=your_session_secret_key
   OPENAI_API_KEY=your_openai_api_key # Optional
   NODE_ENV=production # For production deployments
   ```

4. Run database migrations:
   ```bash
   npm run db:push
   ```

5. For development:
   ```bash
   npm run dev
   ```

6. For production:
   ```bash
   npm run build
   npm start
   ```

The application will be available at:
- Development: `http://localhost:5000`
- Production: `https://yourdomain.com` (HTTPS enforced)

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

### Data Management
- `POST /api/upload` - Upload data files (authenticated)
- `GET /api/data-sources` - Get user's data sources (authenticated)

### Chat Interface
- `POST /api/chat` - Send message to AI assistant (authenticated, rate limited)
- `GET /api/conversations` - Get user's conversations (authenticated)
- `GET /api/conversations/:id/messages` - Get conversation messages (authenticated)

## File Upload Support

- **CSV Files**: Text files with comma-separated values
- **Excel Files**: .xlsx and .xls spreadsheet files
- **JSON Files**: Structured JSON data files
- **Size Limit**: 10MB per file

## Security Best Practices

1. **Strong Passwords**: Minimum 8 characters with mixed case, numbers
2. **Session Security**: 24-hour session timeout, secure cookies
3. **Rate Limiting**: 100 requests per 15 minutes per IP
4. **File Validation**: Strict file type and size validation
5. **Input Sanitization**: All user inputs are validated and sanitized
6. **Audit Logging**: All security events are logged for monitoring

## Development

### Project Structure

```
├── client/          # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Page components
│   │   └── lib/         # Utilities
├── server/          # Node.js backend
│   ├── middleware/      # Authentication, validation, security
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic
│   └── utils/           # Utilities
├── shared/          # Shared types and schemas
└── logs/            # Application logs
```

### Database Schema

- **users**: User accounts with subscription tiers
- **data_sources**: Uploaded files and their metadata
- **chat_conversations**: AI conversation sessions
- **chat_messages**: Individual chat messages
- **data_rows**: Processed data from uploaded files

## Subscription Tiers

- **Starter** ($19/month): 3 data sources, 100 AI queries, 5GB storage
- **Professional** ($49/month): Unlimited data sources, 500 AI queries, 50GB storage
- **Enterprise** ($99/month): Unlimited everything, advanced features, priority support

## Deployment

### Quick Deployment Options

1. **Replit**: Automatic SSL with zero configuration
   - Deploy via Replit Deployments
   - SSL certificates managed automatically
   - Custom domains supported

2. **AWS Amplify**: Managed hosting with automatic SSL
   - Push to GitHub/GitLab
   - Connect to Amplify
   - SSL certificates provisioned automatically

3. **AWS EC2**: Full control with Nginx
   - Use the provided `scripts/setup-ssl.sh` for automated setup
   - SSL certificates via Let's Encrypt
   - Configuration files included

For detailed deployment instructions, see [SSL Setup Guide](docs/SSL_SETUP.md).

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is proprietary software. All rights reserved.