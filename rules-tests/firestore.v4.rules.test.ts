/**
 * Firestore security rules for schema v4 (docs/smart-playbook/SCHEMA_V4.md): revision history, optimistic
 * concurrency and immutable published snapshots.
 * Users: alice owns team t1, bob owns team t2, carol is a listed member of t1. Runs against the emulator.
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';

let env: RulesTestEnvironment;

type Db = ReturnType<ReturnType<RulesTestEnvironment['authenticatedContext']>['firestore']>;
const alice = () => env.authenticatedContext('alice').firestore();
const bob = () => env.authenticatedContext('bob').firestore();
const carol = () => env.authenticatedContext('carol').firestore();
const anonymous = () => env.unauthenticatedContext().firestore();

const playV4 = (revision: number, over: Record<string, unknown> = {}) => ({
  schemaVersion: 4,
  teamId: 't1',
  createdBy: 'alice',
  name: 'Smash',
  notes: '',
  coordinateProfile: 'cc-yards-v1',
  fieldProfileId: 'hs-11@1',
  ruleProfileId: 'eleven-player@1',
  ball: { hash: 'middle' },
  formation: { name: 'Doubles', personnel: '10', strength: 'right' },
  players: [
    { id: 'p1', role: 'QB', at: { x: 0, y: -5 }, onLine: false },
    { id: 'p2', role: 'X', at: { x: -18, y: 0 }, onLine: true },
  ],
  playerSeq: 2,
  assignments: [{ kind: 'route', playerId: 'p2', points: [{ x: 0, y: 5 }, { x: 0, y: 4 }] }],
  unresolved: [],
  read: [],
  tags: [],
  level: 'jv',
  provenance: { origin: 'created' },
  revision,
  ...over,
});
type Play = ReturnType<typeof playV4>;

const copyOf = (playId: string, play: Play, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  teamId: play.teamId, playId, revision: play.revision, savedBy: 'alice', savedAt: new Date(), play, ...over,
});

/** The app's save: the play and its revision copy in one atomic commit. Pass `null` to leave the copy out. */
function saveV4(db: Db, playId: string, play: Play, copy: Record<string, unknown> | null = copyOf(playId, play)) {
  const batch = writeBatch(db);
  batch.set(doc(db, `plays/${playId}`), play);
  if (copy) batch.set(doc(db, `plays/${playId}/revisions/${String(copy.revision)}`), copy);
  return batch.commit();
}

const snapshot = (playId: string, play: Play, over: Record<string, unknown> = {}) => ({
  schemaVersion: 4, kind: 'published-play', teamId: play.teamId, playId, revision: play.revision, publishedBy: 'alice',
  publishedAt: new Date(), play, ...over,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-coach-core',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'teams/t1'), { name: 'Eagles', ownerId: 'alice', memberIds: ['alice', 'carol'] });
    await setDoc(doc(db, 'teams/t2'), { name: 'Hawks', ownerId: 'bob', memberIds: ['bob'] });
    await setDoc(doc(db, 'plays/p1'), { name: 'Mesh', teamId: 't1', createdBy: 'alice' });
    await setDoc(doc(db, 'plays/old-v2'), { schemaVersion: 2, teamId: 't1', createdBy: 'alice', name: 'Old v2' });
    await setDoc(doc(db, 'plays/old-v3'), { schemaVersion: 3, teamId: 't1', createdBy: 'alice', name: 'Old v3', revision: 3 });
    await setDoc(doc(db, 'plays/v4a'), playV4(3));
    await setDoc(doc(db, 'plays/v4a/revisions/3'), copyOf('v4a', playV4(3)));
    await setDoc(doc(db, 'plays/v4a/revisions/2'), copyOf('v4a', playV4(2)));
    await setDoc(doc(db, 'plays/v4b'), playV4(1, { teamId: 't2', createdBy: 'bob' }));
    await setDoc(doc(db, 'publishedPlays/v4a_r2'), snapshot('v4a', playV4(2)));
  });
});

