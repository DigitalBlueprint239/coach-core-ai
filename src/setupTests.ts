import '@testing-library/jest-dom';

// Mock firebase/app
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({ name: '[DEFAULT]' })),
}));

// Mock firebase/auth
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ currentUser: null, app: {} })),
  onAuthStateChanged: jest.fn((_auth: any, callback: (user: null) => void) => {
    callback(null);
    return jest.fn(); // unsubscribe
  }),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  connectAuthEmulator: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  signInWithPopup: jest.fn(),
}));

// Mock firebase/firestore
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn((_db: any, path: string) => ({ path })),
  doc: jest.fn((_db: any, path: string, id: string) => ({ path, id })),
  addDoc: jest.fn(() => Promise.resolve({ id: 'mock-doc-id' })),
  getDocs: jest.fn(() => Promise.resolve({ docs: [], forEach: jest.fn() })),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false, data: () => null, id: 'mock-id' })),
  updateDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  query: jest.fn((...args: any[]) => args[0]),
  where: jest.fn((_field: string, _op: string, _val: any) => ({})),
  orderBy: jest.fn((_field: string) => ({})),
  onSnapshot: jest.fn((_q: any, callback: (snap: any) => void) => {
    callback({ docs: [] });
    return jest.fn(); // unsubscribe
  }),
  connectFirestoreEmulator: jest.fn(),
  enableNetwork: jest.fn(() => Promise.resolve()),
  disableNetwork: jest.fn(() => Promise.resolve()),
}));

// Mock firebase/storage
jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({})),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

// Mock firebase/analytics
jest.mock('firebase/analytics', () => ({
  getAnalytics: jest.fn(() => ({})),
  logEvent: jest.fn(),
}));

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  configurable: true,
  get: () => true,
});

// Mock window.addEventListener for online/offline events (already defined in jsdom)

// Mock AbortSignal.timeout (not available in JSDOM / older environments)
if (typeof AbortSignal !== 'undefined' && !AbortSignal.timeout) {
  Object.defineProperty(AbortSignal, 'timeout', {
    value: (_ms: number) => new AbortController().signal,
    writable: true,
  });
}
