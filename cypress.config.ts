import { defineConfig } from 'cypress';

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

    // TypeScript support
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',

    // Environment variables
    env: {
      // Test data
      testUserEmail: 'test@coachcore.ai',
      testUserPassword: 'TestPassword123!',
      testTeamName: 'Test Team',

      // API endpoints
      apiBaseUrl: Cypress.env('CYPRESS_API_URL') || 'http://localhost:5001/coach-core-ai/us-central1/api',
      
      // Environment URLs
      stagingUrl: 'https://coach-core-ai-staging.web.app',
      productionUrl: 'https://coach-core-ai.web.app',

      // Feature flags
      enableOfflineMode: true,
      enableConflictResolution: true,
      enableAISuggestions: true,

      // Performance thresholds
      maxLoadTime: 3000,
      maxMemoryUsage: 100,
      maxCanvasRenderTime: 500,

      // Visual regression
      visualRegressionType: 'regression',
      visualRegressionThreshold: 0.1,

      // Retry configuration
      retryAttempts: 3,
      retryDelay: 1000,
    },

    // Setup and teardown
    setupNodeEvents(on, config) {
      // Import plugins
      require('./cypress/plugins/index.ts')(on, config);

      // Custom tasks
      on('task', {
        // Database operations
        'db:seed': require('./cypress/tasks/database').seed,
        'db:clean': require('./cypress/tasks/database').clean,
        'db:reset': require('./cypress/tasks/database').reset,

        // File operations
        'file:read': require('./cypress/tasks/files').read,
        'file:write': require('./cypress/tasks/files').write,
        'file:delete': require('./cypress/tasks/files').delete,

        // Performance monitoring
        'perf:measure': require('./cypress/tasks/performance').measure,
        'perf:monitor': require('./cypress/tasks/performance').monitor,

        // Visual regression
        'visual:compare': require('./cypress/tasks/visual').compare,
        'visual:update': require('./cypress/tasks/visual').update,

        // Network simulation
        'network:offline': require('./cypress/tasks/network').goOffline,
        'network:online': require('./cypress/tasks/network').goOnline,
        'network:slow': require('./cypress/tasks/network').setSlow,

        // AI service mocking
        'ai:mock': require('./cypress/tasks/ai').mockResponse,
        'ai:reset': require('./cypress/tasks/ai').resetMocks,
      });

      return config;
    },

    // Retry configuration
    retries: {
      runMode: 2,
      openMode: 0,
    },

    // Parallel execution
    numTestsKeptInMemory: 0,

    // Performance monitoring
    experimentalMemoryManagement: true,

    // Chrome-specific settings
    chromeWebSecurity: false,

    // Custom headers
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  },

  // Component testing (if needed)
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    specPattern: 'cypress/component/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.ts',
  },

  // Visual regression testing
  visualRegression: {
    comparisonType: 'regression',
    threshold: 0.1,
    baselineFolder: 'cypress/baseline',
    screenshotsFolder: 'cypress/screenshots',
    diffFolder: 'cypress/diff',
  },
});
