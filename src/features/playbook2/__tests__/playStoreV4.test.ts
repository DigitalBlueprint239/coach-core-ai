// v4 persistence: atomic play + revision copy, conflict detection, retention, non-destructive migration, publishing.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlayDocV4, migratePlayV2toV3, resolveGeometry, type PlayDocV4 } from '../../../football-core';
import { PASS_CONCEPTS } from '../../../football-core/content/concepts.pass';
import { SPREAD_FORMATIONS } from '../../../football-core/content/formations.spread';

type Ref = { path: string; id: string };
const store = vi.hoisted(() => ({ docs: new Map<string, Record<string, unknown>>(), nextId: 1, commits: 0, failNextCommit: false }));

vi.mock('../../../firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => {
  const clone = <T,>(v: T): T => structuredClone(v);
  const ref = (path: string): Ref => ({ path, id: path.split('/').pop() as string });
  const snap = (r: Ref) => ({ id: r.id, exists: () => store.docs.has(r.path), data: () => clone(store.docs.get(r.path)) });
  type Op = { kind: 'set' | 'delete'; ref: Ref; data?: Record<string, unknown> };
  // Writes are staged and applied together, like a real batch or transaction: all or nothing.
  const apply = (ops: Op[]) => {
    if (store.failNextCommit) { store.failNextCommit = false; throw new Error('permission-denied'); }
    for (const op of ops) {
      if (op.kind === 'set') store.docs.set(op.ref.path, clone(op.data as Record<string, unknown>));
      else store.docs.delete(op.ref.path);
    }
    store.commits++;
  };
  return {
    collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
    doc: (first: unknown, ...segments: string[]) =>
      segments.length ? ref(segments.join('/')) : ref(`${(first as { path: string }).path}/auto-${store.nextId++}`),
    where: (field: string, _op: string, value: unknown) => ({ field, value }),
    query: (c: { path: string }, filter: { field: string; value: unknown }) => ({ ...c, filter }),
    getDocs: async (q: { path: string; filter?: { field: string; value: unknown } }) => ({
      docs: [...store.docs]
        .filter(([path, data]) => path.startsWith(`${q.path}/`) && !path.slice(q.path.length + 1).includes('/') && (!q.filter || data[q.filter.field] === q.filter.value))
        .map(([path]) => snap(ref(path))),
    }),
    deleteDoc: async (r: Ref) => apply([{ kind: 'delete', ref: r }]),
    writeBatch: () => {
      const ops: Op[] = [];
      return {
        set: (r: Ref, data: Record<string, unknown>) => { ops.push({ kind: 'set', ref: r, data }); },
        delete: (r: Ref) => { ops.push({ kind: 'delete', ref: r }); },
        commit: async () => apply(ops),
      };
    },
    runTransaction: async (_db: unknown, fn: (tx: unknown) => Promise<unknown>) => {
      const ops: Op[] = [];
      let wrote = false;
      const result = await fn({
        get: async (r: Ref) => {
          if (wrote) throw new Error('Firestore transactions require all reads to be executed before all writes.');
          return snap(r);
        },
        set: (r: Ref, data: Record<string, unknown>) => { wrote = true; ops.push({ kind: 'set', ref: r, data }); },
        delete: (r: Ref) => { wrote = true; ops.push({ kind: 'delete', ref: r }); },
      });
      apply(ops);
      return result;
    },
  };
});

import {
  REVISION_RETENTION, deletePlayV4, isPlayConflict, loadPlayDocsV4, loadPlayRevisions, loadPublishedPlays, publishPlayV4,
  publishedSnapshotId, savePlayDocV4, unpublishPlayV4,
} from '../playStoreV4';

const play = (name = 'Smash'): PlayDocV4 => {
  const p = createPlayDocV4('t1', structuredClone(SPREAD_FORMATIONS[0]), name);
  p.assignments.push({ kind: 'route', playerId: 'p7', points: [{ x: 0, y: 5 }, { x: 0, y: 4 }] });
  return p;
};
const stored = (path: string) => store.docs.get(path) as Record<string, unknown> | undefined;
const revisionPaths = (id: string) => [...store.docs.keys()].filter(k => k.startsWith(`plays/${id}/revisions/`)).map(k => Number(k.split('/').pop())).sort((a, b) => a - b);

beforeEach(() => {
  store.docs.clear();
  store.nextId = 1;
  store.commits = 0;
  store.failNextCommit = false;
});
afterEach(() => vi.clearAllMocks());

