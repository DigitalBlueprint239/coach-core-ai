# 🧪 Cypress E2E Test Suite for Coach Core AI

## Overview

This document describes the comprehensive End-to-End (E2E) test suite for the Coach Core AI application using Cypress with TypeScript. The test suite covers critical user flows, conflict resolution, offline functionality, and performance testing.

## 🎯 Test Coverage

### 1. **Coach Onboarding Flow**
- ✅ **Sign up → Email verification**
- ✅ **Team creation → Player invites**
- ✅ **First play design → AI enhancement**
- ✅ **Validation and error handling**
- ✅ **Retry logic with network failures**

### 2. **Play Creation with Conflict Resolution**
- ✅ **Multi-user concurrent editing**
- ✅ **Conflict detection and resolution**
- ✅ **Offline editing and sync**
- ✅ **Canvas position conflicts**
- ✅ **Route conflicts in plays**
- ✅ **Conflict resolution analytics**

### 3. **Practice Planning Flow**
- ✅ **Create practice → Add drills**
- ✅ **AI suggestions → Schedule**
- ✅ **Player notifications → Attendance**
- ✅ **Complex practice scenarios**

### 4. **Offline/Online Sync**
- ✅ **Go offline → Make changes**
- ✅ **Queue operations → Go online**
- ✅ **Sync with conflict resolution**
- ✅ **Background sync testing**

### 5. **Performance Testing**
- ✅ **Load 100+ plays**
- ✅ **Canvas performance**
- ✅ **Memory usage monitoring**
- ✅ **Load time measurements**

## 🏗️ Architecture

### Test Structure
```
cypress/
├── e2e/
│   ├── coach-onboarding.cy.ts
│   ├── play-creation-conflict.cy.ts
│   ├── practice-planning.cy.ts
│   ├── offline-sync.cy.ts
│   └── performance.cy.ts
├── factories/
│   ├── UserFactory.ts
│   ├── TeamFactory.ts
│   ├── PlayFactory.ts
│   └── PracticeFactory.ts
├── support/
│   ├── e2e.ts
│   └── commands.ts
├── tasks/
│   ├── database.ts
│   ├── files.ts
│   ├── performance.ts
│   ├── visual.ts
│   ├── network.ts
│   └── ai.ts
├── plugins/
│   └── index.ts
├── baseline/
├── screenshots/
└── videos/
```

### Configuration Files
- **`cypress.config.ts`**: Main Cypress configuration
- **`package.json`**: Test scripts and dependencies
- **`.github/workflows/cypress-e2e.yml`**: CI/CD pipeline

## 🔧 Setup and Installation

### Prerequisites
```bash
# Install Cypress and dependencies
npm install cypress @cypress/visual-regression cypress-multi-reporters mocha-junit-reporter mochawesome mochawesome-merge mochawesome-report-generator start-server-and-test --save-dev

# Install Firebase tools for emulators
npm install -g firebase-tools
```

### Environment Setup
```bash
# Set up environment variables
export CYPRESS_baseUrl=http://localhost:3000
export CYPRESS_apiBaseUrl=http://localhost:5001/coach-core-ai/us-central1/api
export FIRESTORE_EMULATOR_HOST=localhost:8080
export FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
```

### Database Setup
```bash
# Start Firebase emulators
npm run firebase:emulators:test

# Seed test database
npm run db:seed:test

# Run database migrations
npm run db:migrate:test
```

## 🚀 Running Tests

### Local Development
```bash
# Open Cypress Test Runner
npm run cypress:open

# Run all tests headlessly
npm run cypress:run:headless

# Run specific test suites
npm run cypress:run:onboarding
npm run cypress:run:conflicts
npm run cypress:run:practice
npm run cypress:run:offline
npm run cypress:run:performance

# Run with CI setup
npm run test:e2e:ci
```

### CI/CD Pipeline
```bash
# Run with recording and parallel execution
npm run cypress:run:parallel

# Run with specific build ID
CYPRESS_CI_BUILD_ID=$GITHUB_RUN_ID npm run cypress:run:record
```

## 📊 Test Data Factories

