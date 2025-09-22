// Example Emulator tests using @firebase/rules-unit-testing
// Run with: npx vitest -c vitest.config.ts --run src/test/rules/firestore.rules.test.ts

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
  setDoc,
  updateDoc
} from 'firebase/firestore';

const projectId = 'coach-core-ai-rules-tests';
const rules = readFileSync(join(process.cwd(), 'firestore.rules'), 'utf8');

describe('Firestore Security Rules (Coach Core AI)', () => {
  let testEnv: any;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({ projectId });
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async (context: any) => {
      // no-op
    });
    await testEnv.loadFirestoreRules({ rules });
  });

  afterAll(async () => {
    await testEnv?.clearFirestore();
    await testEnv?.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it('waitlist: allows create with only email + createdAt and rejects reads/extra fields', async () => {
    const anon = testEnv.unauthenticatedContext();
    const db = anon.firestore();
    const ref = doc(db, 'waitlist/test1');

    // Succeeds with strict fields
    await assertSucceeds(setDoc(ref, { email: 'user@example.com', createdAt: serverTimestamp() }));

    // Fails on read
    await assertFails(getDoc(ref));

    // Fails with extra fields
    const ref2 = doc(db, 'waitlist/test2');
    await assertFails(setDoc(ref2, { email: 'x@y.z', createdAt: serverTimestamp(), source: 'lp' }));
  });

  it('subscriptions: only owner can create/update; strict fields and server timestamps enforced', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const bob = testEnv.authenticatedContext('bob');
    const aliceDb = alice.firestore();
    const bobDb = bob.firestore();
    const aliceSubRef = doc(aliceDb, 'subscriptions/subA');

    // Create by owner succeeds
    await assertSucceeds(setDoc(aliceSubRef, {
      userId: 'alice',
      plan: 'PRO',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));

    // Bob cannot update Alice's subscription
    const aliceSubRefFromBob = doc(bobDb, 'subscriptions/subA');
    await assertFails(updateDoc(aliceSubRefFromBob, {
      userId: 'alice',
      plan: 'PRO',
      status: 'past_due',
      createdAt: serverTimestamp(), // should be unchanged
      updatedAt: serverTimestamp(),
    }));

    // Alice update succeeds with unchanged createdAt and server updatedAt
    await assertSucceeds(updateDoc(aliceSubRef, {
      userId: 'alice',
      plan: 'PRO',
      status: 'past_due',
      createdAt: (await getDoc(aliceSubRef)).data()!.createdAt,
      updatedAt: serverTimestamp(),
    }));

    // Extra field rejected
    await assertFails(updateDoc(aliceSubRef, {
      userId: 'alice', plan: 'PRO', status: 'active', createdAt: (await getDoc(aliceSubRef)).data()!.createdAt, updatedAt: serverTimestamp(),
      extra: true,
    }));
  });

  it('users: owner can read/update; role/permissions denied; lastLoginAt must be serverTimestamp', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const aliceDb = alice.firestore();
    const userRef = doc(aliceDb, 'users/alice');

    // Create succeeds with sanitized schema
    await assertSucceeds(setDoc(userRef, {
      email: 'alice@example.com',
      displayName: 'Alice',
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    }));

    // Read by owner succeeds
    await assertSucceeds(getDoc(userRef));

    // Update with role is rejected
    await assertFails(updateDoc(userRef, {
      displayName: 'A',
      updatedAt: serverTimestamp(),
      role: 'admin',
    }));

    // Update with lastLoginAt not serverTimestamp is rejected
    await assertFails(updateDoc(userRef, {
      updatedAt: serverTimestamp(),
      lastLoginAt: new Date(),
    } as any));

    // Proper update succeeds
    await assertSucceeds(updateDoc(userRef, {
      displayName: 'Alice New',
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    }));
  });
});
