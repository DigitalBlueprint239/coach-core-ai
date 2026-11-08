import { defineConfig } from 'vitest/config';

// Storage rules tests require BOTH the Cloud Storage and Cloud Firestore emulators.
// Run via npm run test:storage. This config never opens a real Firebase connection.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['rules-tests/storage.rules.test.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 45000,
  },
});