### UserFactory
```typescript
import { UserFactory } from '../factories/UserFactory';

// Create test users
const coach = UserFactory.createCoach({
  email: 'test@coachcore.ai',
  firstName: 'John',
  lastName: 'Coach'
});

const player = UserFactory.createPlayer({
  email: 'player@coachcore.ai',
  role: 'player'
});

// Create multiple users
const users = UserFactory.createMultiple(10, { role: 'coach' });
```

### TeamFactory
```typescript
import { TeamFactory } from '../factories/TeamFactory';

// Create test teams
const footballTeam = TeamFactory.createFootball({
  name: 'Championship Team',
  level: 'high-school'
});

const basketballTeam = TeamFactory.createBasketball({
  name: 'Basketball Team',
  level: 'college'
});

// Create team with players
const teamWithPlayers = TeamFactory.createWithPlayers(15, {
  name: 'Full Team',
  sport: 'football'
});
```

### PlayFactory
```typescript
import { PlayFactory } from '../factories/PlayFactory';

// Create test plays
const offensivePlay = PlayFactory.createOffensive({
  name: 'QB Sneak',
  description: 'Simple quarterback sneak'
});

const defensivePlay = PlayFactory.createDefensive({
  name: 'Blitz Package',
  description: 'Aggressive defensive blitz'
});

const complexPlay = PlayFactory.createComplex({
  name: 'Complex Play',
  description: 'Advanced play with multiple routes'
});

// Create play with conflict
const conflictPlay = PlayFactory.createWithConflict({
  name: 'Conflict Test Play',
  version: 2
});
```

### PracticeFactory
```typescript
import { PracticeFactory } from '../factories/PracticeFactory';

// Create test practices
const basicPractice = PracticeFactory.create({
  name: 'Basic Practice',
  duration: 90
});

const complexPractice = PracticeFactory.createComplex({
  name: 'Complex Practice',
  duration: 120
});

// Create practice with drills
const practiceWithDrills = PracticeFactory.createWithDrills(5, {
  name: 'Drill Practice',
  duration: 100
});

// Create practice with attendance
const practiceWithAttendance = PracticeFactory.createWithAttendance(20, {
  name: 'Full Attendance Practice',
  status: 'in-progress'
});
```

## 🎭 Custom Commands

### Authentication Commands
```typescript
// Login with retry logic
cy.login('test@coachcore.ai', 'TestPassword123!');

// Signup with validation
cy.signup('newuser@coachcore.ai', 'Password123!', 'New Team');

// Logout
cy.logout();
```

### Team Management Commands
```typescript
// Create team and get ID
const teamId = cy.createTeam('Test Team');

// Invite players
cy.invitePlayer('player@coachcore.ai', 'QB');

// Join team
cy.joinTeam(teamId);
```

### Play Management Commands
```typescript
// Create play with data
const playData = {
  name: 'Test Play',
  description: 'Test description',
  formation: '4-3-4'
};
const playId = cy.createPlay(playData);

// Edit play with updates
cy.editPlay(playId, {
  name: 'Updated Play',
  description: 'Updated description'
});

// Delete play
cy.deletePlay(playId);

// Duplicate play
const newPlayId = cy.duplicatePlay(playId);
```

### AI Service Commands
```typescript
// Mock AI suggestions
cy.mockAISuggestion({
  suggestion: 'Consider adding a fake handoff',
  confidence: 0.85
});

// Mock AI analysis
cy.mockAIAnalysis({
  analysis: 'This play has good balance',
  confidence: 0.9
});

// Wait for AI response
cy.waitForAIResponse();
```

### Offline/Online Commands
```typescript
// Go offline
cy.goOffline();
cy.get('[data-testid="offline-indicator"]').should('be.visible');

// Go online
cy.goOnline();
cy.get('[data-testid="online-indicator"]').should('be.visible');

// Wait for sync
cy.waitForSync();

// Check offline queue
const queueCount = cy.checkOfflineQueue();
```

### Conflict Resolution Commands
```typescript
// Simulate conflict
cy.simulateConflict(playId);

// Resolve conflict with strategy
cy.resolveConflict('SERVER_WINS');
cy.resolveConflict('CLIENT_WINS');
cy.resolveConflict('MERGE');

// Check conflict status
const status = cy.checkConflictStatus();
```

