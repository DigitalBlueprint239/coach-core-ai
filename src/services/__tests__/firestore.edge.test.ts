/**
 * Firestore Service — Edge Case Tests
 * Tests offline queue behavior, auth state, and error handling.
 */

describe('Firestore Service — privacy and legacy queue edge cases', () => {
  beforeEach(() => { localStorage.clear(); });
  it('will not accept cross-user replay instructions', async () => {
    const { addToOfflineQueue } = await import('../firestore');
    expect(() => addToOfflineQueue({ type: 'update', collection: 'practicePlans',
      docId: 'other-user', data: { teamId: 'other-team', name: 'hijacked' } })).toThrow(/disabled/i);
  });
  it('leaves historical unsynced entries untouched until owner/coach authorizes cleanup', async () => {
    const historical = '[{"type":"create","collection":"practicePlans","data":{"notes":"legacy"}}]';
    localStorage.setItem('offline_operations', historical);
    const mod = await import('../firestore');
    expect(mod.hasQuarantinedLegacyOfflineOperations()).toBe(true);
    window.dispatchEvent(new Event('online'));
    expect(localStorage.getItem('offline_operations')).toBe(historical);
  });
});

describe('Firestore Service — auth edge cases', () => {
  let getCurrentUser: () => any;
  let waitForAuth: () => Promise<any>;

  beforeEach(async () => {
    vi.resetModules();
    vi.doMock('firebase/app', () => ({
      initializeApp: vi.fn(() => ({ name: '[DEFAULT]' })),
      getApps: vi.fn(() => []),
      getApp: vi.fn(() => ({ name: '[DEFAULT]' })),
    }));
    vi.doMock('firebase/auth', () => ({
      getAuth: vi.fn(() => ({ currentUser: null })),
      onAuthStateChanged: vi.fn((_auth: any, cb: (u: null) => void) => { cb(null); return vi.fn(); }),
    }));
    vi.doMock('firebase/firestore', () => ({
      getFirestore: vi.fn(() => ({})),
      collection: vi.fn(),
      doc: vi.fn(),
      addDoc: vi.fn(() => Promise.resolve({ id: 'id' })),
      getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
      getDoc: vi.fn(),
      updateDoc: vi.fn(() => Promise.resolve()),
      deleteDoc: vi.fn(() => Promise.resolve()),
      query: vi.fn((...a: any[]) => a[0]),
      where: vi.fn(),
      orderBy: vi.fn(),
      onSnapshot: vi.fn((_q: any, cb: (s: any) => void) => { cb({ docs: [] }); return vi.fn(); }),
      connectFirestoreEmulator: vi.fn(),
      enableNetwork: vi.fn(),
      disableNetwork: vi.fn(),
    }));
    vi.doMock('firebase/storage', () => ({ getStorage: vi.fn(() => ({})) }));
    vi.doMock('firebase/analytics', () => ({ getAnalytics: vi.fn(() => ({})) }));

    const mod = await import('../firestore');
    getCurrentUser = mod.getCurrentUser;
    waitForAuth = mod.waitForAuth;
  });

  it('getCurrentUser throws when no user is authenticated', () => {
    expect(() => getCurrentUser()).toThrow('No authenticated user found');
  });

  it('waitForAuth resolves with null when no user logged in', async () => {
    const user = await waitForAuth();
    expect(user).toBeNull();
  });

  it('CRUD functions require authentication', async () => {
    const mod = await import('../firestore');
    await expect(mod.savePracticePlan('team1', {
      name: 'Test',
      date: '2024-01-01',
      duration: 60,
      periods: [],
      goals: [],
      notes: '',
    })).rejects.toThrow('No authenticated user');
  });

  it('getPlays rejects without auth', async () => {
    const mod = await import('../firestore');
    await expect(mod.getPlays('team1')).rejects.toThrow('No authenticated user');
  });
});

describe('Firestore Service — subscription functions', () => {
  let mod: any;

  beforeEach(async () => {
    vi.resetModules();
    vi.doMock('firebase/app', () => ({
      initializeApp: vi.fn(() => ({ name: '[DEFAULT]' })),
      getApps: vi.fn(() => []),
      getApp: vi.fn(() => ({ name: '[DEFAULT]' })),
    }));
    vi.doMock('firebase/auth', () => ({
      getAuth: vi.fn(() => ({ currentUser: null })),
      onAuthStateChanged: vi.fn((_auth: any, cb: (u: null) => void) => { cb(null); return vi.fn(); }),
    }));
    vi.doMock('firebase/firestore', () => {
      const mockUnsub = vi.fn();
      return {
        getFirestore: vi.fn(() => ({})),
        collection: vi.fn((_db: any, name: string) => ({ name })),
        doc: vi.fn(),
        addDoc: vi.fn(() => Promise.resolve({ id: 'id' })),
        getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
        getDoc: vi.fn(),
        updateDoc: vi.fn(() => Promise.resolve()),
        deleteDoc: vi.fn(() => Promise.resolve()),
        query: vi.fn((...a: any[]) => a[0]),
        where: vi.fn(),
        orderBy: vi.fn(),
        onSnapshot: vi.fn((_q: any, cb: (s: any) => void) => {
          cb({ docs: [{ id: 'doc1', data: () => ({ name: 'P1', teamId: 't1' }) }] });
          return mockUnsub;
        }),
        connectFirestoreEmulator: vi.fn(),
        enableNetwork: vi.fn(),
        disableNetwork: vi.fn(),
      };
    });
    vi.doMock('firebase/storage', () => ({ getStorage: vi.fn(() => ({})) }));
    vi.doMock('firebase/analytics', () => ({ getAnalytics: vi.fn(() => ({})) }));

    mod = await import('../firestore');
  });

  it('subscribeToPracticePlans returns an unsubscribe function', () => {
    const unsub = mod.subscribeToPracticePlans('team1', vi.fn());
    expect(typeof unsub).toBe('function');
  });

  it('subscribeToPlays calls callback with initial data', () => {
    const callback = vi.fn();
    mod.subscribeToPlays('team1', callback);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'doc1' })
      ])
    );
  });
});
