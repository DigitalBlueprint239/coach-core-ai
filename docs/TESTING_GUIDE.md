# 🧪 Coach Core AI Testing Guide

## Overview

This guide provides comprehensive documentation for the testing infrastructure of Coach Core AI. Our testing strategy ensures code quality, reliability, and maintainability through multiple layers of testing.

## 🎯 Testing Strategy

### Test Pyramid
```
    /\
   /  \     E2E Tests (Cypress)
  /____\    - User flows
 /      \   - Integration scenarios
/________\  Unit Tests (Vitest)
           - Components
           - Services
           - Utilities
```

### Coverage Requirements
- **Minimum Coverage**: 70% across all metrics
- **Lines**: 70%
- **Functions**: 70%
- **Branches**: 70%
- **Statements**: 70%

## 🛠️ Testing Tools

### Unit & Integration Tests
- **Framework**: Vitest
- **Testing Library**: React Testing Library
- **Mocking**: Vitest mocks
- **Coverage**: V8 provider

### End-to-End Tests
- **Framework**: Cypress
- **Browser**: Chrome, Firefox, Safari
- **Parallelization**: Yes
- **CI Integration**: GitHub Actions

## 📁 Test Structure

```
src/
├── components/
│   ├── __tests__/
│   │   ├── WaitlistForm.test.tsx
│   │   ├── LoginPage.test.tsx
│   │   └── LandingPage.test.tsx
├── services/
│   ├── __tests__/
│   │   ├── waitlist-service.test.ts
│   │   ├── auth-service.test.ts
│   │   ├── subscription-service.test.ts
│   │   └── firebase-integration.test.ts
└── test/
    ├── setup.ts
    ├── helpers/
    └── rules/

cypress/
├── e2e/
│   ├── authentication.cy.ts
│   ├── subscription.cy.ts
│   ├── access-control.cy.ts
│   ├── waitlist-form.cy.ts
│   └── main-app-flow.cy.ts
├── support/
│   ├── commands.ts
│   └── e2e.ts
├── tasks/
│   ├── database.ts
│   ├── files.ts
│   ├── performance.ts
│   ├── visual.ts
│   ├── network.ts
│   └── ai.ts
└── plugins/
    └── index.ts
```

## 🚀 Running Tests

### Local Development

#### Unit Tests
```bash
# Run all unit tests
npm run test

# Run with coverage
npm run test:unit

# Run in watch mode
npm run test -- --watch

# Run specific test file
npm run test -- WaitlistForm.test.tsx
```

#### Integration Tests
```bash
# Run integration tests
npm run test:integration

# Run with coverage
npm run test:integration -- --coverage
```

#### End-to-End Tests
```bash
# Run E2E tests headlessly
npm run test:e2e

# Open Cypress UI
npm run test:e2e:open

# Run specific test
npm run cypress:run:onboarding

# Run on staging
npm run test:e2e:staging

# Run on production
npm run test:e2e:production
```

### CI/CD Pipeline

Tests run automatically on:
- **Pull Requests**: All tests + coverage enforcement
- **Main Branch**: Full test suite + deployment
- **Scheduled**: Daily E2E test runs

## 📝 Writing Tests

### Unit Test Guidelines

#### Component Tests
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';
import MyComponent from '../MyComponent';

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ChakraProvider theme={modernTheme}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </ChakraProvider>
  );
};

describe('MyComponent', () => {
  it('renders correctly', () => {
    renderWithProviders(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interactions', async () => {
    renderWithProviders(<MyComponent />);
    
    const button = screen.getByRole('button', { name: /click me/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Success!')).toBeInTheDocument();
    });
  });
});
```

#### Service Tests
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { myService } from '../my-service';

// Mock dependencies
vi.mock('../firebase/firebase-config', () => ({
  db: {
    collection: vi.fn()
  }
}));

describe('MyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should perform expected operation', async () => {
    const result = await myService.performOperation('test-data');
    
    expect(result).toEqual({
      success: true,
      data: expect.any(Object)
    });
  });
});
```

### E2E Test Guidelines

#### Basic Test Structure
```typescript
describe('Feature Tests', () => {
  beforeEach(() => {
    cy.task('db:reset');
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it('should complete user flow', () => {
    cy.visit('/feature-page');
    
    // Test interactions
    cy.get('[data-testid="input-field"]').type('test value');
    cy.get('[data-testid="submit-button"]').click();
    
    // Verify results
    cy.url().should('include', '/success-page');
    cy.get('[data-testid="success-message"]').should('be.visible');
  });
});
```

#### Custom Commands
```typescript
// cypress/support/commands.ts
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('[data-testid="email-input"]').type(email);
  cy.get('[data-testid="password-input"]').type(password);
  cy.get('[data-testid="login-button"]').click();
  cy.url().should('include', '/dashboard');
});

// Usage in tests
cy.login('test@example.com', 'password123');
```

## 🎯 Test Categories

### Unit Tests
- **Components**: UI rendering, user interactions, state management
- **Services**: Business logic, API calls, data transformations
- **Utilities**: Helper functions, validation, formatting
- **Hooks**: Custom React hooks, state management

### Integration Tests
- **Firebase Services**: Database operations, authentication
- **API Integration**: External service calls, error handling
- **State Management**: Zustand store interactions
- **Service Integration**: Cross-service communication

### E2E Tests
- **User Flows**: Complete user journeys from start to finish
- **Authentication**: Login, signup, password reset
- **Subscription**: Plan selection, payment, management
- **Access Control**: Feature gating, permission checks
- **Performance**: Load times, memory usage, responsiveness

## 🔧 Test Configuration

### Vitest Configuration
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    }
  }
});
```

### Cypress Configuration
```typescript
// cypress.config.ts
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000
  }
});
```

## 📊 Coverage Reports

### Local Coverage
```bash
# Generate coverage report
npm run test:unit -- --coverage

