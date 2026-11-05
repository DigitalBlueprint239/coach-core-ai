// v3 persistence: create at revision 1, transactional update with conflict detection, no rewrite of v2 originals.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { migratePlayV2toV3, type PlayDocV3 } from '../../../football-core';
import { SPREAD_FORMATIONS } from '../../../football-core/content/formations.spread';

const store = vi.hoisted(() => ({ docs: new Map<string, Record<string, unknown>>(), nextId: 1, writes: 0 }));

vi.mock('../../../firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => ({ name }),
  doc: (_db: unknown, name: string, id: string) => ({ name, id }),
  where: () => ({}),
  query: (c: unknown) => c,
  addDoc: async (_c: unknown, data: Record<string, unknown>) => {
    const id = `new-${store.nextId++}`;
    store.docs.set(id, structuredClone(data));
    store.writes++;
    return { id };
  },
  getDocs: async () => ({ docs: [...store.docs].map(([id, data]) => ({ id, data: () => structuredClone(data) })) }),
  runTransaction: async (_db: unknown, fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      get: async (ref: { id: string }) => ({
        exists: () => store.docs.has(ref.id),
        data: () => structuredClone(store.docs.get(ref.id)),
      }),
      update: (ref: { id: string }, patch: Record<string, unknown>) => {
        store.docs.set(ref.id, { ...store.docs.get(ref.id), ...structuredClone(patch) });
        store.writes++;
      },
    }),
}));

import { isPlayConflict, loadPlayDocsV3, savePlayDocV3 } from '../playStoreV3';

const play = (): PlayDocV3 => ({
  ...migratePlayV2toV3({
    teamId: 't1', schemaVersion: 2, name: 'Smash', formation: structuredClone(SPREAD_FORMATIONS[0]),
    assignments: [{ slot: 'back', kind: 'protect' }], read: [], level: 'jv', tags: [], notes: '',
  }),
  provenance: { origin: 'created' },
});

beforeEach(() => {
  store.docs.clear();
  store.nextId = 1;
  store.writes = 0;
});
afterEach(() => vi.clearAllMocks());

describe('savePlayDocV3', () => {
  it('creates a new play at revision 1 owned by the coach', async () => {
    const r = await savePlayDocV3({ ...play(), revision: 7 }, 'coach1');
    expect(r).toEqual({ id: 'new-1', revision: 1 });
    expect(store.docs.get('new-1')).toMatchObject({ schemaVersion: 3, revision: 1, createdBy: 'coach1' });
  });

  it('an update with the revision the coach opened writes revision + 1', async () => {
    const { id } = await savePlayDocV3(play(), 'coach1');
    const r = await savePlayDocV3({ ...play(), name: 'Smash 2' }, 'coach1', { id, expectedRevision: 1 });
    expect(r.revision).toBe(2);
    expect(store.docs.get(id)).toMatchObject({ name: 'Smash 2', revision: 2 });
  });

  it('a stale save is a conflict: nothing is written and the coach is told their changes are kept', async () => {
    const { id } = await savePlayDocV3(play(), 'coach1');
    await savePlayDocV3({ ...play(), name: 'Tablet edit' }, 'coach1', { id, expectedRevision: 1 }); // now revision 2
    const writes = store.writes;
    const err = await savePlayDocV3({ ...play(), name: 'Phone edit' }, 'coach1', { id, expectedRevision: 1 }).catch(e => e);
    expect(isPlayConflict(err)).toBe(true);
    expect(err.storedRevision).toBe(2);
    expect(err.message).toContain('Your changes are still here');
    expect(store.writes).toBe(writes);
    expect(store.docs.get(id)).toMatchObject({ name: 'Tablet edit', revision: 2 });
  });

  it('saving onto a deleted play is a conflict, not a silent recreate', async () => {
    const err = await savePlayDocV3(play(), 'coach1', { id: 'gone', expectedRevision: 1 }).catch(e => e);
    expect(isPlayConflict(err) && err.storedRevision).toBe(null);
  });

  it('never overwrites a v2 original; the migrated play must be saved as a new v3 play', async () => {
    store.docs.set('v2doc', { schemaVersion: 2, teamId: 't1', name: 'Old' });
    await expect(savePlayDocV3(play(), 'coach1', { id: 'v2doc', expectedRevision: 1 })).rejects.toThrow('non-v3');
    expect(store.docs.get('v2doc')).toEqual({ schemaVersion: 2, teamId: 't1', name: 'Old' });
  });

  it('refuses to save a malformed play', async () => {
    await expect(savePlayDocV3({ ...play(), ruleProfileId: 'nfl@1' }, 'coach1')).rejects.toThrow('malformed');
    expect(store.writes).toBe(0);
  });

  it('updates never send teamId, createdBy or provenance', async () => {
    const { id } = await savePlayDocV3(play(), 'coach1');
    await savePlayDocV3({ ...play(), teamId: 'other', createdBy: 'mallory' }, 'coach1', { id, expectedRevision: 1 });
    expect(store.docs.get(id)).toMatchObject({ teamId: 't1', createdBy: 'coach1' });
  });
});

describe('loadPlayDocsV3', () => {
  it('reads v3 as is, migrates v2 in memory without writing, and skips v1', async () => {
    const { id } = await savePlayDocV3(play(), 'coach1');
    store.docs.set('v2doc', {
      schemaVersion: 2, teamId: 't1', name: 'Old', formation: structuredClone(SPREAD_FORMATIONS[0]),
      assignments: [], read: [], level: 'jv', tags: [], notes: '',
    });
    store.docs.set('v1doc', { teamId: 't1', name: 'Pixels', players: [] });
    const writes = store.writes;
    const { plays, skipped } = await loadPlayDocsV3('t1');
    expect(plays.map(p => p.id).sort()).toEqual([id, 'v2doc'].sort());
    expect(plays.find(p => p.id === 'v2doc')?.provenance).toEqual({ origin: 'migrated', fromSchemaVersion: 2, sourceId: 'v2doc' });
    expect(skipped).toBe(1);
    expect(plays.find(p => p.id === id)?.sourceSchemaVersion).toBe(3);
    expect(plays.find(p => p.id === 'v2doc')?.sourceSchemaVersion).toBe(2);
    expect(store.writes).toBe(writes);
  });
});
