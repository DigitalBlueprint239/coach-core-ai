import { defineConfig, devices } from '@playwright/test';

// Release-proof behavioural leg (PR #78, fourth revision, 2026-10-18). Separate from
// playwright.config.ts so the B11 suite membership, buckets and settings are untouched.
//
// Two same-commit emulator builds are served side by side:
//   :3100  e2e/.app-build-import-off  (E2E_IMPORT_OFF=1: REACT_APP_ENABLE_LEGACY_IMPORT=false, the
//          release value) -> release-import-off.spec.ts observes the DISABLED behaviour for real.
//   :3000  e2e/.app-build             (opted-in build) -> the ACCEPTED D10-01/D10-02 tests are the
//          ON control: real UI, real arguments, real predicates, real Firestore emulator writes.
// scripts/security/release-import-config.js gate consumes test-results-release-proof/results.json
// and refuses to PASS unless every RP-OFF-* and D10-01/D10-02 execution passed (skips are not passes).
const chromiumPath = process.env.E2E_CHROMIUM_PATH;
// RP_BROWSER=chromium|firefox|both (default both; CI passes the job's own browser). E2E_SKIP_FIREFOX also drops Firefox.
const BROWSER = process.env.RP_BROWSER || 'both';
if (!['chromium', 'firefox', 'both'].includes(BROWSER)) throw new Error(`Unknown RP_BROWSER "${BROWSER}"`);
const withChromium = BROWSER !== 'firefox';
const withFirefox = BROWSER !== 'chromium' && !process.env.E2E_SKIP_FIREFOX;
// Playwright tests grep against the full title path (file › title), so anchor on a boundary, not ^.
const ON_CONTROL = /(?:^|\s)(D10-01|D10-02) /;
const desktop = (dev: Record<string, unknown>) => ({ ...dev, ...(chromiumPath && dev.defaultBrowserType === 'chromium' ? { launchOptions: { executablePath: chromiumPath } } : {}) });

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results-release-proof',
  fullyParallel: false,
  workers: 1, // one shared emulator; tests reset it in beforeEach
  retries: 0,
  forbidOnly: true,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results-release-proof/results.json' }],
  ],
  use: {
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    { command: 'node scripts/serve.mjs .app-build-import-off 3100', url: 'http://localhost:3100', reuseExistingServer: false, timeout: 30_000 },
    { command: 'node scripts/serve.mjs .app-build 3000', url: 'http://localhost:3000', reuseExistingServer: false, timeout: 30_000 },
  ],
  projects: [
    ...(withChromium ? [
      { name: 'import-off-chromium', testMatch: /release-import-off\.spec\.ts/, use: { ...desktop(devices['Desktop Chrome']), baseURL: 'http://localhost:3100' } },
      { name: 'on-control-chromium', testMatch: /legacy-import\.spec\.ts/, grep: ON_CONTROL, use: { ...desktop(devices['Desktop Chrome']), baseURL: 'http://localhost:3000' } },
    ] : []),
    ...(withFirefox ? [
      { name: 'import-off-firefox', testMatch: /release-import-off\.spec\.ts/, use: { ...devices['Desktop Firefox'], baseURL: 'http://localhost:3100' } },
      { name: 'on-control-firefox', testMatch: /legacy-import\.spec\.ts/, grep: ON_CONTROL, use: { ...devices['Desktop Firefox'], baseURL: 'http://localhost:3000' } },
    ] : []),
  ],
});
