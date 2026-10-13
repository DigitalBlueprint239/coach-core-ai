// Shared helpers for the security-rules emulator tests.
// These tests only ever talk to the local emulator. The project ID must start
// with "demo-" so the emulator refuses to reach any real Firebase project.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

export const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-coach-core-beta';
if (!PROJECT_ID.startsWith('demo-')) {
  throw new Error(`Refusing to run rules tests against non-demo project "${PROJECT_ID}"`);
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export async function createEnv({ firestore = true, storage = false } = {}) {
  const cfg = { projectId: PROJECT_ID };
  if (firestore) cfg.firestore = { rules: readFileSync(path.join(repoRoot, 'firestore.rules'), 'utf8') };
  if (storage) cfg.storage = { rules: readFileSync(path.join(repoRoot, 'storage.rules'), 'utf8') };
  return initializeTestEnvironment(cfg);
}

// Token shapes. `firebase.sign_in_provider` and `email_verified` are set by
// Firebase Auth in production; `beta` is a custom claim set by the admin script.
export const tokens = {
  beta: { email: 'coach@example.test', email_verified: true, beta: true, firebase: { sign_in_provider: 'google.com', identities: {} } },
  noBeta: { email: 'coach@example.test', email_verified: true, firebase: { sign_in_provider: 'google.com', identities: {} } },
  unverified: { email: 'coach@example.test', email_verified: false, beta: true, firebase: { sign_in_provider: 'password', identities: {} } },
  // Even if an anonymous token somehow carried beta claims, it must be denied.
  anonymousWithClaims: { email_verified: true, beta: true, firebase: { sign_in_provider: 'anonymous', identities: {} } },
};

export const ALICE = 'alice-uid';
export const BOB = 'bob-uid';
export const TEAM_A = 'team-alice';
export const TEAM_B = 'team-bob';
