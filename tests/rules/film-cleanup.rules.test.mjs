// FILM-S1-C1 additive DENY tests (firestore.rules unchanged): filmCleanup
// obligation records fall under the existing default deny; no client (owner,
// other user, unauthenticated) can read, list, create, update or delete them.
// Run with the Firestore emulator (demo-* project only).
import { describe, it, before, after, beforeEach } from 'node:test';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { createEnv, tokens, ALICE, BOB, TEAM_A } from './helpers.mjs';

let env;
const FILM = '3f1e2d4c-5b6a-4e7f-8a9b-0c1d2e3f4a5b';
const ID = 'a'.repeat(64);
const recPath = `filmCleanup/${ID}`;
const now = Timestamp.now();
const record = {
  bucket: 'demo-coach-core-beta.appspot.com', name: `quarantine/${TEAM_A}/${FILM}/source.mp4`,
  generation: '1001', teamId: TEAM_A, filmId: FILM, origin: 'abandon', createdAtMs: 1,
  state: 'pending', attempts: 0, fence: 0, lease: null, history: [], nextAttemptAtMs: 1,
  sweepDueAtMs: 1, resolvedAtMs: null, evidence: null,
};

const db = (uid, token = tokens.beta) => env.authenticatedContext(uid, token).firestore();

before(async () => { env = await createEnv({ firestore: true }); });
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const f = ctx.firestore();
    await setDoc(doc(f, 'teams', TEAM_A), { name: 'A', ownerId: ALICE, createdAt: now, updatedAt: now });
    await setDoc(doc(f, recPath), record);
  });
});

describe('FILM-S1-C1 filmCleanup records are server-only', () => {
  it('owner, other users and unauthenticated clients cannot read or list', async () => {
    for (const f of [db(ALICE), db(BOB), env.unauthenticatedContext().firestore()]) {
      await assertFails(getDoc(doc(f, recPath)));
      await assertFails(getDocs(collection(f, 'filmCleanup')));
    }
  });
  it('no client can create, update or delete (including the team owner)', async () => {
    for (const uid of [ALICE, BOB]) {
      await assertFails(setDoc(doc(db(uid), `filmCleanup/${'b'.repeat(64)}`), record));
      await assertFails(updateDoc(doc(db(uid), recPath), { state: 'deleted' }));
      await assertFails(setDoc(doc(db(uid), recPath), { ...record, attempts: 0 }));
      await assertFails(deleteDoc(doc(db(uid), recPath)));
    }
  });
  it('positive anchor: the owner can still read its team (rules loaded)', async () => {
    await assertSucceeds(getDoc(doc(db(ALICE), 'teams', TEAM_A)));
  });
});
