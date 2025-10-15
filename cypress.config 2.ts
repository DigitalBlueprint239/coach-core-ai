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
      import('./cypress/plugins/index.ts').then((plugin) => {
        plugin.default(on, config);
      });

      // Custom tasks
      on('task', {
        // Database operations
        'db:seed': async () => {
          const { seed } = await import('./cypress/tasks/database');
          return seed();
        },
        'db:clean': async () => {
          const { clean } = await import('./cypress/tasks/database');
          return clean();
        },
        'db:reset': async () => {
          const { reset } = await import('./cypress/tasks/database');
          return reset();
        },

        // File operations
        'file:read': async (filePath: string) => {
          const { read } = await import('./cypress/tasks/files');
          return read(filePath);
        },
        'file:write': async (filePath: string, content: string) => {
          const { write } = await import('./cypress/tasks/files');
          return write(filePath, content);
        },
        'file:delete': async (filePath: string) => {
          const { deleteFile } = await import('./cypress/tasks/files');
          return deleteFile(filePath);
        },

        // Performance monitoring
        'perf:measure': async (metric: string) => {
          const { measure } = await import('./cypress/tasks/performance');
          return measure(metric);
        },
        'perf:monitor': async () => {
          const { monitor } = await import('./cypress/tasks/performance');
          return monitor();
        },

        // Visual regression
        'visual:compare': async (baseline: string, current: string) => {
          const { compare } = await import('./cypress/tasks/visual');
          return compare(baseline, current);
        },
        'visual:update': async (baseline: string) => {
          const { update } = await import('./cypress/tasks/visual');
          return update(baseline);
        },

        // Network simulation
        'network:offline': async () => {
          const { goOffline } = await import('./cypress/tasks/network');
          return goOffline();
        },
        'network:online': async () => {
          const { goOnline } = await import('./cypress/tasks/network');
          return goOnline();
        },
        'network:slow': async (speed: number) => {
          const { setSlow } = await import('./cypress/tasks/network');
          return setSlow(speed);
        },

        // AI service mocking
        'ai:mock': async (response: any) => {
          const { mockResponse } = await import('./cypress/tasks/ai');
          return mockResponse(response);
        },
        'ai:reset': async () => {
          const { resetMocks } = await import('./cypress/tasks/ai');
          return resetMocks();
        },
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
