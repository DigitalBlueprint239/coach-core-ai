// Firestore security-rules tests (Day 1 report §3 matrix, cases T1–T12).
import { describe, it, before, after, beforeEach } from 'node:test';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  doc, collection, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { createEnv, tokens, ALICE, BOB, TEAM_A, TEAM_B } from './helpers.mjs';

let env;
const now = Timestamp.fromDate(new Date('2026-10-13T12:00:00Z'));

const team = (ownerId, name) => ({
  name, code: 'ABC123', ownerId, memberIds: [ownerId],
  memberDetails: [{ id: ownerId, role: 'owner' }], createdAt: now, updatedAt: now,
});
const play = (teamId, createdBy, extra = {}) => ({
  name: 'Trips Right Y-Cross', formation: 'Trips Right', description: 'Base concept',
  routes: [], players: [], tags: ['red-zone'], difficulty: 'beginner', sport: 'football',
  teamId, createdBy, createdAt: now, updatedAt: now, ...extra,
});
const plan = (teamId, createdBy, extra = {}) => ({
  name: 'Tuesday install', date: '2026-10-14', duration: 90, periods: [], goals: ['tackling'],
  notes: '', source: 'manual', teamId, createdBy, createdAt: now, updatedAt: now, ...extra,
});

async function seed() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'teams', TEAM_A), team(ALICE, 'Alice Eagles'));
    await setDoc(doc(db, 'teams', TEAM_B), team(BOB, 'Bob Bears'));
    await setDoc(doc(db, 'plays', 'play-a'), play(TEAM_A, ALICE));
    await setDoc(doc(db, 'plays', 'play-b'), play(TEAM_B, BOB));
    await setDoc(doc(db, 'practicePlans', 'plan-a'), plan(TEAM_A, ALICE));
    await setDoc(doc(db, 'practicePlans', 'plan-b'), plan(TEAM_B, BOB));
    await setDoc(doc(db, 'userProfiles', ALICE), { uid: ALICE });
  });
}

const alice = () => env.authenticatedContext(ALICE, tokens.beta).firestore();
const bob = () => env.authenticatedContext(BOB, tokens.beta).firestore();

before(async () => { env = await createEnv({ firestore: true }); });
after(async () => { await env?.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); await seed(); });

describe('T1 unauthenticated', () => {
  it('cannot read or write any collection', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'teams', TEAM_A)));
    await assertFails(getDoc(doc(db, 'plays', 'play-a')));
    await assertFails(getDoc(doc(db, 'practicePlans', 'plan-a')));
    await assertFails(getDocs(query(collection(db, 'plays'), where('teamId', '==', TEAM_A))));
    await assertFails(setDoc(doc(db, 'teams', 'x'), team('nobody', 'X')));
  });
});

describe('T2 anonymous', () => {
  it('is denied everywhere, even when its token carries beta/verified claims', async () => {
    const db = env.authenticatedContext(ALICE, tokens.anonymousWithClaims).firestore();
    await assertFails(getDoc(doc(db, 'teams', TEAM_A)));
    await assertFails(getDoc(doc(db, 'plays', 'play-a')));
    await assertFails(setDoc(doc(db, 'teams', 'anon-team'), team(ALICE, 'Anon')));
    await assertFails(addDoc(collection(db, 'plays'), play(TEAM_A, ALICE)));
  });
});

describe('T3 signed in but not beta-eligible', () => {
  it('denies a verified user without the beta claim', async () => {
    const db = env.authenticatedContext(ALICE, tokens.noBeta).firestore();
    await assertFails(setDoc(doc(db, 'teams', 'nb-team'), team(ALICE, 'No Beta')));
    await assertFails(getDoc(doc(db, 'teams', TEAM_A)));
  });
  it('denies a beta user whose email is not verified', async () => {
    const db = env.authenticatedContext(ALICE, tokens.unverified).firestore();
    await assertFails(setDoc(doc(db, 'teams', 'uv-team'), team(ALICE, 'Unverified')));
    await assertFails(getDoc(doc(db, 'plays', 'play-a')));
  });
});

