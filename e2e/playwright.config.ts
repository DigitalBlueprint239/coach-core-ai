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

// Optional targeted re-run filter (CI dispatch input `grep`). Combined with each
// project's own filter (AND), so phone projects still run only their workflows.
const EXTRA = process.env.E2E_GREP ? new RegExp(process.env.E2E_GREP) : undefined;

// B11 (Coach Drew, 2026-10-16): CI runs each browser project as three jobs so the
// ACCEPTANCE conclusion stands alone. Nothing is removed or weakened: the three
// buckets partition the suite by title tag, every test still runs with the same
// assertions, timeouts and retries=0, and local/unset runs keep the whole suite.
//   acceptance           = every test NOT tagged [diagnostic] or [obsolete-fault-model]
//   diagnostic           = tests tagged [diagnostic]
//   obsolete-fault-model = tests tagged [obsolete-fault-model] (original N2-A2)
const DIAG = /\[diagnostic\]/;
const OBSOLETE = /\[obsolete-fault-model\]/;
const BUCKET = process.env.E2E_BUCKET || 'all';
if (!['all', 'acceptance', 'diagnostic', 'obsolete-fault-model'].includes(BUCKET)) throw new Error(`Unknown E2E_BUCKET "${BUCKET}"`);
const BUCKET_GREP = BUCKET === 'diagnostic' ? DIAG : BUCKET === 'obsolete-fault-model' ? OBSOLETE : undefined;
const BUCKET_INVERT = BUCKET === 'acceptance' ? new RegExp(`${DIAG.source}|${OBSOLETE.source}`) : undefined;

// AND-combine the optional filters with a base regex via lookaheads.
const ANDS = [EXTRA, BUCKET_GREP].filter((r): r is RegExp => Boolean(r));
const both = (r: RegExp) => (ANDS.length ? new RegExp(`${ANDS.map((a) => `(?=[\\s\\S]*(?:${a.source}))`).join('')}${r.source}`) : r);
const TOP_GREP = ANDS.length ? both(/[\s\S]*/) : undefined;

export default defineConfig({
  testDir: './tests',
  // The release-proof OFF spec runs ONLY through playwright.release-proof.config.ts against the
  // import-OFF build; excluding it here keeps the B11 suite membership unchanged.
  testIgnore: ['**/release-import-off.spec.ts'],
  outputDir: './test-results',
  fullyParallel: false,
  workers: 1, // one shared emulator; tests reset it in beforeEach
  retries: 0,
  ...(TOP_GREP ? { grep: TOP_GREP } : {}),
  ...(BUCKET_INVERT ? { grepInvert: BUCKET_INVERT } : {}),
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
      { name: 'phone-chromium', grep: both(PHONE_WORKFLOWS),
        use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}) } },
      ...(process.env.E2E_SKIP_FIREFOX ? [] : [{ name: 'phone-firefox', grep: both(PHONE_WORKFLOWS),
        use: { ...devices['Desktop Firefox'], viewport: { width: 390, height: 844 } } }]),
    ]),
  ],
});
