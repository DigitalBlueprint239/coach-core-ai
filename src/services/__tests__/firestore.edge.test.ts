/**
 * Firestore Service — Edge Case Tests
 * Tests offline queue behavior, auth state, and error handling.
 */

describe('Firestore Service — offline queue edge cases', () => {
  let addToOfflineQueue: (op: any) => void;

  beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();
    vi.doMock('firebase/app', () => ({
      initializeApp: vi.fn(() => ({ name: '[DEFAULT]' })),
      getApps: vi.fn(() => []),
      getApp: vi.fn(() => ({ name: '[DEFAULT]' })),
    }));
    vi.doMock('firebase/auth', () => ({
      getAuth: vi.fn(() => ({ currentUser: null, app: {} })),
      onAuthStateChanged: vi.fn((_auth: any, cb: (u: null) => void) => { cb(null); return vi.fn(); }),
    }));
    vi.doMock('firebase/firestore', () => ({
      getFirestore: vi.fn(() => ({})),
      collection: vi.fn(),
      doc: vi.fn(),
      addDoc: vi.fn(() => Promise.resolve({ id: 'mock-id' })),
      getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
      getDoc: vi.fn(),
      updateDoc: vi.fn(() => Promise.resolve()),
      deleteDoc: vi.fn(() => Promise.resolve()),
      query: vi.fn((...a: any[]) => a[0]),
      where: vi.fn(),
      orderBy: vi.fn(),
      onSnapshot: vi.fn((_q: any, cb: (s: any) => void) => { cb({ docs: [] }); return vi.fn(); }),
      connectFirestoreEmulator: vi.fn(),
      enableNetwork: vi.fn(() => Promise.resolve()),
      disableNetwork: vi.fn(() => Promise.resolve()),
    }));
    vi.doMock('firebase/storage', () => ({ getStorage: vi.fn(() => ({})) }));
    vi.doMock('firebase/analytics', () => ({ getAnalytics: vi.fn(() => ({})) }));

    const mod = await import('../firestore');
    addToOfflineQueue = mod.addToOfflineQueue;
  });

  it('queues operation when called', () => {
    addToOfflineQueue({ type: 'create', collection: 'plays', data: { name: 'test' } });
    const stored = JSON.parse(localStorage.getItem('offline_operations') || '[]');
    expect(stored).toHaveLength(1);
  });

  it('does not duplicate operations when adding sequentially', () => {
    addToOfflineQueue({ type: 'create', collection: 'plays', data: { name: 'a' }, tempId: 'offline_1' });
    addToOfflineQueue({ type: 'create', collection: 'plays', data: { name: 'b' }, tempId: 'offline_2' });
    const stored = JSON.parse(localStorage.getItem('offline_operations') || '[]');
    expect(stored).toHaveLength(2);
    expect(stored[0].tempId).toBe('offline_1');
    expect(stored[1].tempId).toBe('offline_2');
  });

  it('queue survives page reload (persisted in localStorage)', () => {
    addToOfflineQueue({ type: 'update', collection: 'plays', docId: 'x', data: {} });
    // Simulate "page reload" by reading directly from localStorage
    const raw = localStorage.getItem('offline_operations');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].type).toBe('update');
  });

  it('preserves all operation types correctly', () => {
    addToOfflineQueue({ type: 'create', collection: 'plays', data: { name: 'new' } });
    addToOfflineQueue({ type: 'update', collection: 'plays', docId: 'abc', data: { name: 'updated' } });
    addToOfflineQueue({ type: 'delete', collection: 'plays', docId: 'def' });

    const stored = JSON.parse(localStorage.getItem('offline_operations') || '[]');
    expect(stored[0].type).toBe('create');
    expect(stored[1].type).toBe('update');
    expect(stored[1].docId).toBe('abc');
    expect(stored[2].type).toBe('delete');
    expect(stored[2].docId).toBe('def');
  });

  it('handles large number of queued operations', () => {
    for (let i = 0; i < 50; i++) {
      addToOfflineQueue({ type: 'create', collection: 'plays', data: { index: i } });
    }
    const stored = JSON.parse(localStorage.getItem('offline_operations') || '[]');
    expect(stored).toHaveLength(50);
    expect(stored[49].data.index).toBe(49);
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