describe('savePlayDocV4', () => {
  it('creates the play at revision 1 with its revision copy, in one commit', async () => {
    const r = await savePlayDocV4({ ...play(), revision: 7 }, 'coach1');
    expect(r).toEqual({ id: 'auto-1', revision: 1 });
    expect(store.commits).toBe(1);
    expect(stored('plays/auto-1')).toMatchObject({ schemaVersion: 4, revision: 1, createdBy: 'coach1' });
    expect(stored('plays/auto-1/revisions/1')).toMatchObject({ teamId: 't1', playId: 'auto-1', revision: 1, savedBy: 'coach1', play: { name: 'Smash', revision: 1 } });
  });

  it('if the commit fails, neither the play nor a copy exists', async () => {
    store.failNextCommit = true;
    await expect(savePlayDocV4(play(), 'coach1')).rejects.toThrow('permission-denied');
    expect(store.docs.size).toBe(0);
  });

  it('an update writes revision + 1 and the matching copy', async () => {
    const { id } = await savePlayDocV4(play(), 'coach1');
    const r = await savePlayDocV4(play('Smash 2'), 'coach1', { id, expectedRevision: 1 });
    expect(r.revision).toBe(2);
    expect(stored(`plays/${id}`)).toMatchObject({ name: 'Smash 2', revision: 2 });
    expect(stored(`plays/${id}/revisions/2`)).toMatchObject({ revision: 2, play: { name: 'Smash 2', revision: 2 } });
    expect(stored(`plays/${id}/revisions/1`)).toMatchObject({ play: { name: 'Smash', revision: 1 } });
  });

  it('a stale save is a conflict: nothing is written and the coach is told their changes are kept', async () => {
    const { id } = await savePlayDocV4(play(), 'coach1');
    await savePlayDocV4(play('Tablet edit'), 'coach1', { id, expectedRevision: 1 });
    const before = JSON.stringify([...store.docs]);
    const err = await savePlayDocV4(play('Phone edit'), 'coach1', { id, expectedRevision: 1 }).catch(e => e);
    expect(isPlayConflict(err)).toBe(true);
    expect(err.storedRevision).toBe(2);
    expect(err.message).toContain('Your changes are still here');
    expect(JSON.stringify([...store.docs])).toBe(before);
  });

  it('saving onto a deleted play is a conflict, not a silent recreate', async () => {
    const err = await savePlayDocV4(play(), 'coach1', { id: 'gone', expectedRevision: 1 }).catch(e => e);
    expect(isPlayConflict(err) && err.storedRevision).toBe(null);
    expect(store.docs.size).toBe(0);
  });

  it('never overwrites a v2 or v3 original', async () => {
    store.docs.set('plays/v2doc', { schemaVersion: 2, teamId: 't1', name: 'Old' });
    store.docs.set('plays/v3doc', { schemaVersion: 3, teamId: 't1', name: 'Old 3', revision: 1 });
    await expect(savePlayDocV4(play(), 'coach1', { id: 'v2doc', expectedRevision: 1 })).rejects.toThrow('non-v4');
    await expect(savePlayDocV4(play(), 'coach1', { id: 'v3doc', expectedRevision: 1 })).rejects.toThrow('non-v4');
    expect(stored('plays/v2doc')).toEqual({ schemaVersion: 2, teamId: 't1', name: 'Old' });
    expect(stored('plays/v3doc')).toEqual({ schemaVersion: 3, teamId: 't1', name: 'Old 3', revision: 1 });
  });

  it('refuses to save a malformed play', async () => {
    const broken = play();
    broken.assignments[0] = { ...broken.assignments[0], playerId: 'strong-1' };
    await expect(savePlayDocV4(broken, 'coach1')).rejects.toThrow('malformed');
    expect(store.docs.size).toBe(0);
  });

  it('team, creator and provenance always come from the stored play', async () => {
    const { id } = await savePlayDocV4(play(), 'coach1');
    const tampered: PlayDocV4 = { ...play('Edited'), teamId: 'other', createdBy: 'mallory', provenance: { origin: 'duplicated', sourceId: 'x', sourceRevision: 1 } };
    await savePlayDocV4(tampered, 'coach2', { id, expectedRevision: 1 });
    expect(stored(`plays/${id}`)).toMatchObject({ teamId: 't1', createdBy: 'coach1', provenance: { origin: 'created' }, name: 'Edited' });
    expect(stored(`plays/${id}/revisions/2`)).toMatchObject({ teamId: 't1', savedBy: 'coach2' });
  });

  it('removing an optional part of the play really removes it from the stored document', async () => {
    const withConcept: PlayDocV4 = { ...play(), concept: { id: 'smash', family: 'pass' } };
    const { id } = await savePlayDocV4(withConcept, 'coach1');
    expect(stored(`plays/${id}`)).toHaveProperty('concept');
    await savePlayDocV4(play(), 'coach1', { id, expectedRevision: 1 });
    expect(stored(`plays/${id}`)).not.toHaveProperty('concept');
  });

  it(`keeps only the newest ${REVISION_RETENTION} revision copies`, async () => {
    const { id } = await savePlayDocV4(play(), 'coach1');
    const total = REVISION_RETENTION + 4;
    for (let revision = 1; revision < total; revision++) await savePlayDocV4(play(`Edit ${revision}`), 'coach1', { id, expectedRevision: revision });
    const kept = revisionPaths(id);
    expect(kept).toHaveLength(REVISION_RETENTION);
    expect(kept[0]).toBe(total - REVISION_RETENTION + 1);
    expect(kept[kept.length - 1]).toBe(total);
  });

  it('what is saved is exactly what is loaded: assignments and geometry do not change', async () => {
    const original = play();
    const { id } = await savePlayDocV4(original, 'coach1');
    const { plays } = await loadPlayDocsV4('t1');
    const loaded = plays.find(p => p.id === id)!;
    expect(loaded.assignments).toEqual(original.assignments);
    expect(loaded.players).toEqual(original.players);
    expect(resolveGeometry(loaded)).toEqual(resolveGeometry(original));
    expect(loaded).not.toHaveProperty('updatedAt');
    // And saving the loaded play again changes nothing but the revision.
    const { id: _id, sourceSchemaVersion: _v, ...again } = loaded;
    void _id; void _v;
    await savePlayDocV4(again, 'coach1', { id, expectedRevision: 1 });
    const reloaded = (await loadPlayDocsV4('t1')).plays.find(p => p.id === id)!;
    expect({ ...reloaded, revision: 1 }).toEqual(loaded);
  });
});

