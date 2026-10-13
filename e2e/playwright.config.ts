import { defineConfig, devices } from '@playwright/test';

// Real browsers against the Firebase Emulator Suite. Start through
// `npm --prefix e2e test`, which wraps this in `firebase emulators:exec`.
// Authentication here is EMULATOR authentication: the emulator issues tokens
// for any email without contacting Google or sending email. It proves the
// app's handling of real Firebase SDK sessions, not real Google/email-link
// delivery, which needs an approved staging project (Day 6).
const chromiumPath = process.env.E2E_CHROMIUM_PATH; // sandbox only; CI uses Playwright's own build

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: false,
  workers: 1, // one shared emulator; tests reset it in beforeEach
  retries: 0,
  forbidOnly: true,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['./reporters/annotate.mjs'],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    serviceWorkers: 'block', // the production service worker would cache across tests
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node scripts/serve.mjs .app-build 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}) },
    },
    ...(process.env.E2E_SKIP_FIREFOX ? [] : [{ name: 'firefox', use: { ...devices['Desktop Firefox'] } }]),
  ],
});
