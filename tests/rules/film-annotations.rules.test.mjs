// Film annotations (coach-film-annotation.v1, F1 synthetic preview): teams/{teamId}/filmAnnotations/{id}.
// Owner-only team data with a pinned synthetic source, strict schema and optimistic revisions.
// Runs only against the emulator with a demo-* project.
import { describe, it, before, after, beforeEach } from 'node:test';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { createEnv, tokens, ALICE, BOB, TEAM_A, TEAM_B } from './helpers.mjs';

let env;
const past = Timestamp.fromDate(new Date('2026-10-20T12:00:00Z'));
const SOURCE = {
  kind: 'synthetic', sampleId: 'synthetic-out-route-v1', durationMs: 8000,
  sha256: ['a3b4285499e64d89f99b755cbf4d320ab60b3d142a53c115e4040e83f39404d2',
    'a74f85cb02aaefb6eb42ed05d143c261e595903e4b5a75a49736e787e88da381'],
};
const as = (uid, token = tokens.beta) => env.authenticatedContext(uid, token).firestore();
const alice = () => as(ALICE);
const bob = () => as(BOB);
const ref = (db, team, id) => doc(db, 'teams', team, 'filmAnnotations', id);
const mark = (extra = {}) => ({
  schemaVersion: 'coach-film-annotation.v1', teamId: TEAM_A, createdBy: ALICE, source: SOURCE,
  startMs: 3500, endMs: 6000, label: 'Out route break', tags: ['Route', 'Break'], notes: 'Break toward the sideline.',
  revision: 1, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...extra,
});
// Stored copy as the server would hold it after a create (fixed timestamps).
const stored = (extra = {}) => ({ ...mark(), createdAt: past, updatedAt: past, ...extra });
const update = (extra = {}) => ({ ...stored(), revision: 2, updatedAt: serverTimestamp(), ...extra });

before(async () => { env = await createEnv({ firestore: true }); });
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'teams', TEAM_A), { name: 'A', ownerId: ALICE, createdAt: past, updatedAt: past });
    await setDoc(doc(db, 'teams', TEAM_B), { name: 'B', ownerId: BOB, createdAt: past, updatedAt: past });
    await setDoc(ref(db, TEAM_A, 'existing'), stored());
    await setDoc(ref(db, TEAM_B, 'bobs'), stored({ teamId: TEAM_B, createdBy: BOB }));
  });
});

describe('Owner can save, read back exactly and reopen', () => {
  it('creates at revision 1 with server timestamps and reads back the same marks, tags and notes', async () => {
    const db = alice();
    await assertSucceeds(setDoc(ref(db, TEAM_A, 'new'), mark()));
    const snap = await assertSucceeds(getDoc(ref(db, TEAM_A, 'new')));
    const d = snap.data();
    for (const k of ['startMs', 'endMs', 'label', 'tags', 'notes', 'source', 'revision', 'teamId', 'createdBy']) {
      if (JSON.stringify(d[k]) !== JSON.stringify(mark()[k])) throw new Error(`field ${k} changed on reopen`);
    }
  });
  it('lists its own team and updates with revision + 1', async () => {
    await assertSucceeds(getDocs(collection(alice(), 'teams', TEAM_A, 'filmAnnotations')));
    await assertSucceeds(setDoc(ref(alice(), TEAM_A, 'existing'), update({ label: 'Edited', tags: [] })));
  });
  it('deletes its own mark', async () => {
    await assertSucceeds(deleteDoc(ref(alice(), TEAM_A, 'existing')));
  });
});

describe('Another coach and another team are denied', () => {
  it('another coach cannot read, list, create, update or delete in a team they do not own', async () => {
    await assertFails(getDoc(ref(bob(), TEAM_A, 'existing')));
    await assertFails(getDocs(collection(bob(), 'teams', TEAM_A, 'filmAnnotations')));
    await assertFails(setDoc(ref(bob(), TEAM_A, 'intrude'), mark({ createdBy: BOB })));
    await assertFails(setDoc(ref(bob(), TEAM_A, 'existing'), update({ createdBy: BOB })));
    await assertFails(setDoc(ref(bob(), TEAM_A, 'existing'), update()));
    await assertFails(deleteDoc(ref(bob(), TEAM_A, 'existing')));
  });
  it('the owner of team A cannot read or write team B annotations', async () => {
    await assertFails(getDoc(ref(alice(), TEAM_B, 'bobs')));
    await assertFails(getDocs(collection(alice(), 'teams', TEAM_B, 'filmAnnotations')));
    await assertFails(setDoc(ref(alice(), TEAM_B, 'x'), mark({ teamId: TEAM_B })));
    await assertFails(deleteDoc(ref(alice(), TEAM_B, 'bobs')));
  });
  it('cannot store a mark in team A that claims team B', async () => {
    await assertFails(setDoc(ref(alice(), TEAM_A, 'x'), mark({ teamId: TEAM_B })));
  });
  it('signed-out, anonymous, non-beta and unverified callers are denied', async () => {
    for (const db of [env.unauthenticatedContext().firestore(), as(ALICE, tokens.anonymousWithClaims), as(ALICE, tokens.noBeta), as(ALICE, tokens.unverified)]) {
      await assertFails(getDoc(ref(db, TEAM_A, 'existing')));
      await assertFails(setDoc(ref(db, TEAM_A, 'x'), mark()));
    }
  });
});

