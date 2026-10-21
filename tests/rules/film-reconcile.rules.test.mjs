// LFS-A additive DENY tests (firestore.rules unchanged): reconciler state,
// evidence and operator audit records fall under the existing default deny;
// no client (owner, other user, unauthenticated) can read, list or write them.
// Run with the Firestore emulator (demo-* project only).
import { describe, it, before, after, beforeEach } from 'node:test';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { createEnv, tokens, ALICE, BOB, TEAM_A } from './helpers.mjs';

let env;
const ID = 'a'.repeat(64);
const paths = [
  'filmReconcile/quarantine',
  `filmReconcile/quarantine/evidence/${ID}`,
  `filmCleanupAudit/${ID}`,
  `filmCleanupAudit/${ID}/events/1`,
];
const colls = ['filmReconcile', 'filmReconcile/quarantine/evidence', 'filmCleanupAudit', `filmCleanupAudit/${ID}/events`];
const now = Timestamp.now();
const db = (uid, token = tokens.beta) => env.authenticatedContext(uid, token).firestore();

before(async () => { env = await createEnv({ firestore: true }); });
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const f = ctx.firestore();
    await setDoc(doc(f, 'teams', TEAM_A), { name: 'A', ownerId: ALICE, createdAt: now, updatedAt: now });
    for (const p of paths) await setDoc(doc(f, p), { x: 1 });
  });
});

describe('LFS reconciler and operator records are server-only', () => {
  it('no client can read or list them', async () => {
    for (const f of [db(ALICE), db(BOB), env.unauthenticatedContext().firestore()]) {
      for (const p of paths) await assertFails(getDoc(doc(f, p)));
      for (const c of colls) await assertFails(getDocs(collection(f, c)));
    }
  });
  it('no client can create, update or delete them (including the team owner)', async () => {
    for (const uid of [ALICE, BOB]) {
      for (const p of paths) {
        await assertFails(setDoc(doc(db(uid), p), { x: 2 }));
        await assertFails(updateDoc(doc(db(uid), p), { x: 3 }));
        await assertFails(deleteDoc(doc(db(uid), p)));
      }
    }
  });
  it('positive anchor: the owner can still read its team (rules loaded)', async () => {
    await assertSucceeds(getDoc(doc(db(ALICE), 'teams', TEAM_A)));
  });
});
