import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getAnalytics, type Analytics } from 'firebase/analytics';

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

// Local Firebase Emulator Suite (CC-NEXT-04 end-to-end tests and local dev).
// Fail closed: emulator mode is allowed only for a `demo-*` project ID, which
// the SDK and emulators treat as having no real cloud resources; a build that
// sets the flag with a real project ID refuses to start (and the prebuild
// guard refuses to build it). Without the flag — every staging/production
// build — the condition is a compile-time constant and the block is removed.
// (The flag is compared inline, not via a variable, so webpack can evaluate it;
// .env.production defines it as "false" for every production build.)
if (process.env.REACT_APP_USE_FIREBASE_EMULATORS === 'true'
    && !String(firebaseConfig.projectId || '').startsWith('demo-')) {
  throw new Error('Emulator mode requires a demo-* Firebase project ID.');
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase services
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);
let analytics: Analytics | undefined;

if (process.env.REACT_APP_USE_FIREBASE_EMULATORS === 'true') {
  const host = process.env.REACT_APP_FIREBASE_EMULATOR_HOST || '127.0.0.1';
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
  connectStorageEmulator(storage, host, 9199);
  // Same instance the AI client later gets from getFunctions(app).
  connectFunctionsEmulator(getFunctions(app), host, 5001);
  // Test-only browser hooks (e2e/README.md); absent from non-emulator builds.
  void import('./e2e-support/emulator-hooks').then((m) => m.installEmulatorHooks(auth, db));
} else if (app.name && typeof window !== 'undefined') {
  if (process.env.NODE_ENV === 'production') {
    analytics = getAnalytics(app);
  }
}

export { app, auth, db, storage, analytics };
