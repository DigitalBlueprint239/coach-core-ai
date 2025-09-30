import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const firestoreData = new Map<string, any>();
  let waitlistDocs: Array<{ id: string; data: Record<string, any>; path: string }> = [];

  return {
    authState: { currentUser: null as any },
    firestoreData,
    getWaitlistDocs: () => waitlistDocs,
    setWaitlistDocs: (docs: Array<{ id: string; data: Record<string, any>; path: string }>) => {
      waitlistDocs = docs;
    },
    resetFirestore: () => {
      firestoreData.clear();
      waitlistDocs = [];
    },
    mockCreateUser: vi.fn(),
    mockSignIn: vi.fn(),
    mockSignOut: vi.fn(),
    mockSendReset: vi.fn(),
    mockSendVerification: vi.fn(),
    mockUpdateProfile: vi.fn(),
    mockSignInWithPopup: vi.fn(),
  };
});

const analyticsMocks = vi.hoisted(() => ({
  trackLogin: vi.fn(),
  trackLogout: vi.fn(),
  trackSignup: vi.fn(),
  setUserContext: vi.fn(),
  clearUserContext: vi.fn(),
  trackWaitlistSignup: vi.fn(),
  trackWaitlistSignupSuccess: vi.fn(),
  trackWaitlistSignupError: vi.fn(),
  trackWaitlistConversion: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  getAuth: () => mocks.authState,
  createUserWithEmailAndPassword: mocks.mockCreateUser,
  signInWithEmailAndPassword: mocks.mockSignIn,
  signOut: mocks.mockSignOut,
  sendPasswordResetEmail: mocks.mockSendReset,
  sendEmailVerification: mocks.mockSendVerification,
  updateProfile: mocks.mockUpdateProfile,
  onAuthStateChanged: (_auth: unknown, callback: (user: any) => void) => {
    callback(mocks.authState.currentUser);
    return vi.fn();
  },
  GoogleAuthProvider: class {},
  signInWithPopup: mocks.mockSignInWithPopup,
  __setCurrentUser: (user: any) => {
    mocks.authState.currentUser = user;
  },
  __reset: () => {
    mocks.authState.currentUser = null;
  },
}));

const buildPath = (collectionName: string, id: string) => `${collectionName}/${id}`;

vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, collectionName: string, docId?: string) => {
    const id = docId ?? `doc_${Math.random().toString(36).slice(2, 10)}`;
    return {
      id,
      path: buildPath(collectionName, id),
      collection: collectionName,
    };
  },
  collection: (_db: unknown, collectionName: string) => ({
    path: collectionName,
  }),
  addDoc: vi.fn(async (collectionRef: { path: string }, data: Record<string, any>) => {
    const id = `doc_${Math.random().toString(36).slice(2, 10)}`;
    const path = buildPath(collectionRef.path, id);
    mocks.firestoreData.set(path, data);
    return { id, path };
  }),
  setDoc: vi.fn(async (docRef: { path: string }, data: Record<string, any>) => {
    mocks.firestoreData.set(docRef.path, data);
  }),
  getDoc: vi.fn(async (docRef: { path: string }) => {
    const data = mocks.firestoreData.get(docRef.path);
    return {
      exists: () => data !== undefined,
      data: () => data,
    };
  }),
  updateDoc: vi.fn(async (docRef: { path: string }, data: Record<string, any>) => {
    const existing = mocks.firestoreData.get(docRef.path) || {};
    mocks.firestoreData.set(docRef.path, { ...existing, ...data });
  }),
  getDocs: vi.fn(async () => {
    const docs = mocks.getWaitlistDocs();
    return {
      empty: docs.length === 0,
      docs: docs.map(doc => ({
        id: doc.id,
        data: () => doc.data,
        ref: { path: doc.path, id: doc.id },
      })),
    };
  }),
  serverTimestamp: () => new Date('2024-01-01T00:00:00Z'),
  query: vi.fn(),
  where: vi.fn(),
}));

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({})),
  connectStorageEmulator: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  connectFunctionsEmulator: vi.fn(),
}));

vi.mock('../services/firebase/firebase-config', () => ({
  auth: mocks.authState,
  db: {},
  functions: {},
  storage: {},
}));

vi.mock('../services/analytics/analytics-events', () => analyticsMocks);

vi.mock('../services/analytics/ga4-config', () => ({
  ga4Service: {
    trackSignupSubmitted: vi.fn(),
  },
}));

vi.mock('../services/monitoring/monitoring-lite', () => ({
  trackUserAction: vi.fn(),
  setSentryUser: vi.fn(),
  trackError: vi.fn(),
}));

vi.mock('../utils/firestore-sanitization', () => ({
  createFirestoreHelper: () => ({
    prepareCreate: (data: Record<string, any>) => ({ data, isValid: true, warnings: [] as string[] }),
    prepareUpdate: (data: Record<string, any>) => ({ data, isValid: true, warnings: [] as string[] }),
    logResult: vi.fn(),
  }),
}));

