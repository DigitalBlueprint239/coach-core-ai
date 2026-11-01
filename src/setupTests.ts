import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock firebase/app
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: '[DEFAULT]' })),
  getApps: vi.fn(() => []),
  getApp: vi.fn(() => ({ name: '[DEFAULT]' })),
}));

// Mock firebase/auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null, app: {} })),
  onAuthStateChanged: vi.fn((_auth: any, callback: (user: null) => void) => {
    callback(null);
    return vi.fn(); // unsubscribe
  }),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  connectAuthEmulator: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
}));

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn((_db: any, path: string) => ({ path })),
  doc: vi.fn((_db: any, path: string, id: string) => ({ path, id })),
  addDoc: vi.fn(() => Promise.resolve({ id: 'mock-doc-id' })),
  getDocs: vi.fn(() => Promise.resolve({ docs: [], forEach: vi.fn() })),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => null, id: 'mock-id' })),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  query: vi.fn((...args: any[]) => args[0]),
  where: vi.fn((_field: string, _op: string, _val: any) => ({})),
  orderBy: vi.fn((_field: string) => ({})),
  onSnapshot: vi.fn((_q: any, callback: (snap: any) => void) => {
    callback({ docs: [] });
    return vi.fn(); // unsubscribe
  }),
  connectFirestoreEmulator: vi.fn(),
  enableNetwork: vi.fn(() => Promise.resolve()),
  disableNetwork: vi.fn(() => Promise.resolve()),
}));

// Mock firebase/storage
vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({})),
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}));

// Mock firebase/analytics
vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(() => ({})),
  logEvent: vi.fn(),
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
