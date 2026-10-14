import { defineConfig } from '../../../e2e/node_modules/@playwright/test/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import baseline from '../../../e2e/playwright.config';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export default defineConfig({
  ...baseline,
  testDir: root,
  testMatch: ['e2e/tests/legacy-import.spec.ts', 'tests/coaching-ui/legacy-repairs/legacy-migration.spec.ts'],
  outputDir: path.join(root, '../l1-r1b-browser-results'),
  reporter: [['list'], ['json', { outputFile: path.join(root, '../l1-r1b-browser-results/results.json') }]],
  webServer: {
    command: 'node scripts/serve.mjs .app-build 3000', cwd: path.join(root, 'e2e'),
    url: 'http://localhost:3000', reuseExistingServer: false, timeout: 30_000,
  },
});