describe('Pinned synthetic source', () => {
  it('rejects a different sample id, duration, hash list, or a non-synthetic source', async () => {
    const db = alice();
    await assertFails(setDoc(ref(db, TEAM_A, 's1'), mark({ source: { ...SOURCE, sampleId: 'other-sample' } })));
    await assertFails(setDoc(ref(db, TEAM_A, 's2'), mark({ source: { ...SOURCE, durationMs: 9000 } })));
    await assertFails(setDoc(ref(db, TEAM_A, 's3'), mark({ source: { ...SOURCE, sha256: [SOURCE.sha256[0]] } })));
    await assertFails(setDoc(ref(db, TEAM_A, 's4'), mark({ source: { ...SOURCE, sha256: ['0'.repeat(64), SOURCE.sha256[1]] } })));
    await assertFails(setDoc(ref(db, TEAM_A, 's5'), mark({ source: { ...SOURCE, kind: 'film' } })));
  });
  it('an update cannot move a mark to a different source', async () => {
    await assertFails(setDoc(ref(alice(), TEAM_A, 'existing'), update({ source: { ...SOURCE, durationMs: 7000 } })));
  });
});

describe('Time bounds, text and tag limits', () => {
  const bad = {
    'negative start': { startMs: -1 },
    'end past the sample': { endMs: 8001 },
    'end before start': { startMs: 5000, endMs: 4000 },
    'interval under 0.1 s': { startMs: 1000, endMs: 1099 },
    'fractional ms': { startMs: 1000.5 },
    'string time': { endMs: '6000' },
    'empty label': { label: '' },
    'label over 80': { label: 'x'.repeat(81) },
    'nine tags': { tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'] },
    'duplicate tags': { tags: ['Route', 'Route'] },
    'empty tag': { tags: [''] },
    'tag over 24': { tags: ['x'.repeat(25)] },
    'non-string tag': { tags: [7] },
    'notes over 2000': { notes: 'x'.repeat(2001) },
  };
  for (const [name, extra] of Object.entries(bad)) {
    it(`rejects ${name}`, async () => { await assertFails(setDoc(ref(alice(), TEAM_A, 'b'), mark(extra))); });
  }
  it('accepts the exact boundaries (0 to 8000 ms, 80-char label, 8 tags of 24, 2000-char notes)', async () => {
    await assertSucceeds(setDoc(ref(alice(), TEAM_A, 'edge'), mark({
      startMs: 0, endMs: 8000, label: 'x'.repeat(80), tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'.repeat(24)], notes: 'n'.repeat(2000) })));
  });
});

describe('Schema, authorship and revisions', () => {
  it('rejects unknown or missing fields, a wrong schema version and a forged author', async () => {
    const db = alice();
    await assertFails(setDoc(ref(db, TEAM_A, 'f1'), mark({ extra: true })));
    const { notes, ...noNotes } = mark();
    await assertFails(setDoc(ref(db, TEAM_A, 'f2'), noNotes));
    await assertFails(setDoc(ref(db, TEAM_A, 'f3'), mark({ schemaVersion: 'coach-film-annotation.v2' })));
    await assertFails(setDoc(ref(db, TEAM_A, 'f4'), mark({ createdBy: BOB })));
  });
  it('rejects client-chosen timestamps and a create above revision 1', async () => {
    const db = alice();
    await assertFails(setDoc(ref(db, TEAM_A, 't1'), mark({ createdAt: past, updatedAt: past })));
    await assertFails(setDoc(ref(db, TEAM_A, 't2'), mark({ revision: 2 })));
  });
  it('denies a stale update (same revision), a skipped revision and a client updatedAt', async () => {
    const db = alice();
    await assertFails(setDoc(ref(db, TEAM_A, 'existing'), update({ revision: 1 })));
    await assertFails(setDoc(ref(db, TEAM_A, 'existing'), update({ revision: 3 })));
    await assertFails(setDoc(ref(db, TEAM_A, 'existing'), update({ updatedAt: past })));
  });
  it('keeps teamId, createdBy, createdAt and schemaVersion immutable', async () => {
    const db = alice();
    await assertFails(setDoc(ref(db, TEAM_A, 'existing'), update({ createdAt: Timestamp.fromDate(new Date('2026-10-21T12:00:00Z')) })));
    await assertFails(setDoc(ref(db, TEAM_A, 'existing'), update({ createdBy: BOB })));
  });
});