describe('loadPlayDocsV4', () => {
  it('reads v4 as stored, converts v2 and v3 in memory without writing, and skips v1 and damaged plays', async () => {
    const smash = PASS_CONCEPTS.find(c => c.id === 'smash')!;
    const v2 = {
      schemaVersion: 2 as const, teamId: 't1', name: 'Old', formation: structuredClone(SPREAD_FORMATIONS[0]), conceptId: 'smash',
      assignments: structuredClone(smash.assignments), read: [], level: 'jv' as const, tags: [], notes: '',
    };
    const { id } = await savePlayDocV4(play(), 'coach1');
    store.docs.set('plays/v2doc', v2);
    store.docs.set('plays/v3doc', { ...migratePlayV2toV3(v2) });
    store.docs.set('plays/v1doc', { teamId: 't1', name: 'Pixels', players: [] });
    store.docs.set('plays/broken', { schemaVersion: 4, teamId: 't1', name: 'Broken' });
    store.docs.set('plays/elsewhere', { ...play(), teamId: 't2' });
    const before = JSON.stringify([...store.docs]);

    const { plays, skipped } = await loadPlayDocsV4('t1');
    expect(plays.map(p => [p.id, p.sourceSchemaVersion]).sort()).toEqual([[id, 4], ['v2doc', 2], ['v3doc', 3]].sort());
    expect(skipped).toBe(2);
    expect(plays.find(p => p.id === 'v2doc')?.provenance).toMatchObject({ origin: 'migrated', fromSchemaVersion: 2, sourceId: 'v2doc', interpretation: 'cc-interp@1' });
    expect(JSON.stringify([...store.docs])).toBe(before);
  });

  it('saving a converted play creates a new v4 document and leaves the original alone', async () => {
    const v2 = { schemaVersion: 2, teamId: 't1', name: 'Old', formation: structuredClone(SPREAD_FORMATIONS[0]), assignments: [], read: [], level: 'jv', tags: [], notes: '' };
    store.docs.set('plays/v2doc', v2);
    const { plays } = await loadPlayDocsV4('t1');
    const { id: _id, sourceSchemaVersion, ...converted } = plays[0];
    void _id;
    expect(sourceSchemaVersion).toBe(2);
    const saved = await savePlayDocV4(converted, 'coach1');
    expect(saved.id).not.toBe('v2doc');
    expect(stored('plays/v2doc')).toEqual(v2);
    expect(stored(`plays/${saved.id}`)).toMatchObject({ schemaVersion: 4, provenance: { origin: 'migrated', sourceId: 'v2doc' } });
  });

  it('needs a team', async () => {
    await expect(loadPlayDocsV4('')).rejects.toThrow('Select a team');
  });
});

