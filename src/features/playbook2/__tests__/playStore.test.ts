import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addDoc, getDoc, getDocs, runTransaction, updateDoc, where } from 'firebase/firestore';
import { fullLibrary } from '../../../football-core';
import { newBlankPlay, type TeamPlaybookSettings } from '../playModel';
import { listPlaysV2, loadTeamSettings, savePlayV2, saveTeamSettings, type StoreError } from '../playStore';

const doubles = fullLibrary().formations.find(f => f.id === 'doubles')!;
const firebaseError = (code: string) => Object.assign(new Error(code), { code, name: 'FirebaseError' });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listPlaysV2', () => {
  it("queries the team's plays and returns only version-2 plays", async () => {
    const v2 = { ...newBlankPlay('t1', doubles), name: 'Smash' };
    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [
        { id: 'p1', data: () => ({ name: 'Old Mesh', teamId: 't1', players: [], routes: [] }) },
        { id: 'p2', data: () => ({ ...v2, updatedAt: { toDate: () => new Date('2026-11-01T00:00:00Z') } }) },
      ],
    } as never);
    const plays = await listPlaysV2('t1');
    expect(where).toHaveBeenCalledWith('teamId', '==', 't1');
    expect(plays.map(p => p.name)).toEqual(['Smash']);
    expect(plays[0].id).toBe('p2');
    expect(plays[0].updatedAt).toEqual(new Date('2026-11-01T00:00:00Z'));
  });

  it('asks for a team when none is given', async () => {
    await expect(listPlaysV2('')).rejects.toMatchObject({ kind: 'no-team' });
  });
});

describe('savePlayV2', () => {
  it('creates a play with createdBy, schemaVersion 2 and timestamps', async () => {
    vi.mocked(addDoc).mockResolvedValueOnce({ id: 'new-id' } as never);
    const id = await savePlayV2(newBlankPlay('t1', doubles), 'coach1');
    expect(id).toBe('new-id');
    const sent = vi.mocked(addDoc).mock.calls[0][1] as Record<string, unknown>;
    expect(sent).toMatchObject({ teamId: 't1', createdBy: 'coach1', schemaVersion: 2, coordinateProfile: 'cc-yards-v1' });
    expect(sent.createdAt).toBeInstanceOf(Date);
    expect(sent.updatedAt).toBeInstanceOf(Date);
    expect(Object.values(sent)).not.toContain(undefined);
  });

  it('updating a play sends neither teamId nor createdBy', async () => {
    const play = { ...newBlankPlay('t1', doubles), id: 'p9', createdBy: 'coach1', name: 'Renamed' };
    const id = await savePlayV2(play, 'coach1');
    expect(id).toBe('p9');
    expect(addDoc).not.toHaveBeenCalled();
    const sent = vi.mocked(updateDoc).mock.calls[0][1] as unknown as Record<string, unknown>;
    expect(sent).not.toHaveProperty('teamId');
    expect(sent).not.toHaveProperty('createdBy');
    expect(sent).not.toHaveProperty('createdAt');
    expect(sent).not.toHaveProperty('id');
    expect(sent).toMatchObject({ name: 'Renamed', schemaVersion: 2 });
    expect(sent.updatedAt).toBeInstanceOf(Date);
  });

  it('a signed-out coach gets a plain-language error and nothing is written', async () => {
    await expect(savePlayV2(newBlankPlay('t1', doubles), '')).rejects.toMatchObject({ kind: 'signed-out' });
    expect(addDoc).not.toHaveBeenCalled();
  });

  it('permission-denied becomes a plain-language StoreError', async () => {
    vi.mocked(addDoc).mockRejectedValueOnce(firebaseError('permission-denied'));
    const err = (await savePlayV2(newBlankPlay('t1', doubles), 'coach1').catch(e => e)) as StoreError;
    expect(err).toEqual({ kind: 'permission', message: "Couldn't save: only the team's coach can edit plays." });
  });

  it('a network failure becomes a plain-language StoreError', async () => {
    vi.mocked(addDoc).mockRejectedValueOnce(firebaseError('unavailable'));
    await expect(savePlayV2(newBlankPlay('t1', doubles), 'coach1')).rejects.toMatchObject({ kind: 'network' });
  });
});

