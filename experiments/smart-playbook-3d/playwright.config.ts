import { defineConfig, devices } from '@playwright/test';

// Uses the locally installed Google Chrome (no browser download). Tests run against
// a production build served by `vite preview` on loopback only.
export default defineConfig({
  testDir: 'tests/browser',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:5179',
    channel: 'chrome',
    trace: 'retain-on-failure',
    launchOptions: { args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'] },
  },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://127.0.0.1:5179',
    reuseExistingServer: true,
    timeout: 240_000,
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'tablet', use: { ...devices['iPad (gen 7) landscape'], channel: 'chrome', defaultBrowserType: 'chromium' } },
    { name: 'phone', use: { ...devices['Pixel 7'], channel: 'chrome' } },
  ],
});
