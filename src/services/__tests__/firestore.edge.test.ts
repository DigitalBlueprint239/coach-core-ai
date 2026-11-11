/**
 * Firestore Service — Edge Case Tests
 * Tests offline queue behavior, auth state, and error handling.
 */

describe('Firestore Service — offline queue edge cases', () => {
  let addToOfflineQueue: (op: any) => void;

  beforeEach(() => {
    localStorage.clear();
    jest.resetModules();
    jest.mock('firebase/app', () => ({
      initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
      getApps: jest.fn(() => []),
      getApp: jest.fn(() => ({ name: '[DEFAULT]' })),
    }));
    jest.mock('firebase/auth', () => ({
      getAuth: jest.fn(() => ({ currentUser: null, app: {} })),
      onAuthStateChanged: jest.fn((_auth: any, cb: (u: null) => void) => { cb(null); return jest.fn(); }),
    }));
    jest.mock('firebase/firestore', () => ({
      getFirestore: jest.fn(() => ({})),
      collection: jest.fn(),
      doc: jest.fn(),
      addDoc: jest.fn(() => Promise.resolve({ id: 'mock-id' })),
      getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
      getDoc: jest.fn(),
      updateDoc: jest.fn(() => Promise.resolve()),
      deleteDoc: jest.fn(() => Promise.resolve()),
      query: jest.fn((...a: any[]) => a[0]),
      where: jest.fn(),
      orderBy: jest.fn(),
      onSnapshot: jest.fn((_q: any, cb: (s: any) => void) => { cb({ docs: [] }); return jest.fn(); }),
      connectFirestoreEmulator: jest.fn(),
      enableNetwork: jest.fn(() => Promise.resolve()),
      disableNetwork: jest.fn(() => Promise.resolve()),
    }));
    jest.mock('firebase/storage', () => ({ getStorage: jest.fn(() => ({})) }));
    jest.mock('firebase/analytics', () => ({ getAnalytics: jest.fn(() => ({})) }));

    const mod = require('../firestore');
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

  beforeEach(() => {
    jest.resetModules();
    jest.mock('firebase/app', () => ({
      initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
      getApps: jest.fn(() => []),
      getApp: jest.fn(() => ({ name: '[DEFAULT]' })),
    }));
    jest.mock('firebase/auth', () => ({
      getAuth: jest.fn(() => ({ currentUser: null })),
      onAuthStateChanged: jest.fn((_auth: any, cb: (u: null) => void) => { cb(null); return jest.fn(); }),
    }));
    jest.mock('firebase/firestore', () => ({
      getFirestore: jest.fn(() => ({})),
      collection: jest.fn(),
      doc: jest.fn(),
      addDoc: jest.fn(() => Promise.resolve({ id: 'id' })),
      getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
      getDoc: jest.fn(),
      updateDoc: jest.fn(() => Promise.resolve()),
      deleteDoc: jest.fn(() => Promise.resolve()),
      query: jest.fn((...a: any[]) => a[0]),
      where: jest.fn(),
      orderBy: jest.fn(),
      onSnapshot: jest.fn((_q: any, cb: (s: any) => void) => { cb({ docs: [] }); return jest.fn(); }),
      connectFirestoreEmulator: jest.fn(),
      enableNetwork: jest.fn(),
      disableNetwork: jest.fn(),
    }));
    jest.mock('firebase/storage', () => ({ getStorage: jest.fn(() => ({})) }));
    jest.mock('firebase/analytics', () => ({ getAnalytics: jest.fn(() => ({})) }));

    const mod = require('../firestore');
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
    const mod = require('../firestore');
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
    const mod = require('../firestore');
    await expect(mod.getPlays('team1')).rejects.toThrow('No authenticated user');
  });
});

describe('Firestore Service — subscription functions', () => {
  let mod: any;

  beforeEach(() => {
    jest.resetModules();
    jest.mock('firebase/app', () => ({
      initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
      getApps: jest.fn(() => []),
      getApp: jest.fn(() => ({ name: '[DEFAULT]' })),
    }));
    jest.mock('firebase/auth', () => ({
      getAuth: jest.fn(() => ({ currentUser: null })),
      onAuthStateChanged: jest.fn((_auth: any, cb: (u: null) => void) => { cb(null); return jest.fn(); }),
    }));
    jest.mock('firebase/firestore', () => {
      const mockUnsub = jest.fn();
      return {
        getFirestore: jest.fn(() => ({})),
        collection: jest.fn((_db: any, name: string) => ({ name })),
        doc: jest.fn(),
        addDoc: jest.fn(() => Promise.resolve({ id: 'id' })),
        getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
        getDoc: jest.fn(),
        updateDoc: jest.fn(() => Promise.resolve()),
        deleteDoc: jest.fn(() => Promise.resolve()),
        query: jest.fn((...a: any[]) => a[0]),
        where: jest.fn(),
        orderBy: jest.fn(),
        onSnapshot: jest.fn((_q: any, cb: (s: any) => void) => {
          cb({ docs: [{ id: 'doc1', data: () => ({ name: 'P1', teamId: 't1' }) }] });
          return mockUnsub;
        }),
        connectFirestoreEmulator: jest.fn(),
        enableNetwork: jest.fn(),
        disableNetwork: jest.fn(),
      };
    });
    jest.mock('firebase/storage', () => ({ getStorage: jest.fn(() => ({})) }));
    jest.mock('firebase/analytics', () => ({ getAnalytics: jest.fn(() => ({})) }));

    mod = require('../firestore');
  });

  it('subscribeToPracticePlans returns an unsubscribe function', () => {
    const unsub = mod.subscribeToPracticePlans('team1', jest.fn());
    expect(typeof unsub).toBe('function');
  });

  it('subscribeToPlays calls callback with initial data', () => {
    const callback = jest.fn();
    mod.subscribeToPlays('team1', callback);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'doc1' })
      ])
    );
  });
});
