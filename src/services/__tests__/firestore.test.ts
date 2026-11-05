/**
 * Firestore Service Tests
 * Tests the offline queue, CRUD operations, and error handling in firestore.ts
 */

// Firebase modules are mocked globally in setupTests.ts

/** Security regressions: unscoped legacy queue never stores new data or replays. */
describe('Firestore service — disabled unscoped offline queue', () => {
  beforeEach(() => { localStorage.clear(); });
  it('rejects manual enqueue without storing plaintext in the browser', async () => {
    const { addToOfflineQueue } = await import('../firestore');
    expect(() => addToOfflineQueue({ type: 'create', collection: 'plays', data: { teamId: 't1', notes: 'PRIVATE' } }))
      .toThrow(/offline queue disabled/i);
    expect(localStorage.getItem('offline_operations')).toBeNull();
  });
  it('quarantines preexisting legacy data without exposing it to replay', async () => {
    localStorage.setItem('offline_operations', JSON.stringify([{ type: 'delete', collection: 'plays', docId: 'other-coach' }]));
    const mod = await import('../firestore');
    expect(mod.hasQuarantinedLegacyOfflineOperations()).toBe(true);
    window.dispatchEvent(new Event('online'));
    expect(localStorage.getItem('offline_operations')).toContain('other-coach');
  });
  it('removes legacy data only after an explicit cleanup call', async () => {
    localStorage.setItem('offline_operations', '{"private":"old draft"}');
    const mod = await import('../firestore');
    expect(mod.hasQuarantinedLegacyOfflineOperations()).toBe(true);
    mod.discardQuarantinedLegacyOfflineOperations();
    expect(mod.hasQuarantinedLegacyOfflineOperations()).toBe(false);
  });
});

describe('Firestore Service — exports', () => {
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
    vi.doMock('firebase/firestore', () => ({
      getFirestore: vi.fn(() => ({})),
      collection: vi.fn((_db: any, name: string) => ({ name })),
      doc: vi.fn(),
      addDoc: vi.fn(() => Promise.resolve({ id: 'new-doc-id' })),
      getDocs: vi.fn(() => Promise.resolve({
        docs: [
          { id: 'doc1', data: () => ({ name: 'Test Plan', teamId: 'team1' }) },
        ]
      })),
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

    mod = await import('../firestore');
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