### Performance Commands
```typescript
// Measure load time
const loadTime = cy.measureLoadTime();

// Measure memory usage
const memoryUsage = cy.measureMemoryUsage();

// Measure canvas performance
const canvasPerf = cy.measureCanvasPerformance();
```

### Visual Regression Commands
```typescript
// Compare screenshot
cy.compareScreenshot('dashboard-view');

// Update baseline
cy.updateBaseline('dashboard-view');
```

## 🔄 Retry Pattern Integration

### Consistent Retry Utility
```typescript
// Use retry pattern in tests
cy.withRetry(() => {
  cy.get('[data-testid="save-button"]').click();
  cy.get('[data-testid="success-message"]').should('be.visible');
}, { maxAttempts: 3, delay: 1000 });

// Network-specific retry
cy.withRetry(() => {
  cy.request('POST', '/api/plays', playData);
}, { maxAttempts: 3, delay: 2000 });
```

### Error Handling with Retry
```typescript
// Handle network failures
cy.intercept('POST', '/api/plays', { statusCode: 500 }).as('playCreateFailure');
cy.get('[data-testid="create-play-button"]').click();
cy.wait('@playCreateFailure');

// Retry with success
cy.intercept('POST', '/api/plays', { statusCode: 200 }).as('playCreateSuccess');
cy.get('[data-testid="retry-button"]').click();
cy.wait('@playCreateSuccess');
```

## 📈 Performance Testing

### Load Testing
```typescript
// Test with 100+ plays
describe('Performance - Load Testing', () => {
  it('should handle 100+ plays efficiently', () => {
    // Create 100 plays
    for (let i = 0; i < 100; i++) {
      const play = PlayFactory.create({
        name: `Play ${i}`,
        positions: PlayFactory.generateComplexPositions()
      });
      cy.createPlay(play);
    }

    // Measure performance
    cy.visit('/plays');
    const loadTime = cy.measureLoadTime();
    expect(loadTime).to.be.lessThan(3000);

    const memoryUsage = cy.measureMemoryUsage();
    expect(memoryUsage).to.be.lessThan(100);
  });
});
```

### Canvas Performance
```typescript
// Test canvas rendering performance
describe('Performance - Canvas', () => {
  it('should render complex plays efficiently', () => {
    const complexPlay = PlayFactory.createComplex();
    cy.createPlay(complexPlay);
    cy.visit(`/plays/${playId}/edit`);

    const canvasPerf = cy.measureCanvasPerformance();
    expect(canvasPerf.renderTime).to.be.lessThan(500);
    expect(canvasPerf.canvasSize).to.be.greaterThan(0);
  });
});
```

### Memory Monitoring
```typescript
// Monitor memory usage
describe('Performance - Memory', () => {
  it('should maintain stable memory usage', () => {
    const initialMemory = cy.measureMemoryUsage();
    
    // Perform operations
    for (let i = 0; i < 10; i++) {
      cy.createPlay(PlayFactory.create());
    }
    
    const finalMemory = cy.measureMemoryUsage();
    const memoryIncrease = finalMemory - initialMemory;
    
    expect(memoryIncrease).to.be.lessThan(50); // MB
  });
});
```

## 🔧 CI/CD Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/cypress-e2e.yml
name: Cypress E2E Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  schedule:
    - cron: '0 2 * * *'

jobs:
  setup:
    runs-on: ubuntu-latest
    # Setup and build application
    
  e2e-onboarding:
    runs-on: ubuntu-latest
    needs: [setup, setup-database]
    strategy:
      matrix:
        containers: [1, 2, 3, 4]
    # Run onboarding tests in parallel
    
  e2e-play-conflicts:
    runs-on: ubuntu-latest
    needs: [setup, setup-database]
    strategy:
      matrix:
        containers: [1, 2, 3, 4]
    # Run conflict resolution tests in parallel
    
  test-reports:
    runs-on: ubuntu-latest
    needs: [e2e-onboarding, e2e-play-conflicts, ...]
    # Generate and upload test reports
    
  notify-failure:
    runs-on: ubuntu-latest
    needs: [e2e-onboarding, e2e-play-conflicts, ...]
    if: failure()
    # Send failure notifications
