import '@testing-library/jest-dom';

// Mock window.matchMedia for JSDOM (used by PWAInstallPrompt)
// This must be set before any React components import
window.matchMedia = jest.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
})) as any;

// Mock Notification API for JSDOM
(window as any).Notification = {
  permission: 'default',
  requestPermission: jest.fn().mockResolvedValue('default'),
};

// Mock Firebase before any component imports
jest.mock('./firebase', () => ({
  auth: {
    onAuthStateChanged: (_callback: any) => () => {},
    currentUser: null,
  },
  db: {},
  storage: {},
  analytics: undefined,
  app: {},
}));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: any, _callback: any) => () => {},
  getAuth: () => ({}),
  setPersistence: () => Promise.resolve(),
  browserLocalPersistence: {},
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signInWithPopup: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  signOut: jest.fn(),
  connectAuthEmulator: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  doc: jest.fn(),
  collection: jest.fn(),
  addDoc: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(() => () => {}),
  connectFirestoreEmulator: jest.fn(),
  enableNetwork: jest.fn(),
  disableNetwork: jest.fn(),
}));

jest.mock('firebase/storage', () => ({
  getStorage: () => ({}),
}));

jest.mock('firebase/analytics', () => ({
  getAnalytics: () => ({}),
}));

jest.mock('firebase/app', () => ({
  initializeApp: () => ({ name: 'test' }),
  getApps: () => [],
  getApp: () => ({ name: 'test' }),
}));
