import {defineConfig, devices} from '../../e2e/node_modules/@playwright/test';

// Focused implementer evidence, NOT Claude's independent acceptance suite.
// Emulators must be isolated demo-coach-core-n2, on the existing app ports.
export default defineConfig({
  testDir: '.', testMatch: 'team-creation.spec.ts', workers: 1, fullyParallel: false,
  retries: 0, forbidOnly: true, timeout: 60_000, expect: {timeout: 10_000},
  outputDir: process.env.N2_OUTPUT || 'test-results',
  reporter: [['list'], ['json', {outputFile: `${process.env.N2_OUTPUT || 'test-results'}/results.json`}]],
  use: {baseURL: 'http://localhost:3000', serviceWorkers: 'block', trace: 'retain-on-failure', screenshot: 'only-on-failure'},
  webServer: {command: 'node ../../e2e/scripts/serve.mjs ../../e2e/.app-build 3000', url: 'http://localhost:3000', reuseExistingServer: false},
  projects: [{name: 'chromium', use: {...devices['Desktop Chrome']}}, {name: 'firefox', use: {...devices['Desktop Firefox']}}],
});