```

### Parallel Execution
```bash
# Run tests in parallel with recording
npm run cypress:run:parallel

# Run specific test groups in parallel
npm run cypress:run:onboarding --parallel --record
npm run cypress:run:conflicts --parallel --record
```

### Test Reports
```bash
# Generate test reports
npm run test:reports

# Generate analytics
npm run test:analytics
```

## 📊 Monitoring and Analytics

### Test Metrics
- **Total Tests**: 50+ E2E tests
- **Test Categories**: 5 main categories
- **Success Rate**: Target >95%
- **Performance Thresholds**: Configurable
- **Retry Success Rate**: Track retry effectiveness

### Performance Metrics
- **Load Time**: <3 seconds
- **Memory Usage**: <100MB
- **Canvas Render Time**: <500ms
- **API Response Time**: <2 seconds

### Conflict Resolution Metrics
- **Conflict Detection Rate**: 100%
- **Resolution Success Rate**: >98%
- **Average Resolution Time**: <5 seconds
- **User Choice Rate**: Track user preferences

## 🛠️ Troubleshooting

### Common Issues

#### 1. **Test Flakiness**
```typescript
// Add retry logic
cy.get('[data-testid="element"]', { timeout: 10000 }).should('be.visible');

// Wait for network idle
cy.waitForNetworkIdle();

// Use withRetry pattern
cy.withRetry(() => {
  cy.get('[data-testid="save-button"]').click();
}, { maxAttempts: 3, delay: 1000 });
```

#### 2. **Database State Issues**
```bash
# Clean test database
npm run db:clean:test

# Reset database state
npm run db:reset:test

# Seed fresh data
npm run db:seed:test
```

#### 3. **Network Issues**
```typescript
// Mock network responses
cy.intercept('GET', '/api/plays', { fixture: 'plays.json' }).as('getPlays');

// Handle offline scenarios
cy.goOffline();
cy.get('[data-testid="offline-indicator"]').should('be.visible');
```

#### 4. **Performance Issues**
```typescript
// Monitor performance
const loadTime = cy.measureLoadTime();
if (loadTime > 3000) {
  cy.log('Performance warning: Load time exceeded threshold');
}

// Check memory usage
const memoryUsage = cy.measureMemoryUsage();
if (memoryUsage > 100) {
  cy.log('Performance warning: Memory usage exceeded threshold');
}
```

### Debug Commands
```bash
# Run tests with debug output
DEBUG=cypress:* npm run cypress:run

# Open Cypress in debug mode
npm run cypress:open -- --debug

# Run specific test with verbose output
npx cypress run --spec "cypress/e2e/coach-onboarding.cy.ts" --headed
```

## 🎯 Best Practices

### 1. **Test Organization**
- Group related tests in describe blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### 2. **Data Management**
- Use factories for test data
- Clean up after each test
- Use unique identifiers

### 3. **Performance Testing**
- Set realistic thresholds
- Monitor trends over time
- Test on different devices

### 4. **Error Handling**
- Test both success and failure scenarios
- Use retry patterns for flaky operations
- Provide meaningful error messages

### 5. **CI/CD Integration**
- Run tests in parallel
- Generate comprehensive reports
- Set up failure notifications

## 📚 Additional Resources

### Documentation
- [Cypress Documentation](https://docs.cypress.io/)
- [Cypress Best Practices](https://docs.cypress.io/guides/references/best-practices)
- [Visual Regression Testing](https://docs.cypress.io/guides/tooling/visual-testing)

### Tools and Extensions
- [Cypress Dashboard](https://dashboard.cypress.io/)
- [Cypress Visual Regression](https://github.com/cypress-io/cypress-visual-regression)
- [Cypress Multi Reporters](https://github.com/you54f/cypress-multi-reporters)

### Community
- [Cypress Community](https://community.cypress.io/)
- [Cypress Discord](https://discord.gg/cypress)
- [Cypress GitHub](https://github.com/cypress-io/cypress)

---

This comprehensive E2E test suite ensures the Coach Core AI application is thoroughly tested across all critical user flows, with robust error handling, performance monitoring, and conflict resolution testing. The suite integrates seamlessly with CI/CD pipelines and provides detailed analytics for continuous improvement. 