/** Runs saveTeamSettings' transaction against one stored value and records what it writes. */
function storedSettings(playbook: unknown) {
  const written: unknown[] = [];
  vi.mocked(runTransaction).mockImplementationOnce((async (_db: unknown, fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      get: async () => ({ exists: () => true, data: () => ({ name: 'Eagles', playbook }) }),
      update: (_ref: unknown, patch: unknown) => { written.push(patch); },
    })) as never);
  return written;
}
const own = (id: string, name: string) => ({ ...doubles, id: `team:${id}`, name });
const settings = (over: Partial<TeamPlaybookSettings> = {}): TeamPlaybookSettings => ({ terminology: {}, level: 'jv', formations: [], ...over });

describe('team settings from two devices', () => {
  it('keeps both devices’ terms, level and formations', async () => {
    const base = settings({ terminology: { H: 'F', Z: 'Zebra' }, formations: [own('a', 'A')] });
    const written = storedSettings(settings({ terminology: { H: 'F', Z: 'Zebra', X: 'Xray' }, level: 'varsity', formations: [own('a', 'A'), own('b', 'B')] }));
    const merged = await saveTeamSettings('t1', { ...base, terminology: { H: 'Fox' }, formations: [own('a', 'A'), own('c', 'C')] }, base);
    expect(merged).toEqual({ terminology: { H: 'Fox', X: 'Xray' }, level: 'varsity', formations: [own('a', 'A'), own('b', 'B'), own('c', 'C')] });
    expect(written).toEqual([{ playbook: JSON.parse(JSON.stringify(merged)) }]);
  });

  it('two different edits of one formation are a conflict and nothing is written', async () => {
    const base = settings({ formations: [own('a', 'A')] });
    const written = storedSettings(settings({ formations: [own('a', 'A tablet')] }));
    await expect(saveTeamSettings('t1', { ...base, formations: [own('a', 'A phone')] }, base)).rejects.toMatchObject({ kind: 'conflict' });
    expect(written).toEqual([]);
  });

  it('deleting a formation someone else edited is a conflict; deleting an unchanged one is not', async () => {
    const base = settings({ formations: [own('a', 'A')] });
    storedSettings(settings({ formations: [own('a', 'A tablet')] }));
    await expect(saveTeamSettings('t1', settings(), base)).rejects.toMatchObject({ kind: 'conflict' });
    storedSettings(base);
    expect((await saveTeamSettings('t1', settings(), base)).formations).toEqual([]);
  });

  it('a different key order in the database is not a difference', async () => {
    const base = settings({ formations: [own('a', 'A')] });
    const reordered = Object.fromEntries(Object.entries(own('a', 'A')).reverse());
    storedSettings({ ...settings(), formations: [reordered] });
    expect((await saveTeamSettings('t1', { ...base, formations: [own('a', 'A2')] }, base)).formations).toEqual([own('a', 'A2')]);
  });
});

describe('team settings', () => {
  it('loadTeamSettings defaults when the team has no playbook field', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => true, data: () => ({ name: 'Eagles' }) } as never);
    await expect(loadTeamSettings('t1')).resolves.toEqual({ terminology: {}, level: 'jv', formations: [] });
  });

  it('loadTeamSettings reads the stored playbook field', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ playbook: { terminology: { H: 'F' }, level: 'varsity', formations: [] } }),
    } as never);
    await expect(loadTeamSettings('t1')).resolves.toEqual({ terminology: { H: 'F' }, level: 'varsity', formations: [] });
  });

  it('saveTeamSettings writes only the playbook field', async () => {
    const s = { terminology: { H: 'F' }, level: 'jv' as const, formations: [] };
    const written = storedSettings(undefined);
    await saveTeamSettings('t1', s, { terminology: {}, level: 'jv', formations: [] });
    expect(written).toEqual([{ playbook: s }]);
  });

  it('a permission error on settings is plain language too', async () => {
    vi.mocked(runTransaction).mockRejectedValueOnce(firebaseError('permission-denied'));
    await expect(saveTeamSettings('t1', settings(), settings())).rejects.toMatchObject({
      kind: 'permission',
    });
  });
});
