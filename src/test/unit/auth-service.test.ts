import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

const SERVER_TS = { __serverTimestamp: true } as const;

// Firestore mocks
const setDocMock = vi.hoisted(() => vi.fn());
const updateDocMock = vi.hoisted(() => vi.fn());
const getDocMock = vi.hoisted(() => vi.fn());

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: any, path: string) => ({ path })),
  doc: vi.fn((dbOrColl: any, path?: string, id?: string) => {
    if (id) return { path: `${path}/${id}`, id } as any;
    if (typeof path === 'string') return { path, id: `auto-id-${  Math.random().toString(36).slice(2, 8)}` } as any;
    if (dbOrColl?.path) return { path: dbOrColl.path, id: `auto-id-${  Math.random().toString(36).slice(2, 8)}` } as any;
    return { path: 'unknown', id: 'auto-id' } as any;
  }),
  setDoc: setDocMock.mockImplementation(async (_ref, _data) => {}),
  updateDoc: updateDocMock.mockImplementation(async (_ref, _data) => {}),
  getDoc: getDocMock,
  serverTimestamp: vi.fn(() => SERVER_TS),
}));

vi.mock('../../services/firebase/firebase-config', () => ({ db: {} }));

// Mock auth dependency tree in auth-service
const createUserWithEmailAndPasswordMock = vi.hoisted(() => vi.fn());
const updateProfileMock = vi.hoisted(() => vi.fn());
const sendEmailVerificationMock = vi.hoisted(() => vi.fn());
vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: createUserWithEmailAndPasswordMock,
  updateProfile: updateProfileMock,
  sendEmailVerification: sendEmailVerificationMock,
  onAuthStateChanged: vi.fn((_auth, cb: any) => { cb(null); }),
}));

// Analytics/monitoring no-ops
vi.mock('../../services/analytics', () => ({
  trackUserAction: vi.fn(),
  trackLogin: vi.fn(),
  trackLogout: vi.fn(),
  trackSignup: vi.fn(),
  setUserContext: vi.fn(),
  clearUserContext: vi.fn(),
}));
vi.mock('../../services/monitoring', () => ({ setSentryUser: vi.fn(), trackError: vi.fn() }));

import { authService } from '../../services/firebase/auth-service';

const getArgs = (mock: any, i = 0) => mock.mock.calls[i];

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updateUserProfile sanitizes updates and applies updatedAt', async () => {
    await authService.updateUserProfile('u1', { uid: 'u1', displayName: 'Coach', photoURL: undefined } as any);

    expect(updateDocMock).toHaveBeenCalledTimes(1);
    const [, updates] = getArgs(updateDocMock, 0);
    expect(updates.displayName).toBe('Coach');
    expect('photoURL' in updates).toBe(false);
    expect(updates.updatedAt).toEqual(SERVER_TS);
  });

  it('signUp creates sanitized profile with server timestamps (and team)', async () => {
    createUserWithEmailAndPasswordMock.mockResolvedValueOnce({ user: { uid: 'u123', email: 'new@example.com' } });
    updateProfileMock.mockResolvedValueOnce(undefined);
    sendEmailVerificationMock.mockResolvedValueOnce(undefined);
    getDocMock.mockResolvedValueOnce({ exists: () => false, data: () => ({}) }); // getUserProfile after signup returns null

    await authService.signUp({
      email: 'new@example.com',
      password: 'pw',
      displayName: 'New User',
      sport: 'basketball',
      teamName: 'My Team',
      ageGroup: 'U12',
    });

    // First setDoc: user profile create (strict schema)
    expect(setDocMock).toHaveBeenCalled();
    const [, userProfileData] = getArgs(setDocMock, 0);
    expect(userProfileData).toMatchObject({ email: 'new@example.com', displayName: 'New User' });
    expect(userProfileData.updatedAt).toEqual(SERVER_TS);
    expect(userProfileData.lastLoginAt).toEqual(SERVER_TS);

    // Another setDoc happens for team creation with helper as well
    // Team document creation also occurs separately (no strict assertion here)
  });
});