# View HTML report
open coverage/index.html
```

### CI Coverage
- **Codecov Integration**: Automatic upload and tracking
- **Coverage Thresholds**: Enforced in CI pipeline
- **Coverage Trends**: Historical coverage tracking
- **PR Comments**: Coverage changes in pull requests

## 🐛 Debugging Tests

### Unit Test Debugging
```bash
# Run tests with verbose output
npm run test -- --reporter=verbose

# Run specific test with debug info
npm run test -- --reporter=verbose MyComponent.test.tsx

# Debug in browser
npm run test -- --ui
```

### E2E Test Debugging
```bash
# Open Cypress UI for debugging
npm run test:e2e:open

# Run with video recording
npm run test:e2e -- --record

# Debug specific test
npm run cypress:run:onboarding
```

## 🚨 Common Issues & Solutions

### Test Failures

#### Flaky Tests
- **Cause**: Timing issues, race conditions
- **Solution**: Use `waitFor`, proper async handling, retry logic

#### Mock Issues
- **Cause**: Incorrect mock setup, stale mocks
- **Solution**: Clear mocks in `beforeEach`, verify mock calls

#### Coverage Issues
- **Cause**: Missing test cases, uncovered code paths
- **Solution**: Add tests for edge cases, error scenarios

### Performance Issues

#### Slow Tests
- **Cause**: Heavy operations, network calls
- **Solution**: Mock external dependencies, optimize test data

#### Memory Leaks
- **Cause**: Uncleanup resources, global state
- **Solution**: Proper cleanup in `afterEach`, reset state

## 📈 Best Practices

### Test Writing
1. **Arrange-Act-Assert**: Structure tests clearly
2. **Single Responsibility**: One test per scenario
3. **Descriptive Names**: Clear test descriptions
4. **Independent Tests**: No test dependencies
5. **Fast Execution**: Optimize for speed

### Test Maintenance
1. **Regular Updates**: Keep tests current with code changes
2. **Refactor Tests**: Improve test quality over time
3. **Remove Dead Tests**: Clean up obsolete tests
4. **Monitor Coverage**: Track coverage trends

### CI/CD Integration
1. **Fail Fast**: Stop on first test failure
2. **Parallel Execution**: Run tests concurrently
3. **Artifact Storage**: Save test reports and videos
4. **Notification**: Alert on test failures

## 🔄 Continuous Improvement

### Metrics to Track
- **Test Coverage**: Lines, functions, branches, statements
- **Test Execution Time**: Unit, integration, E2E
- **Test Reliability**: Flaky test rate, failure rate
- **Bug Detection**: Tests catching real issues

### Regular Reviews
- **Weekly**: Review test failures and flaky tests
- **Monthly**: Analyze coverage trends and gaps
- **Quarterly**: Evaluate testing strategy and tools

## 📚 Additional Resources

### Documentation
- [Vitest Documentation](https://vitest.dev/)
- [Cypress Documentation](https://docs.cypress.io/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

### Tools
- [Coverage Reports](https://coverage.readthedocs.io/)
- [Test Data Builders](https://github.com/jackfranklin/test-data-bot)
- [Mock Service Worker](https://mswjs.io/)

### Training
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [E2E Testing Strategies](https://docs.cypress.io/guides/references/best-practices)
- [Test-Driven Development](https://kentcdodds.com/blog/test-driven-development)

---

## 🤝 Contributing

When adding new features or fixing bugs:

1. **Write Tests First**: Follow TDD principles
2. **Maintain Coverage**: Ensure 70%+ coverage
3. **Update Documentation**: Keep this guide current
4. **Review Test Quality**: Ensure tests are maintainable

For questions or issues, please reach out to the development team or create an issue in the repository.