import { AuthService, getDefaultPermissionsForRole } from '../services/firebase/auth-service';
import * as firebaseAuth from 'firebase/auth';

const createMockUser = (overrides: Partial<{ uid: string; email: string; displayName: string; emailVerified: boolean }>) => ({
  uid: overrides.uid ?? `user_${Math.random().toString(36).slice(2, 8)}`,
  email: overrides.email ?? 'test@coachcore.ai',
  displayName: overrides.displayName ?? 'Test User',
  emailVerified: overrides.emailVerified ?? false,
  photoURL: null,
});

describe('AuthService flows', () => {
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resetFirestore();
    (firebaseAuth as any).__reset();
    service = new AuthService();
    (firebaseAuth as any).__setCurrentUser(null);
  });

  const mockSuccessfulSignup = (userOverrides: Parameters<typeof createMockUser>[0]) => {
    const user = createMockUser(userOverrides);
    mocks.mockCreateUser.mockResolvedValueOnce({ user });
    mocks.mockUpdateProfile.mockResolvedValue(undefined);
    mocks.mockSendVerification.mockResolvedValue(undefined);
    return user;
  };

  it('creates role-aware profiles for email signup', async () => {
    const roles: Array<Parameters<typeof getDefaultPermissionsForRole>[0]> = [
      'client',
      'assistant-coach',
      'head-coach',
      'team-admin',
      'admin',
    ];

    for (const role of roles) {
      const user = mockSuccessfulSignup({ email: `${role}@example.com` });
      const result = await service.signUp({
        email: user.email!,
        password: 'password123',
        displayName: `User ${role}`,
        teamName: 'Test Team',
        sport: 'football',
        ageGroup: 'adult',
        role,
      });

      expect(result.profile.role).toBe(role);
      expect(result.profile.permissions).toEqual(getDefaultPermissionsForRole(role));
    }
  });

  it('signs in with email and updates auth context', async () => {
    const user = mockSuccessfulSignup({ email: 'signin@example.com', emailVerified: true });
    await service.signUp({
      email: user.email!,
      password: 'password123',
      displayName: user.displayName!,
      teamName: 'Sign In Team',
      sport: 'football',
      ageGroup: 'adult',
      role: 'coach',
    });

    const storedProfile = mocks.firestoreData.get(`users/${user.uid}`);
    expect(storedProfile).toBeDefined();

    mocks.mockSignIn.mockResolvedValueOnce({ user });
    vi.spyOn(service as any, 'getUserProfile').mockResolvedValue(storedProfile);
    vi.spyOn(service as any, 'updateLastLogin').mockResolvedValue(undefined);

    const { user: signedInUser, profile } = await service.signIn(user.email!, 'password123');
    expect(signedInUser.uid).toBe(user.uid);
    expect(profile.email).toBe(user.email);
    expect(mocks.mockSignIn).toHaveBeenCalledWith(expect.anything(), user.email, 'password123');
  });

  it('sends password reset emails', async () => {
    await service.sendPasswordResetEmail('reset@example.com');
    expect(mocks.mockSendReset).toHaveBeenCalledWith(expect.anything(), 'reset@example.com');
  });

  it('sends verification email for authenticated users', async () => {
    const currentUser = createMockUser({ email: 'verify@example.com' });
    (firebaseAuth as any).__setCurrentUser(currentUser);
    await service.sendEmailVerification();
    expect(mocks.mockSendVerification).toHaveBeenCalledWith(currentUser);
  });

  it('converts waitlist users upon signup', async () => {
    const waitlistEntryPath = 'waitlist/w1';
    mocks.setWaitlistDocs([
      {
        id: 'w1',
        path: waitlistEntryPath,
        data: { email: 'waitlist@example.com' },
      },
    ]);

    const user = mockSuccessfulSignup({ email: 'waitlist@example.com' });
    await service.signUp({
      email: user.email!,
      password: 'password123',
      displayName: 'Waitlist User',
      teamName: 'Converted Team',
      sport: 'football',
      ageGroup: 'adult',
      role: 'coach',
    });

    const updatedWaitlistDoc = mocks.firestoreData.get(waitlistEntryPath);
    expect(updatedWaitlistDoc?.converted).toBe(true);
  });

  it('checks waitlist status for existing entries', async () => {
    mocks.setWaitlistDocs([
      {
        id: 'w2',
        path: 'waitlist/w2',
        data: {
          email: 'status@example.com',
          status: 'pending',
          timestamp: new Date('2024-01-01T00:00:00Z'),
        },
      },
    ]);

    const status = await service.checkWaitlistStatus('status@example.com');
    expect(status).not.toBeNull();
    expect(status?.status).toBe('pending');
  });
});
