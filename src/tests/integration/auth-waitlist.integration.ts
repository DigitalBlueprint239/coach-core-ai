import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Firestore } from 'firebase/firestore';
import type { AuthService } from '../../services/firebase/auth-service';
import type { WaitlistService } from '../../services/waitlist/waitlist-service';

const analyticsMocks = vi.hoisted(() => ({
  trackWaitlistSignup: vi.fn(),
  trackWaitlistSignupSuccess: vi.fn(),
  trackWaitlistSignupError: vi.fn(),
  trackWaitlistConversion: vi.fn(),
  trackLogin: vi.fn(),
  trackLogout: vi.fn(),
  trackSignup: vi.fn(),
  setUserContext: vi.fn(),
  clearUserContext: vi.fn(),
}));

vi.mock('../../services/analytics/analytics-events', () => analyticsMocks);

const ga4Mocks = vi.hoisted(() => ({
  ga4Service: {
    trackSignupSubmitted: vi.fn(),
  },
}));

vi.mock('../../services/analytics/ga4-config', () => ga4Mocks);

process.env.VITE_USE_EMULATOR = 'true';


let authService: AuthService;
let waitlistService: WaitlistService;
let db: Firestore;

let deleteDoc: typeof import('firebase/firestore').deleteDoc;
let getDocs: typeof import('firebase/firestore').getDocs;
let collection: typeof import('firebase/firestore').collection;
let doc: typeof import('firebase/firestore').doc;
let getDoc: typeof import('firebase/firestore').getDoc;

const originalNavigator = globalThis.navigator;

beforeAll(async () => {
  (globalThis as any).navigator = { userAgent: 'vitest' };
  const authModule = await import('../../services/firebase/auth-service');
  const waitlistModule = await import('../../services/waitlist/waitlist-service');
  ({ doc, collection, getDocs, deleteDoc, getDoc } = await import('firebase/firestore'));
  ({ db } = await import('../../services/firebase/firebase-config'));

  authService = new authModule.AuthService();
  waitlistService = new waitlistModule.WaitlistService();
});

afterAll(() => {
  if (originalNavigator) {
    (globalThis as any).navigator = originalNavigator;
  }
});

const clearCollection = async (name: string) => {
  const snapshot = await getDocs(collection(db, name));
  await Promise.all(snapshot.docs.map((document) => deleteDoc(document.ref)));
};

beforeEach(async () => {
  await clearCollection('waitlist');
  await clearCollection('users');
  await clearCollection('teams');
  await authService.signOut().catch(() => undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('Firebase emulator integration', () => {
  it('converts waitlist entries after signup and creates user profile', async () => {
    const email = `integration-${Date.now()}@example.com`;

    const waitlistId = await waitlistService.addToWaitlist(email, { source: 'integration-test' });
    expect(waitlistId).toBeTruthy();

    const initialStatus = await authService.checkWaitlistStatus(email);
    expect(initialStatus?.converted).toBe(false);
    expect(initialStatus?.status).toBe('pending');

    const { user, profile } = await authService.signUp({
      email,
      password: 'Integration123!',
      displayName: 'Integration Tester',
      teamName: 'Integration Team',
      sport: 'football',
      ageGroup: 'adult',
      role: 'coach',
    });

    expect(user.email).toBe(email);
    expect(profile.role).toBe('coach');
    expect(profile.teams.length).toBeGreaterThanOrEqual(0);

    const waitlistStatus = await authService.checkWaitlistStatus(email);
    expect(waitlistStatus?.converted).toBe(true);
    expect(waitlistStatus?.status).toBe('converted');
    expect(waitlistStatus?.convertedUserId).toBe(user.uid);

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    expect(userDoc.exists()).toBe(true);
    const userData = userDoc.data();
    expect(userData?.email).toBe(email);
    expect(userData?.role).toBe('coach');
  });
});