describe('history, deletion and publishing', () => {
  it('lists history newest first and can restore an old revision as a new one', async () => {
    const { id } = await savePlayDocV4(play('First'), 'coach1');
    await savePlayDocV4(play('Second'), 'coach1', { id, expectedRevision: 1 });
    const history = await loadPlayRevisions('t1', id);
    expect(history.map(h => [h.revision, h.play.name])).toEqual([[2, 'Second'], [1, 'First']]);
    await savePlayDocV4(history[1].play, 'coach1', { id, expectedRevision: 2 });
    expect(stored(`plays/${id}`)).toMatchObject({ name: 'First', revision: 3 });
    expect(revisionPaths(id)).toEqual([1, 2, 3]);
  });

  it('deleting a play removes its history but not its published snapshots', async () => {
    const { id } = await savePlayDocV4(play(), 'coach1');
    await savePlayDocV4(play('Edit'), 'coach1', { id, expectedRevision: 1 });
    const { snapshotId } = await publishPlayV4(id, 2, 'coach1');
    await deletePlayV4('t1', id);
    expect(stored(`plays/${id}`)).toBeUndefined();
    expect(revisionPaths(id)).toEqual([]);
    expect(stored(`publishedPlays/${snapshotId}`)).toBeDefined();
  });

  it('publishing copies the saved revision under an id derived from play and revision', async () => {
    const { id } = await savePlayDocV4(play(), 'coach1');
    const { snapshotId } = await publishPlayV4(id, 1, 'coach1');
    expect(snapshotId).toBe(publishedSnapshotId(id, 1));
    expect(snapshotId).toBe(`${id}_r1`);
    const snapshot = stored(`publishedPlays/${snapshotId}`)!;
    expect(snapshot).toMatchObject({ schemaVersion: 4, kind: 'published-play', teamId: 't1', playId: id, revision: 1, publishedBy: 'coach1' });
    expect((snapshot.play as PlayDocV4).assignments).toEqual(play().assignments);
    expect(snapshot.play).not.toHaveProperty('updatedAt');
  });

  it('a later edit does not change what was published', async () => {
    const { id } = await savePlayDocV4(play(), 'coach1');
    const { snapshotId } = await publishPlayV4(id, 1, 'coach1');
    const published = JSON.stringify(stored(`publishedPlays/${snapshotId}`));
    const edited = play('Edited after publishing');
    edited.players[6].at = { x: 3, y: -2 };
    edited.assignments = [];
    await savePlayDocV4(edited, 'coach1', { id, expectedRevision: 1 });
    expect(JSON.stringify(stored(`publishedPlays/${snapshotId}`))).toBe(published);
    expect((await loadPublishedPlays('t1')).map(p => p.id)).toEqual([snapshotId]);
  });

  it('publishing a revision the coach is not looking at is a conflict', async () => {
    const { id } = await savePlayDocV4(play(), 'coach1');
    await savePlayDocV4(play('Edit'), 'coach1', { id, expectedRevision: 1 });
    const err = await publishPlayV4(id, 1, 'coach1').catch(e => e);
    expect(isPlayConflict(err) && err.storedRevision).toBe(2);
    expect([...store.docs.keys()].some(k => k.startsWith('publishedPlays/'))).toBe(false);
  });

  it('only a saved v4 play can be published; a snapshot can be withdrawn', async () => {
    store.docs.set('plays/v2doc', { schemaVersion: 2, teamId: 't1', name: 'Old', formation: structuredClone(SPREAD_FORMATIONS[0]), assignments: [], read: [], level: 'jv', tags: [], notes: '' });
    await expect(publishPlayV4('v2doc', 1, 'coach1')).rejects.toThrow('Only a saved v4 play');
    const { id } = await savePlayDocV4(play(), 'coach1');
    const { snapshotId } = await publishPlayV4(id, 1, 'coach1');
    await unpublishPlayV4(snapshotId);
    expect(await loadPublishedPlays('t1')).toEqual([]);
  });
});
