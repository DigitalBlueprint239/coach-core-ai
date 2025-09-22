# 🧪 E2E Testing Guide

## Overview

Coach Core AI uses Cypress for comprehensive End-to-End (E2E) testing to ensure the application works correctly across different environments and user scenarios.

## 🎯 Test Coverage

### 1. App Loading Tests (`app-loading.cy.ts`)
- ✅ **Error-free Loading**: App loads without console errors
- ✅ **Landing Page**: Displays correctly with navigation
- ✅ **JavaScript Chunks**: Loads without MIME type errors
- ✅ **CSS Loading**: Stylesheets load and apply correctly
- ✅ **Page Refresh**: Handles refresh without errors
- ✅ **Performance**: Loads within 5-second threshold

### 2. Waitlist Form Tests (`waitlist-form.cy.ts`)
- ✅ **Form Display**: Waitlist form renders correctly
- ✅ **Email Validation**: Validates email format
- ✅ **Firestore Integration**: Stores valid emails in Firestore
- ✅ **Duplicate Handling**: Handles duplicate email submissions
- ✅ **Network Errors**: Graceful error handling
- ✅ **Loading States**: Shows loading during submission
- ✅ **Form Reset**: Clears form after successful submission

### 3. Routing Tests (`routing.cy.ts`)
- ✅ **Dashboard Route**: `/dashboard` loads correctly
- ✅ **Team Route**: `/team` loads correctly
- ✅ **Practice Planner**: `/practice` loads correctly
- ✅ **Navigation**: Handles route changes
- ✅ **Direct URLs**: Direct URL navigation works
- ✅ **Browser Navigation**: Back/forward buttons work
- ✅ **404 Handling**: Graceful handling of non-existent routes
- ✅ **Performance**: Routes load within 3-second threshold

## 🚀 Running Tests

### Local Development

#### Interactive Mode
```bash
# Open Cypress Test Runner
npm run test:e2e:open

# This opens the Cypress GUI where you can:
# - Select tests to run
# - Watch tests run in real-time
# - Debug test failures
# - View screenshots and videos
```

#### Headless Mode
```bash
# Run all E2E tests
npm run test:e2e

# Run tests in headless mode
npm run test:e2e:headless

# Run tests with specific browser
npm run test:e2e:chrome
npm run test:e2e:firefox
npm run test:e2e:edge
```

### Environment-Specific Testing

#### Staging Environment
```bash
# Run tests against staging
npm run test:e2e:staging

# This runs tests against:
# https://coach-core-ai-staging.web.app
```

#### Production Environment
```bash
# Run tests against production
npm run test:e2e:production

# This runs tests against:
# https://coach-core-ai.web.app
```

### Custom Environment
```bash
# Run tests against custom URL
CYPRESS_BASE_URL=https://your-custom-url.com npm run test:e2e
```

## 🔧 Configuration

### Cypress Configuration (`cypress.config.ts`)

```typescript
export default defineConfig({
  e2e: {
    baseUrl: Cypress.env('CYPRESS_BASE_URL') || 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 30000,
    
    env: {
      stagingUrl: 'https://coach-core-ai-staging.web.app',
      productionUrl: 'https://coach-core-ai.web.app',
      maxLoadTime: 3000,
      retryAttempts: 3,
    }
  }
});
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CYPRESS_BASE_URL` | Base URL for tests | `http://localhost:3000` |
| `CYPRESS_API_URL` | API endpoint for tests | `http://localhost:5001/...` |

## 📊 Test Reports

### Screenshots
- **Location**: `cypress/screenshots/`
- **Triggered**: On test failures
- **Format**: PNG files
- **Naming**: `{test-name}.cy.ts -- {test-description} (failed).png`

### Videos
- **Location**: `cypress/videos/`
- **Triggered**: On test failures
- **Format**: MP4 files
- **Naming**: `{test-name}.cy.ts.mp4`

### Test Results
- **Console Output**: Real-time test results
- **Exit Codes**: 0 for success, 1 for failure
- **CI Integration**: Results uploaded as artifacts

## 🔄 CI/CD Integration

### GitHub Actions

#### E2E Tests Workflow (`.github/workflows/e2e-tests.yml`)
- **Triggers**: Push to `main`/`staging`, Pull Requests
- **Environment**: Ubuntu Latest
- **Browsers**: Chrome (default)
- **Artifacts**: Screenshots, videos, reports

