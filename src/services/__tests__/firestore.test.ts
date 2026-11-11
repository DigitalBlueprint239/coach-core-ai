/**
 * Firestore Service Tests
 * Tests the offline queue, CRUD operations, and error handling in firestore.ts
 */

// Firebase modules are mocked globally in setupTests.ts

describe('Firestore Service — addToOfflineQueue', () => {
  let addToOfflineQueue: (op: any) => void;

  beforeEach(() => {
    // Reset localStorage before each test
    localStorage.clear();
    // Re-import to get fresh module state
    jest.resetModules();
    // Re-apply firebase mocks after reset
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

  it('exports addToOfflineQueue as a function', () => {
    expect(typeof addToOfflineQueue).toBe('function');
  });

  it('persists operation to localStorage', () => {
    addToOfflineQueue({ type: 'create', collection: 'plays', data: { name: 'test' } });
    const stored = JSON.parse(localStorage.getItem('offline_operations') || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].type).toBe('create');
    expect(stored[0].collection).toBe('plays');
  });

  it('accumulates multiple operations', () => {
    addToOfflineQueue({ type: 'create', collection: 'plays', data: {} });
    addToOfflineQueue({ type: 'update', collection: 'plays', docId: '123', data: {} });
    addToOfflineQueue({ type: 'delete', collection: 'plays', docId: '456' });

    const stored = JSON.parse(localStorage.getItem('offline_operations') || '[]');
    expect(stored).toHaveLength(3);
    expect(stored[0].type).toBe('create');
    expect(stored[1].type).toBe('update');
    expect(stored[2].type).toBe('delete');
  });

  it('preserves operation data including tempId', () => {
    const op = { type: 'create', collection: 'practicePlans', data: { name: 'plan' }, tempId: 'offline_123' };
    addToOfflineQueue(op);
    const stored = JSON.parse(localStorage.getItem('offline_operations') || '[]');
    expect(stored[0].tempId).toBe('offline_123');
  });

  it('preserves all operation fields for delete', () => {
    addToOfflineQueue({ type: 'delete', collection: 'plays', docId: 'play-id-789' });
    const stored = JSON.parse(localStorage.getItem('offline_operations') || '[]');
    expect(stored[0].docId).toBe('play-id-789');
  });
});

describe('Firestore Service — exports', () => {
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
    jest.mock('firebase/firestore', () => ({
      getFirestore: jest.fn(() => ({})),
      collection: jest.fn((_db: any, name: string) => ({ name })),
      doc: jest.fn(),
      addDoc: jest.fn(() => Promise.resolve({ id: 'new-doc-id' })),
      getDocs: jest.fn(() => Promise.resolve({
        docs: [
          { id: 'doc1', data: () => ({ name: 'Test Plan', teamId: 'team1' }) },
        ]
      })),
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

    mod = require('../firestore');
  });

  it('exports savePracticePlan function', () => {
    expect(typeof mod.savePracticePlan).toBe('function');
  });

  it('exports getPracticePlans function', () => {
    expect(typeof mod.getPracticePlans).toBe('function');
  });

  it('exports updatePracticePlan function', () => {
    expect(typeof mod.updatePracticePlan).toBe('function');
  });

  it('exports deletePracticePlan function', () => {
    expect(typeof mod.deletePracticePlan).toBe('function');
  });

  it('exports savePlay function', () => {
    expect(typeof mod.savePlay).toBe('function');
  });

  it('exports getPlays function', () => {
    expect(typeof mod.getPlays).toBe('function');
  });

  it('exports updatePlay function', () => {
    expect(typeof mod.updatePlay).toBe('function');
  });

  it('exports deletePlay function', () => {
    expect(typeof mod.deletePlay).toBe('function');
  });

  it('exports subscribeToPlays function', () => {
    expect(typeof mod.subscribeToPlays).toBe('function');
  });

  it('exports subscribeToPracticePlans function', () => {
    expect(typeof mod.subscribeToPracticePlans).toBe('function');
  });

  it('exports getCurrentUser function', () => {
    expect(typeof mod.getCurrentUser).toBe('function');
  });

  it('exports waitForAuth function', () => {
    expect(typeof mod.waitForAuth).toBe('function');
  });

  it('getCurrentUser throws when no user is authenticated', () => {
    expect(() => mod.getCurrentUser()).toThrow('No authenticated user found');
  });
});
