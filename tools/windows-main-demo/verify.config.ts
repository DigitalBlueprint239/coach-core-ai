import { defineConfig } from '../../e2e/node_modules/@playwright/test';
import base from '../../e2e/playwright.config';
import path from 'node:path';
export default defineConfig({
  ...base,
  testDir: path.resolve(__dirname, '../../e2e/tests'),
  webServer: undefined, // the actual packaged local launcher already serves the app
  grep: /\b(E2E-T01 |CC-P15 |CC-P16 )/,
  outputDir: '/workspace/coach-core-windows-main-evidence/core-results',
  reporter: [['list'], ['json', { outputFile: '/workspace/coach-core-windows-main-evidence/core-results.json' }]],
  use: { ...base.use, trace: 'on', screenshot: 'on' },
  projects: base.projects!.filter(p => ['chromium', 'firefox'].includes(p.name!)),
});
