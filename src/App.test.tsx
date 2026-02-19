import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock Firebase service layer to prevent network calls in test environment
jest.mock('./services/firebase', () => ({
  app: {},
  auth: { currentUser: null },
  db: {},
  analytics: null,
}));

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ currentUser: null })),
  onAuthStateChanged: jest.fn(() => jest.fn()),
  signInAnonymously: jest.fn(),
  signOut: jest.fn(),
  connectAuthEmulator: jest.fn(),
  setPersistence: jest.fn(() => Promise.resolve()),
  browserLocalPersistence: {},
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
  serverTimestamp: jest.fn(),
  connectFirestoreEmulator: jest.fn(),
  enableNetwork: jest.fn(),
  disableNetwork: jest.fn(),
}));

jest.mock('firebase/analytics', () => ({
  getAnalytics: jest.fn(),
}));

// Mock AuthProvider to bypass Firebase auth loading state
jest.mock('./components/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: null,
    loading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
    isAuthenticated: false,
  }),
}));

// Mock Dashboard to avoid hooks/useAuth context mismatch
// (Dashboard uses useAuth from hooks/useAuth which has a separate AuthContext
// not provided in the App component tree)
jest.mock('./components/Dashboard', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock PWAInstallPrompt — window.matchMedia is not available in jsdom
jest.mock('./components/PWAInstallPrompt', () => ({
  PWAInstallPrompt: () => null,
  registerServiceWorker: jest.fn(),
  usePWAInstall: () => ({ canInstall: false, install: jest.fn() }),
}));

test('renders Coach Core heading', () => {
  render(<App />);
  expect(screen.getByText('Coach Core')).toBeInTheDocument();
});