#### Deployment Workflow (`.github/workflows/firebase-hosting-deploy.yml`)
- **Pre-deployment**: Runs E2E tests before deployment
- **Environment-specific**: Tests against correct environment
- **Failure handling**: Blocks deployment on test failure

### Test Execution Flow

1. **Code Push** → GitHub Actions triggered
2. **Environment Detection** → Determines staging vs production
3. **Dependency Installation** → Installs Cypress and dependencies
4. **Test Execution** → Runs E2E tests against target environment
5. **Artifact Upload** → Uploads screenshots/videos on failure
6. **Deployment** → Proceeds only if tests pass

## 🛠️ Writing Tests

### Test Structure

```typescript
describe('Feature Tests', () => {
  beforeEach(() => {
    // Setup before each test
    cy.visit('/');
  });

  it('should do something specific', () => {
    // Test implementation
    cy.get('[data-testid="element"]').should('be.visible');
    cy.get('button').click();
    cy.contains('Success').should('be.visible');
  });
});
```

### Best Practices

1. **Use Data Attributes**: `data-testid` for reliable element selection
2. **Wait for Elements**: Use `.should()` instead of `.wait()`
3. **Clear State**: Reset state between tests
4. **Mock External Services**: Use `cy.intercept()` for API calls
5. **Test User Flows**: Focus on complete user journeys
6. **Performance Testing**: Include performance assertions

### Common Commands

```typescript
// Navigation
cy.visit('/dashboard');
cy.go('back');
cy.go('forward');

// Element Interaction
cy.get('[data-testid="button"]').click();
cy.get('input').type('text');
cy.get('select').select('option');

// Assertions
cy.get('element').should('be.visible');
cy.get('element').should('contain', 'text');
cy.get('element').should('have.attr', 'href', '/path');

// API Mocking
cy.intercept('POST', '/api/endpoint', { statusCode: 200, body: {} });
cy.intercept('GET', '/api/data', { fixture: 'data.json' });

// Performance
cy.get('element').should('be.visible').then(() => {
  const loadTime = Date.now() - startTime;
  expect(loadTime).to.be.lessThan(3000);
});
```

## 🐛 Debugging Tests

### Local Debugging

1. **Open Test Runner**: `npm run test:e2e:open`
2. **Select Test**: Click on specific test
3. **Watch Execution**: See test run in real-time
4. **Inspect Elements**: Use browser dev tools
5. **Console Logs**: Check browser console for errors

### CI Debugging

1. **Check Artifacts**: Download screenshots/videos
2. **Review Logs**: Check GitHub Actions logs
3. **Reproduce Locally**: Run same test locally
4. **Environment Issues**: Verify environment configuration

### Common Issues

#### Test Flakiness
- **Cause**: Timing issues, network delays
- **Solution**: Use `.should()` assertions, increase timeouts

#### Element Not Found
- **Cause**: Dynamic content, slow loading
- **Solution**: Wait for elements, use data attributes

#### API Mocking Issues
- **Cause**: Incorrect intercept patterns
- **Solution**: Check network tab, verify intercept patterns

## 📈 Performance Testing

### Load Time Testing
```typescript
it('should load within performance threshold', () => {
  const startTime = Date.now();
  
  cy.visit('/dashboard', {
    onBeforeLoad: () => {
      cy.wrap(startTime).as('startTime');
    }
  });
  
  cy.get('#root').should('be.visible').then(() => {
    const loadTime = Date.now() - startTime;
    expect(loadTime).to.be.lessThan(3000);
  });
});
```

### Memory Usage Testing
```typescript
it('should not exceed memory threshold', () => {
  cy.window().then((win) => {
    const memory = win.performance.memory;
    expect(memory.usedJSHeapSize).to.be.lessThan(100 * 1024 * 1024); // 100MB
  });
});
```

## 🎉 Success!

With comprehensive E2E testing in place, you now have:

- ✅ **Reliable Testing**: Automated testing across environments
- ✅ **CI/CD Integration**: Tests run before every deployment
- ✅ **Performance Monitoring**: Load time and performance validation
- ✅ **Error Detection**: Early detection of issues
- ✅ **User Flow Validation**: Complete user journey testing
- ✅ **Cross-browser Testing**: Support for multiple browsers
- ✅ **Debugging Tools**: Screenshots and videos for failure analysis

Your Coach Core AI application is now thoroughly tested and ready for production! 🚀

