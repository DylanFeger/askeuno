# Testing Documentation

## Overview

This test suite provides comprehensive coverage for the Ask Euno MVP application, focusing on critical paths including authentication, data connections, AI chat, and file uploads.

## Test Framework

- **Framework**: Vitest
- **Coverage Tool**: @vitest/coverage-v8
- **Test Environment**: Node.js
- **Mocking**: Vitest built-in mocking

## Test Structure

```
tests/
├── setup.ts                 # Global test setup
├── utils/
│   ├── test-helpers.ts      # Helper functions for creating mocks
│   └── mocks.ts             # Shared mock objects
├── auth.test.ts             # Authentication tests
├── middleware/
│   └── auth.test.ts         # Authentication middleware tests
├── data-connections.test.ts # Data source connection tests
├── chat.test.ts             # AI chat endpoint tests
├── file-upload.test.ts      # File upload tests
└── integration.test.ts     # End-to-end integration tests
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with UI
```bash
npm run test:ui
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run tests in CI mode
```bash
npm run test:ci
```

## Test Coverage Goals

- **Target Coverage**: >60% for core features
- **Coverage Thresholds**:
  - Lines: 60%
  - Functions: 60%
  - Branches: 60%
  - Statements: 60%

## Test Categories

### 1. Authentication Tests (`auth.test.ts`)

Tests for user registration, login, logout, and session management:

- ✅ User registration with validation
- ✅ Duplicate username/email detection
- ✅ Password validation
- ✅ Login with email or username
- ✅ Invalid credentials handling
- ✅ Session creation and management
- ✅ Logout functionality
- ✅ Current user endpoint

### 2. Authentication Middleware Tests (`middleware/auth.test.ts`)

Tests for authentication and authorization middleware:

- ✅ `requireAuth` - Authentication requirement
- ✅ `requireSubscriptionTier` - Tier-based access control
- ✅ `requirePaidSubscription` - Paid subscription requirement
- ✅ `requireMainUser` - Main user vs chat-only user access
- ✅ Error handling for invalid sessions

### 3. Data Connection Tests (`data-connections.test.ts`)

Tests for data source connections:

- ✅ Lightspeed connection (mock)
- ✅ Google Sheets connection (mock)
- ✅ Database connections (PostgreSQL, MySQL, MongoDB)
- ✅ Connection error handling
- ✅ Connection test functionality
- ✅ Unsupported data source type handling

### 4. AI Chat Tests (`chat.test.ts`)

Tests for AI chat functionality:

- ✅ Chat query processing
- ✅ Rate limiting enforcement
- ✅ Tier-based row limits
- ✅ Data source validation
- ✅ SQL execution error handling
- ✅ Duplicate message detection
- ✅ Conversation management
- ✅ Export functionality (tier-based)

### 5. File Upload Tests (`file-upload.test.ts`)

Tests for file upload functionality:

- ✅ CSV file upload and processing
- ✅ File validation
- ✅ Data transformation
- ✅ Tier-based data source limits
- ✅ File download URL generation
- ✅ File listing
- ✅ File deletion
- ✅ Error handling (processing, validation, insertion)

### 6. Integration Tests (`integration.test.ts`)

End-to-end user journey tests:

- ✅ Complete registration → upload → query flow
- ✅ Rate limit exceeded scenarios
- ✅ Data source limit reached scenarios
- ✅ Invalid authentication scenarios
- ✅ Tier enforcement across features

## Mocking Strategy

The test suite uses comprehensive mocking to isolate units under test:

- **Storage Service**: Mocked database operations
- **External Services**: OpenAI, S3, AWS SES, etc.
- **Database**: Mocked Drizzle ORM queries
- **Rate Limiting**: Mocked rate limit checks
- **File Processing**: Mocked file processing services

## Test Database Configuration

Tests use a separate test database configured via environment variables:

```env
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/test_db
NODE_ENV=test
```

## CI/CD Integration

Tests run automatically on:
- Push to main/develop branches
- Pull requests to main/develop branches
- All feature branches matching `cursor/**`

The CI pipeline:
1. Sets up PostgreSQL service
2. Installs dependencies
3. Runs tests with coverage
4. Uploads coverage reports to Codecov

## Writing New Tests

### Test File Structure

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockRequest, createMockResponse } from './utils/test-helpers';
import { mockStorage } from './utils/mocks';

describe('Feature Name', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    vi.clearAllMocks();
  });

  it('should do something', async () => {
    // Arrange
    req.body = { /* test data */ };
    mockStorage.someMethod.mockResolvedValue(/* mock response */);

    // Act
    await handler(req as Request, res as Response, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
  });
});
```

### Best Practices

1. **Isolation**: Each test should be independent
2. **Clear Naming**: Use descriptive test names
3. **Arrange-Act-Assert**: Follow AAA pattern
4. **Mock External Dependencies**: Don't make real API calls
5. **Test Edge Cases**: Include error scenarios
6. **Coverage**: Aim for >60% coverage on critical paths

## Troubleshooting

### Tests failing with database errors
- Ensure test database is running
- Check `TEST_DATABASE_URL` environment variable
- Verify database migrations are applied

### Mock not working
- Ensure mocks are reset in `beforeEach`
- Check that mocks are imported correctly
- Verify mock implementation matches actual service

### Coverage not generating
- Run `npm run test:coverage`
- Check `vitest.config.ts` coverage configuration
- Verify files aren't excluded in coverage config

## Future Improvements

- [ ] Add E2E tests with Playwright
- [ ] Add performance/load tests
- [ ] Add visual regression tests
- [ ] Increase coverage to 80%+
- [ ] Add mutation testing
- [ ] Add contract testing for API endpoints
