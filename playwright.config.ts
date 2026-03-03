import { defineConfig } from '@playwright/test';

const PORT = process.env.PLAYWRIGHT_PORT || '5173';
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: {
    timeout: 5_000,
  },
  retries: isCI ? 1 : 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${PORT}`,
    headless: isCI,
    trace: isCI ? 'on-first-retry' : 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        headless: isCI,
        ...(isCI ? {} : { channel: 'chrome' }),
      },
    },
  ],
  webServer: {
    command: `YOUTUBE_API_KEY=test-key VITE_E2E_BYPASS_AUTH=true npm run dev:recruiting -- --host 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
