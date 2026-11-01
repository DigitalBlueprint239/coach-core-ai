import { defineConfig } from 'vitest/config';

// Firestore security rules tests. They talk to the Firestore emulator, so run them through
// `npm run test:rules` (firebase emulators:exec), not `npm test`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['rules-tests/**/*.test.ts'],
    // One emulator, one database: run files one at a time so clearFirestore() in one file can't race another.
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 30000,
  },
});