describe('v4 plays and their revision history', () => {
  it('the coach creates a v4 play together with revision copy 1', async () => {
    await assertSucceeds(saveV4(alice(), 'new1', playV4(1)));
  });

  it('a v4 play cannot be created without its revision copy, or a copy without its play', async () => {
    await assertFails(saveV4(alice(), 'new2', playV4(1), null));
    await assertFails(setDoc(doc(alice(), 'plays/ghost/revisions/1'), copyOf('ghost', playV4(1))));
  });

  it('a new v4 play must start at revision 1', async () => {
    await assertFails(saveV4(alice(), 'new3', playV4(2)));
  });

  it('a malformed v4 play is refused', async () => {
    for (const over of [
      { status: 'published' },
      { coordinateProfile: 'pixels' },
      { players: [] },
      { playerSeq: 1 },
      { name: 'x'.repeat(121) },
      { assignments: 'none' },
    ]) {
      await assertFails(saveV4(alice(), 'bad', playV4(1, over)));
    }
  });

  it('the revision copy must match the play it is saved with', async () => {
    const play = playV4(1);
    await assertFails(saveV4(alice(), 'm1', play, copyOf('m1', playV4(1, { name: 'Different' }))));
    await assertFails(saveV4(alice(), 'm2', play, copyOf('m2', playV4(1, { assignments: [] }))));
    await assertFails(saveV4(alice(), 'm3', play, copyOf('m3', playV4(1, { players: [play.players[0]], playerSeq: 2 }))));
    await assertFails(saveV4(alice(), 'm4', play, copyOf('m4', play, { savedBy: 'bob' })));
    await assertFails(saveV4(alice(), 'm5', play, copyOf('m5', play, { playId: 'other' })));
    await assertFails(saveV4(alice(), 'm6', play, copyOf('m6', play, { teamId: 't2' })));
  });

  it('an update moves exactly one revision forward and writes the next copy', async () => {
    await assertSucceeds(saveV4(alice(), 'v4a', playV4(4, { name: 'Smash 2' })));
    await assertSucceeds(getDoc(doc(alice(), 'plays/v4a/revisions/4')));
  });

  it('a stale editor, a skipped revision, or an update without a copy is denied (concurrency)', async () => {
    await assertFails(saveV4(alice(), 'v4a', playV4(3, { name: 'stale' })));
    await assertFails(saveV4(alice(), 'v4a', playV4(5, { name: 'skip' })));
    await assertFails(saveV4(alice(), 'v4a', playV4(4, { name: 'no copy' }), null));
    await assertFails(updateDoc(doc(alice(), 'plays/v4a'), { name: 'quiet rename' }));
    // Two editors opened revision 3: the first save wins, the second is refused and nothing is overwritten.
    await assertSucceeds(saveV4(alice(), 'v4a', playV4(4, { name: 'Tablet' })));
    await assertFails(saveV4(alice(), 'v4a', playV4(4, { name: 'Phone' })));
  });

  it('identity and provenance cannot be rewritten by an update', async () => {
    await assertFails(saveV4(alice(), 'v4a', playV4(4, { provenance: { origin: 'duplicated', sourceId: 'x', sourceRevision: 1 } })));
    await assertFails(saveV4(alice(), 'v4a', playV4(4, { createdBy: 'bob' })));
    await assertFails(saveV4(alice(), 'v4a', playV4(4, { teamId: 't2' })));
  });

  it('a version 1, 2 or 3 play can never be rewritten as v4 in place', async () => {
    await assertFails(saveV4(alice(), 'old-v2', playV4(1)));
    await assertFails(saveV4(alice(), 'old-v3', playV4(4)));
    await assertFails(saveV4(alice(), 'p1', playV4(1)));
    // The converted play is saved as a new document; the original is still there.
    const provenance = { origin: 'migrated', fromSchemaVersion: 2, sourceId: 'old-v2', interpretation: 'cc-interp@1', migration: 'v4-migrate@1' };
    await assertSucceeds(saveV4(alice(), 'converted', playV4(1, { provenance })));
    await assertSucceeds(getDoc(doc(alice(), 'plays/old-v2')));
  });

  it('revision copies are immutable', async () => {
    await assertFails(updateDoc(doc(alice(), 'plays/v4a/revisions/3'), { 'play.name': 'rewritten history' }));
    await assertFails(setDoc(doc(alice(), 'plays/v4a/revisions/3'), copyOf('v4a', playV4(3))));
    await assertFails(setDoc(doc(alice(), 'plays/v4a/revisions/2'), copyOf('v4a', playV4(2, { name: 'forged' }))));
  });

  it('a copy cannot be filed under a different revision number', async () => {
    const db = alice();
    const batch = writeBatch(db);
    batch.set(doc(db, 'plays/v4a'), playV4(4));
    batch.set(doc(db, 'plays/v4a/revisions/9'), copyOf('v4a', playV4(4)));
    await assertFails(batch.commit());
  });

  it('only the coach can read history; the coach can list it and remove old copies', async () => {
    await assertSucceeds(getDoc(doc(alice(), 'plays/v4a/revisions/3')));
    await assertSucceeds(getDocs(query(collection(alice(), 'plays/v4a/revisions'), where('teamId', '==', 't1'))));
    await assertFails(getDoc(doc(bob(), 'plays/v4a/revisions/3')));
    await assertFails(getDoc(doc(carol(), 'plays/v4a/revisions/3')));
    await assertFails(getDoc(doc(anonymous(), 'plays/v4a/revisions/3')));
    await assertFails(getDocs(collection(alice(), 'plays/v4a/revisions')));
    await assertFails(deleteDoc(doc(bob(), 'plays/v4a/revisions/2')));
    await assertSucceeds(deleteDoc(doc(alice(), 'plays/v4a/revisions/2')));
  });

  it("another coach or a team member cannot save into someone else's team or play", async () => {
    const theirs = playV4(1, { createdBy: 'bob' });
    await assertFails(saveV4(bob(), 'theirs', theirs, copyOf('theirs', theirs, { savedBy: 'bob' })));
    await assertFails(saveV4(bob(), 'v4a', playV4(4), copyOf('v4a', playV4(4), { savedBy: 'bob' })));
    await assertFails(saveV4(carol(), 'v4a', playV4(4), copyOf('v4a', playV4(4), { savedBy: 'carol' })));
  });

  it('the coach deletes a play and its history in one commit', async () => {
    const db = alice();
    const batch = writeBatch(db);
    batch.delete(doc(db, 'plays/v4a/revisions/2'));
    batch.delete(doc(db, 'plays/v4a/revisions/3'));
    batch.delete(doc(db, 'plays/v4a'));
    await assertSucceeds(batch.commit());
  });
});

