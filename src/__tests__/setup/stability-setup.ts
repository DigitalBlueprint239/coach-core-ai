import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock Firebase
vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendEmailVerification: vi.fn(),
  updateProfile: vi.fn(),
  onAuthStateChanged: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
}));

vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(),
  logEvent: vi.fn(),
  setUserId: vi.fn(),
  setUserProperties: vi.fn(),
}));

// Mock Firebase config
vi.mock('../services/firebase/firebase-config', () => ({
  auth: {},
  db: {},
  analytics: {},
}));

// Mock Sentry
vi.mock('@sentry/react', () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  setUser: vi.fn(),
  setContext: vi.fn(),
  setTag: vi.fn(),
}));

// Mock analytics
vi.mock('../services/analytics/analytics-events', () => ({
  trackFunnel: vi.fn(),
  trackUserAction: vi.fn(),
  trackLogin: vi.fn(),
  trackLogout: vi.fn(),
  trackSignup: vi.fn(),
  setUserContext: vi.fn(),
  clearUserContext: vi.fn(),
}));

// Mock monitoring
vi.mock('../services/monitoring', () => ({
  trackUserAction: vi.fn(),
  setSentryUser: vi.fn(),
  trackError: vi.fn(),
  initMonitoring: vi.fn(),
}));

// Mock firestore sanitization
vi.mock('../utils/firestore-sanitization', () => ({
  createFirestoreHelper: vi.fn(() => ({
    prepareCreate: vi.fn(() => ({ data: {}, isValid: true, warnings: [] })),
    prepareUpdate: vi.fn(() => ({ data: {}, isValid: true, warnings: [] })),
    logResult: vi.fn(),
  })),
}));

// Mock secure logger
vi.mock('../utils/secure-logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
});

// Mock URLSearchParams
const mockSearchParams = new Map();
vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key) => mockSearchParams.get(key));

// Mock navigator
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (compatible; Test Browser)',
  writable: true,
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
  },
  writable: true,
});

// Mock window.history
Object.defineProperty(window, 'history', {
  value: {
    back: vi.fn(),
    forward: vi.fn(),
    go: vi.fn(),
    pushState: vi.fn(),
    replaceState: vi.fn(),
  },
  writable: true,
});

// Mock window.open
Object.defineProperty(window, 'open', {
  value: vi.fn(() => ({
    closed: false,
    focus: vi.fn(),
    blur: vi.fn(),
    close: vi.fn(),
  })),
  writable: true,
});

// Mock fetch
global.fetch = vi.fn();

// Mock console methods to reduce noise in tests
const originalConsole = console;
beforeEach(() => {
  console.log = vi.fn();
  console.warn = vi.fn();
  console.error = vi.fn();
  console.info = vi.fn();
  console.debug = vi.fn();
});

afterEach(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
  mockLocalStorage.getItem.mockReturnValue(null);
  mockSessionStorage.getItem.mockReturnValue(null);
  mockSearchParams.clear();
});

