import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDocs, onSnapshot } from 'firebase/firestore';
import { getPlays, subscribeToPlays } from '../../../services/firestore';

const docs = [
  { id: 'v1', data: () => ({ name: 'Old Mesh', teamId: 't1' }) },
  { id: 'v2', data: () => ({ name: 'New Smash', teamId: 't1', schemaVersion: 2, coordinateProfile: 'cc-yards-v1' }) },
];

// A signed-in coach, as services/firestore.ts learns it at load.
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: { uid: 'coach1' }, app: {} })),
  onAuthStateChanged: vi.fn((_auth: unknown, cb: (u: unknown) => void) => {
    cb({ uid: 'coach1' });
    return vi.fn();
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('the version-1 Firestore play reads', () => {
  it('getPlays never returns a version-2 play', async () => {
    vi.mocked(getDocs).mockResolvedValueOnce({ docs } as never);
    expect((await getPlays('t1')).map(p => p.id)).toEqual(['v1']);
  });

  it('subscribeToPlays never delivers a version-2 play', () => {
    vi.mocked(onSnapshot).mockImplementationOnce(((_q: unknown, cb: (s: unknown) => void) => {
      cb({ docs });
      return vi.fn();
    }) as never);
    const got: string[][] = [];
    subscribeToPlays('t1', plays => got.push(plays.map(p => p.id as string)));
    expect(got).toEqual([['v1']]);
  });
});
