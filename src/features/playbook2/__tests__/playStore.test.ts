import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addDoc, getDoc, getDocs, updateDoc, where } from 'firebase/firestore';
import { fullLibrary } from '../../../football-core';
import { newBlankPlay } from '../playModel';
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
    await saveTeamSettings('t1', s);
    expect(vi.mocked(updateDoc).mock.calls[0][1]).toEqual({ playbook: s });
  });

  it('a permission error on settings is plain language too', async () => {
    vi.mocked(updateDoc).mockRejectedValueOnce(firebaseError('permission-denied'));
    await expect(saveTeamSettings('t1', { terminology: {}, level: 'jv', formations: [] })).rejects.toMatchObject({
      kind: 'permission',
    });
  });
});
