// Persistence contract v1 (docs/security/PERSISTENCE_CONTRACT.md):
// account-scoped Playbook plays and editable practice plans with optimistic
// concurrency. Runs only against the emulator with a demo-* project.
import { describe, it, before, after, beforeEach } from 'node:test';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import { createEnv, tokens, ALICE, BOB, TEAM_A, TEAM_B } from './helpers.mjs';

let env;
const now = Timestamp.fromDate(new Date('2026-10-13T12:00:00Z'));
const alice = () => env.authenticatedContext(ALICE, tokens.beta).firestore();
const bob = () => env.authenticatedContext(BOB, tokens.beta).firestore();

const play = (extra = {}) => ({
  name: 'Mesh', phase: 'offense', type: 'pass', localId: 'local-123',
  players: [{ id: 'p1', x: 10, y: 20, position: 'QB', number: 7 }],
  routes: [{ id: 'r1', playerId: 'p1', points: [{ x: 10, y: 20 }], type: 'slant' }],
  revision: 1, teamId: TEAM_A, createdBy: ALICE, createdAt: now, updatedAt: now, ...extra,
});
const plan = (extra = {}) => ({
  name: 'AI plan', duration: 60, periods: [{ kind: 'warmup', name: 'Dynamic', durationMinutes: 10 }],
  goals: ['tackling'], notes: '', source: 'ai', aiRequestId: '2b1f6c0e-9a7d-4c1e-8f3a-1d2e3f4a5b6c',
  safetyConsiderations: ['Water every 20 minutes'], revision: 1,
  teamId: TEAM_A, createdBy: ALICE, createdAt: now, updatedAt: now, ...extra,
});

before(async () => { env = await createEnv({ firestore: true }); });
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'teams', TEAM_A), { name: 'A', ownerId: ALICE, createdAt: now, updatedAt: now });
    await setDoc(doc(db, 'teams', TEAM_B), { name: 'B', ownerId: BOB, createdAt: now, updatedAt: now });
    await setDoc(doc(db, 'plays', 'p-rev'), play());
    await setDoc(doc(db, 'plays', 'p-legacy'), (({ revision, ...rest }) => rest)(play()));
    await setDoc(doc(db, 'practicePlans', 'plan-rev'), plan());
  });
});

describe('Playbook plays (account-scoped cloud persistence)', () => {
  it('owner saves a main-app play with phase/type/localId at revision 1', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'plays', 'new'), play()));
  });
  it('rejects an unknown phase, an oversized type and a create that starts above revision 1', async () => {
    await assertFails(setDoc(doc(alice(), 'plays', 'x1'), play({ phase: 'kickoff_return_party' })));
    await assertFails(setDoc(doc(alice(), 'plays', 'x2'), play({ type: 'x'.repeat(41) })));
    await assertFails(setDoc(doc(alice(), 'plays', 'x3'), play({ revision: 2 })));
  });
  it('save/reopen fidelity: what the owner writes is exactly what the owner reads back', async () => {
    const db = alice();
    const written = play({ name: 'Reopen check' });
    await assertSucceeds(setDoc(doc(db, 'plays', 'fid'), written));
    const snap = await assertSucceeds(getDoc(doc(db, 'plays', 'fid')));
    const read = snap.data();
    for (const k of ['name', 'phase', 'type', 'localId', 'players', 'routes', 'revision', 'teamId', 'createdBy']) {
      if (JSON.stringify(read[k]) !== JSON.stringify(written[k])) throw new Error(`field ${k} changed on reopen`);
    }
  });
});

