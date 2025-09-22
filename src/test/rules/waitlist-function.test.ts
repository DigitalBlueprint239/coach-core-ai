import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it
} from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { enrichWaitlistMetadataTestHelper } from '../helpers/waitlist-metadata-helper';

const projectId = 'coach-core-ai-rules-tests';
const rules = readFileSync(join(process.cwd(), 'firestore.rules'), 'utf8');

describe('Waitlist metadata enrichment via Cloud Function (simulated)', () => {
  let testEnv: any;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({ projectId });
    await testEnv.loadFirestoreRules({ rules });
  });

  afterAll(async () => {
    await testEnv?.clearFirestore();
    await testEnv?.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it('client write to waitlist succeeds with strict schema and metadata is enriched by function', async () => {
    const anon = testEnv.unauthenticatedContext();
    const db = anon.firestore();
    const id = 'abc123';
    const ref = doc(db, 'waitlist', id);

    // Client write passes strict schema (email + createdAt)
    await assertSucceeds(setDoc(ref, { email: 'z@example.com', createdAt: serverTimestamp() }));

    // Simulate function writing metadata with admin privileges
    await testEnv.withSecurityRulesDisabled(async (ctx: any) => {
      const adminDb = ctx.firestore();
      await enrichWaitlistMetadataTestHelper(adminDb, id, {
        ipAddress: '127.0.0.1',
        userAgent: 'Vitest',
        source: 'landing',
        batchProcessed: false,
      });
    });

    // Client cannot read metadata
    const metaRef = doc(db, 'waitlistMetadata', id);
    await assertFails(getDoc(metaRef));
  });
});