describe('published play snapshots', () => {
  it('the coach publishes the current revision as a snapshot', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'publishedPlays/v4a_r3'), snapshot('v4a', playV4(3))));
  });

  it('a snapshot can never be changed, by anyone, including its coach', async () => {
    await assertFails(updateDoc(doc(alice(), 'publishedPlays/v4a_r2'), { 'play.name': 'edited after publishing' }));
    await assertFails(setDoc(doc(alice(), 'publishedPlays/v4a_r2'), snapshot('v4a', playV4(2))));
    await assertFails(updateDoc(doc(bob(), 'publishedPlays/v4a_r2'), { teamId: 't2' }));
  });

  it('a snapshot must be a faithful copy of the stored revision under its derived id', async () => {
    await assertFails(setDoc(doc(alice(), 'publishedPlays/anything'), snapshot('v4a', playV4(3))));
    await assertFails(setDoc(doc(alice(), 'publishedPlays/v4a_r4'), snapshot('v4a', playV4(4)))); // not saved yet
    await assertFails(setDoc(doc(alice(), 'publishedPlays/v4a_r3'), snapshot('v4a', playV4(3, { name: 'Not what was saved' }))));
    await assertFails(setDoc(doc(alice(), 'publishedPlays/v4a_r3'), snapshot('v4a', playV4(3, { assignments: [] }))));
    await assertFails(setDoc(doc(alice(), 'publishedPlays/v4a_r3'), snapshot('v4a', playV4(3), { publishedBy: 'bob' })));
    await assertFails(setDoc(doc(alice(), 'publishedPlays/v4a_r3'), snapshot('v4a', playV4(3), { kind: 'something-else' })));
  });

  it('only a v4 play can be published, and a missing play cannot', async () => {
    await assertFails(setDoc(doc(alice(), 'publishedPlays/old-v3_r3'), snapshot('old-v3', playV4(3))));
    await assertFails(setDoc(doc(alice(), 'publishedPlays/nope_r1'), snapshot('nope', playV4(1))));
  });

  it("a coach cannot publish another team's play, or publish into another team", async () => {
    const bobsPlay = playV4(1, { teamId: 't2', createdBy: 'bob' });
    await assertFails(setDoc(doc(bob(), 'publishedPlays/v4a_r3'), snapshot('v4a', playV4(3), { publishedBy: 'bob' })));
    await assertFails(setDoc(doc(bob(), 'publishedPlays/v4a_r3'), snapshot('v4a', playV4(3), { publishedBy: 'bob', teamId: 't2' })));
    await assertFails(setDoc(doc(alice(), 'publishedPlays/v4b_r1'), snapshot('v4b', bobsPlay, { teamId: 't1' })));
    await assertFails(setDoc(doc(carol(), 'publishedPlays/v4a_r3'), snapshot('v4a', playV4(3), { publishedBy: 'carol' })));
    // Bob can publish his own.
    await assertSucceeds(setDoc(doc(bob(), 'publishedPlays/v4b_r1'), snapshot('v4b', bobsPlay, { publishedBy: 'bob' })));
  });

  it('snapshots are readable by the coach only: no member, other coach or public access', async () => {
    await assertSucceeds(getDoc(doc(alice(), 'publishedPlays/v4a_r2')));
    await assertSucceeds(getDocs(query(collection(alice(), 'publishedPlays'), where('teamId', '==', 't1'))));
    await assertFails(getDoc(doc(carol(), 'publishedPlays/v4a_r2')));
    await assertFails(getDoc(doc(bob(), 'publishedPlays/v4a_r2')));
    await assertFails(getDoc(doc(anonymous(), 'publishedPlays/v4a_r2')));
    await assertFails(getDocs(collection(alice(), 'publishedPlays')));
    await assertFails(getDocs(query(collection(bob(), 'publishedPlays'), where('teamId', '==', 't1'))));
  });

  it('the coach can withdraw a snapshot; nobody else can', async () => {
    await assertFails(deleteDoc(doc(bob(), 'publishedPlays/v4a_r2')));
    await assertFails(deleteDoc(doc(carol(), 'publishedPlays/v4a_r2')));
    await assertSucceeds(deleteDoc(doc(alice(), 'publishedPlays/v4a_r2')));
  });

  it('a snapshot outlives later edits and deletion of the play', async () => {
    await assertSucceeds(saveV4(alice(), 'v4a', playV4(4, { name: 'Changed later' })));
    await assertSucceeds(deleteDoc(doc(alice(), 'plays/v4a')));
    await assertSucceeds(getDoc(doc(alice(), 'publishedPlays/v4a_r2')));
  });
});
