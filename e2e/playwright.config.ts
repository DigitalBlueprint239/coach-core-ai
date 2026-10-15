import { defineConfig, devices } from '@playwright/test';

// Real browsers against the Firebase Emulator Suite. Start through
// `npm --prefix e2e test`, which wraps this in `firebase emulators:exec`.
// Authentication here is EMULATOR authentication: the emulator issues tokens
// for any email without contacting Google or sending email. It proves the
// app's handling of real Firebase SDK sessions, not real Google/email-link
// delivery, which needs an approved staging project (Day 6).
const chromiumPath = process.env.E2E_CHROMIUM_PATH; // sandbox only; CI uses Playwright's own build

// UI workflow tests (no SDK-in-browser shortcuts) re-run at phone width.
const PHONE_WORKFLOWS = /(?:^|\s)(E2E-A07|E2E-A10|CC-P10|CC-P11|CC-P12|CC-P14|CC-P15|CC-P16|CC-P17|CC-L0|CC-L1|E2E-T01|E2E-T02|D10-01|D10-06e) /;

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
    // Phone-WIDTH workflow coverage for the responsive #67 shell (bottom navigation).
    // Desktop engines at a 390x844 viewport: NOT device emulation, NOT physical phones.
    ...(process.env.E2E_SKIP_PHONE ? [] : [
      { name: 'phone-chromium', grep: PHONE_WORKFLOWS,
        use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}) } },
      ...(process.env.E2E_SKIP_FIREFOX ? [] : [{ name: 'phone-firefox', grep: PHONE_WORKFLOWS,
        use: { ...devices['Desktop Firefox'], viewport: { width: 390, height: 844 } } }]),
    ]),
  ],
});