describe('Concurrent-edit protection (optimistic revision)', () => {
  it('accepts exactly revision + 1', async () => {
    await assertSucceeds(updateDoc(doc(alice(), 'plays', 'p-rev'), { name: 'v2', revision: 2, updatedAt: now }));
  });
  it('denies a stale second writer (both editors started from revision 1)', async () => {
    const tab1 = alice(); const tab2 = alice();
    await assertSucceeds(updateDoc(doc(tab1, 'plays', 'p-rev'), { name: 'tab1', revision: 2, updatedAt: now }));
    await assertFails(updateDoc(doc(tab2, 'plays', 'p-rev'), { name: 'tab2', revision: 2, updatedAt: now }));
  });
  it('denies skipping ahead, going backwards, or omitting the revision', async () => {
    const db = alice();
    await assertFails(updateDoc(doc(db, 'plays', 'p-rev'), { revision: 5, updatedAt: now }));
    await assertFails(updateDoc(doc(db, 'plays', 'p-rev'), { revision: 1, updatedAt: now }));
    await assertFails(updateDoc(doc(db, 'plays', 'p-rev'), { name: 'no revision', updatedAt: now }));
  });
  it('legacy documents without a revision can be edited, and can opt in at revision 1', async () => {
    const db = alice();
    await assertSucceeds(updateDoc(doc(db, 'plays', 'p-legacy'), { name: 'legacy edit', updatedAt: now }));
    await assertSucceeds(updateDoc(doc(db, 'plays', 'p-legacy'), { revision: 1, updatedAt: now }));
    await assertFails(updateDoc(doc(db, 'plays', 'p-legacy'), { name: 'now stale', updatedAt: now }));
  });
  it('applies the same protection to practice plans', async () => {
    const tab1 = alice(); const tab2 = alice();
    await assertSucceeds(updateDoc(doc(tab1, 'practicePlans', 'plan-rev'), { duration: 75, revision: 2, updatedAt: now }));
    await assertFails(updateDoc(doc(tab2, 'practicePlans', 'plan-rev'), { duration: 90, revision: 2, updatedAt: now }));
  });
});

describe('Editable AI practice plans', () => {
  it('owner saves an AI plan with safety considerations and the gateway request id', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'practicePlans', 'ai-1'), plan()));
  });
  it('stores the lossless coach-ai.v1 plan fields (age group, skill, contact level, hydration breaks)', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'practicePlans', 'ai-2'), plan({
      ageGroup: '10U', skillLevel: 'beginner', contactLevel: 'limited_contact', hydrationBreakMinutes: [20, 40],
      periods: [
        { kind: 'warmup', name: 'Dynamic', durationMinutes: 10, activities: [{ name: 'High knees', durationMinutes: 5, instructions: 'Lines' }] },
        { kind: 'period', name: 'Tackling', focus: 'Leverage', durationMinutes: 40, drills: [{ name: 'Shimmy', durationMinutes: 15, setup: 'Cones', instructions: 'Walk-through', coachingPoints: ['Eyes up'], equipment: ['cones'] }] },
        { kind: 'cooldown', name: 'Stretch', durationMinutes: 10, activities: [] },
      ],
    })));
  });
  it('rejects an unknown age group, skill or contact level and oversized hydration lists', async () => {
    const db = alice();
    await assertFails(setDoc(doc(db, 'practicePlans', 'c1'), plan({ ageGroup: '4U' })));
    await assertFails(setDoc(doc(db, 'practicePlans', 'c2'), plan({ skillLevel: 'pro' })));
    await assertFails(setDoc(doc(db, 'practicePlans', 'c3'), plan({ contactLevel: 'tackle_everything' })));
    await assertFails(setDoc(doc(db, 'practicePlans', 'c4'), plan({ hydrationBreakMinutes: Array.from({ length: 21 }, (_, i) => i) })));
  });
  it('rejects oversized safety lists, bad request ids and unknown source values', async () => {
    const db = alice();
    await assertFails(setDoc(doc(db, 'practicePlans', 'b1'), plan({ safetyConsiderations: Array.from({ length: 21 }, () => 's') })));
    await assertFails(setDoc(doc(db, 'practicePlans', 'b2'), plan({ aiRequestId: 'x'.repeat(65) })));
    await assertFails(setDoc(doc(db, 'practicePlans', 'b3'), plan({ source: 'gemini' })));
  });
});

describe('Cross-team denial still holds with the new fields', () => {
  it('coach B cannot read, edit (even with the right next revision) or create into team A', async () => {
    const db = bob();
    await assertFails(getDoc(doc(db, 'plays', 'p-rev')));
    await assertFails(updateDoc(doc(db, 'plays', 'p-rev'), { name: 'hijack', revision: 2, updatedAt: now }));
    await assertFails(updateDoc(doc(db, 'practicePlans', 'plan-rev'), { duration: 1, revision: 2, updatedAt: now }));
    await assertFails(setDoc(doc(db, 'plays', 'inject'), play({ createdBy: BOB })));
  });
});