describe('T4 owner can work inside their own team', () => {
  it('creates, reads, lists and updates own team', async () => {
    const db = alice();
    await assertSucceeds(setDoc(doc(db, 'teams', 'alice-2'), { ...team(ALICE, 'JV'), createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    await assertSucceeds(getDoc(doc(db, 'teams', TEAM_A)));
    await assertSucceeds(getDocs(query(collection(db, 'teams'), where('ownerId', '==', ALICE))));
    await assertSucceeds(updateDoc(doc(db, 'teams', TEAM_A), { name: 'Alice Eagles Varsity', updatedAt: serverTimestamp() }));
  });
  it('cannot delete a team from the client (prevents orphaned-data takeover)', async () => {
    await assertFails(deleteDoc(doc(alice(), 'teams', TEAM_A)));
  });
  it('creates, reads, lists, updates and deletes own plays', async () => {
    const db = alice();
    await assertSucceeds(setDoc(doc(db, 'plays', 'play-a2'), play(TEAM_A, ALICE)));
    await assertSucceeds(getDoc(doc(db, 'plays', 'play-a')));
    await assertSucceeds(getDocs(query(collection(db, 'plays'), where('teamId', '==', TEAM_A))));
    await assertSucceeds(updateDoc(doc(db, 'plays', 'play-a'), { name: 'Renamed', updatedAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(doc(db, 'plays', 'play-a2')));
  });
  it('creates, reads, lists, updates and deletes own practice plans', async () => {
    const db = alice();
    await assertSucceeds(setDoc(doc(db, 'practicePlans', 'plan-a2'), plan(TEAM_A, ALICE, { source: 'ai' })));
    await assertSucceeds(getDoc(doc(db, 'practicePlans', 'plan-a')));
    await assertSucceeds(getDocs(query(collection(db, 'practicePlans'), where('teamId', '==', TEAM_A))));
    await assertSucceeds(updateDoc(doc(db, 'practicePlans', 'plan-a'), { duration: 75, updatedAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(doc(db, 'practicePlans', 'plan-a2')));
  });
});

describe('T5 cross-tenant access is denied', () => {
  it("bob cannot read, list, update or delete alice's team", async () => {
    const db = bob();
    await assertFails(getDoc(doc(db, 'teams', TEAM_A)));
    await assertFails(getDocs(query(collection(db, 'teams'), where('ownerId', '==', ALICE))));
    await assertFails(updateDoc(doc(db, 'teams', TEAM_A), { name: 'Hijacked', updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(db, 'teams', TEAM_A)));
  });
  it("bob cannot read, list, update or delete alice's plays and plans", async () => {
    const db = bob();
    await assertFails(getDoc(doc(db, 'plays', 'play-a')));
    await assertFails(getDocs(query(collection(db, 'plays'), where('teamId', '==', TEAM_A))));
    await assertFails(updateDoc(doc(db, 'plays', 'play-a'), { name: 'x', updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(db, 'plays', 'play-a')));
    await assertFails(getDoc(doc(db, 'practicePlans', 'plan-a')));
    await assertFails(getDocs(query(collection(db, 'practicePlans'), where('teamId', '==', TEAM_A))));
    await assertFails(updateDoc(doc(db, 'practicePlans', 'plan-a'), { duration: 1, updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(db, 'practicePlans', 'plan-a')));
  });
  it("bob cannot create content inside alice's team", async () => {
    const db = bob();
    await assertFails(setDoc(doc(db, 'plays', 'inject'), play(TEAM_A, BOB)));
    await assertFails(setDoc(doc(db, 'practicePlans', 'inject'), plan(TEAM_A, BOB)));
  });
  it("bob cannot join alice's team by editing membership", async () => {
    const db = bob();
    await assertFails(updateDoc(doc(db, 'teams', TEAM_A), { memberIds: [ALICE, BOB] }));
  });
});

describe('T6 tenant identifier is immutable', () => {
  it('owner cannot move a play or plan into another team', async () => {
    const db = alice();
    await assertFails(updateDoc(doc(db, 'plays', 'play-a'), { teamId: TEAM_B, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, 'practicePlans', 'plan-a'), { teamId: TEAM_B, updatedAt: serverTimestamp() }));
  });
  it('owner cannot create into a team id that does not exist', async () => {
    await assertFails(setDoc(doc(alice(), 'plays', 'ghost'), play('no-such-team', ALICE)));
  });
});

describe('T7 ownership fields are immutable / cannot be forged', () => {
  it('cannot change createdBy or ownerId', async () => {
    const db = alice();
    await assertFails(updateDoc(doc(db, 'plays', 'play-a'), { createdBy: BOB, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, 'practicePlans', 'plan-a'), { createdBy: BOB, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, 'teams', TEAM_A), { ownerId: BOB, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, 'teams', TEAM_A), { memberIds: [ALICE, BOB], updatedAt: serverTimestamp() }));
  });
  it('cannot create a team owned by someone else, or a play attributed to someone else', async () => {
    const db = alice();
    await assertFails(setDoc(doc(db, 'teams', 'forged'), team(BOB, 'Forged')));
    await assertFails(setDoc(doc(db, 'plays', 'forged'), play(TEAM_A, BOB)));
  });
});

describe('T8 unscoped queries are denied', () => {
  it('cannot list plays/plans/teams without a tenant filter', async () => {
    const db = alice();
    await assertFails(getDocs(collection(db, 'plays')));
    await assertFails(getDocs(collection(db, 'practicePlans')));
    await assertFails(getDocs(collection(db, 'teams')));
  });
});

describe('T11 schema validation', () => {
  it('rejects unknown fields, oversized strings, bad enums and wrong types', async () => {
    const db = alice();
    await assertFails(setDoc(doc(db, 'plays', 'v1'), play(TEAM_A, ALICE, { isAdmin: true })));
    await assertFails(setDoc(doc(db, 'plays', 'v2'), play(TEAM_A, ALICE, { name: 'x'.repeat(121) })));
    await assertFails(setDoc(doc(db, 'plays', 'v3'), play(TEAM_A, ALICE, { difficulty: 'legendary' })));
    await assertFails(setDoc(doc(db, 'plays', 'v4'), play(TEAM_A, ALICE, { players: Array.from({ length: 31 }, (_, i) => ({ id: String(i) })) })));
    await assertFails(setDoc(doc(db, 'practicePlans', 'v5'), plan(TEAM_A, ALICE, { duration: 9999 })));
    await assertFails(setDoc(doc(db, 'practicePlans', 'v6'), plan(TEAM_A, ALICE, { notes: 'x'.repeat(5001) })));
    await assertFails(setDoc(doc(db, 'practicePlans', 'v7'), plan(TEAM_A, ALICE, { createdAt: 'yesterday' })));
    await assertFails(setDoc(doc(db, 'teams', 'v8'), { ...team(ALICE, ''), name: '' }));
    await assertFails(updateDoc(doc(db, 'plays', 'play-a'), { secret: 'x', updatedAt: serverTimestamp() }));
  });
});

describe('T12 server-only collections', () => {
  it('no client may read or write them', async () => {
    const db = alice();
    for (const c of ['userProfiles', 'notifications', 'analytics', 'betaUsers', 'aiUsage', 'users']) {
      await assertFails(getDoc(doc(db, c, ALICE)));
      await assertFails(setDoc(doc(db, c, ALICE), { uid: ALICE }));
    }
    await assertFails(getDocs(collection(db, 'userProfiles')));
  });
});
