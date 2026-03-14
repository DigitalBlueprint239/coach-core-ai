import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import type { Analytics } from 'firebase/analytics';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// ---------------------------------------------------------------------------
// Lazy Initialization — Firebase SDK is NOT loaded until first use
// ---------------------------------------------------------------------------

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;
let _analytics: Analytics | undefined;
let _initPromise: Promise<FirebaseServices> | null = null;

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
  analytics: Analytics | undefined;
}

/**
 * Lazily initializes Firebase. The SDK modules are loaded via dynamic import
 * so they are code-split into a separate chunk that only loads when this
 * function is first called (typically when the auth state listener mounts).
 *
 * Returns the same instance on repeated calls.
 */
export function getFirebaseServices(): Promise<FirebaseServices> {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const { initializeApp, getApps, getApp } = await import('firebase/app');
    const { getAuth } = await import('firebase/auth');
    const { getFirestore } = await import('firebase/firestore');
    const { getStorage } = await import('firebase/storage');

    _app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    _auth = getAuth(_app);
    _db = getFirestore(_app);
    _storage = getStorage(_app);

    if (_app.name && typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      const { getAnalytics } = await import('firebase/analytics');
      _analytics = getAnalytics(_app);
    }

    return { app: _app, auth: _auth, db: _db, storage: _storage, analytics: _analytics };
  })();

  return _initPromise;
}

// ---------------------------------------------------------------------------
// Synchronous accessors (for backward compatibility with existing code).
// These return null until getFirebaseServices() has resolved.
// ---------------------------------------------------------------------------

/** @deprecated Use getFirebaseServices() instead */
export const auth = new Proxy({} as Auth, {
  get(_target, prop) {
    if (!_auth) return undefined;
    return (_auth as any)[prop];
  },
});

/** @deprecated Use getFirebaseServices() instead */
export const db = new Proxy({} as Firestore, {
  get(_target, prop) {
    if (!_db) return undefined;
    return (_db as any)[prop];
  },
});

/** @deprecated Use getFirebaseServices() instead */
export const storage = new Proxy({} as FirebaseStorage, {
  get(_target, prop) {
    if (!_storage) return undefined;
    return (_storage as any)[prop];
  },
});

export { _analytics as analytics };
