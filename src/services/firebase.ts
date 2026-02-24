// src/services/firebase.ts
// Single source of truth for Firebase initialization.
// All other modules (firestore.ts, hooks/useAuth.tsx, contexts/TeamContext.tsx)
// import auth and db from here — never initialize Firebase independently.
//
// WHY REACT_APP_ prefix: This is a Create React App project (react-scripts).
// CRA only injects env vars prefixed with REACT_APP_ into the bundle.
// NEXT_PUBLIC_ is Next.js syntax; VITE_ is Vite syntax — neither works here.

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// Warn about missing config but do NOT throw — a missing env file should show
// the login screen with a Firebase error, not a blank white crash page.
const requiredKeys: Array<keyof typeof firebaseConfig> = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

const missingKeys = requiredKeys.filter((key) => !firebaseConfig[key]);
if (missingKeys.length > 0) {
  console.error(
    '[Coach Core] Missing Firebase configuration. Copy .env.local.example to ' +
      '.env.local and fill in the values. Missing:',
    missingKeys
  );
}

// Guard against double-initialization (e.g. HMR in development).
const app = getApps().length === 0
  ? initializeApp(firebaseConfig as Record<string, string>)
  : getApps()[0];

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

// Analytics is optional — it fails in non-browser environments (SSR, tests).
// We lazy-initialize it so a missing Analytics SDK never crashes the app.
let analytics: ReturnType<typeof import('firebase/analytics')['getAnalytics']> | null = null;
try {
  // Dynamic import so the main bundle isn't blocked if Analytics is unavailable.
  import('firebase/analytics').then(({ getAnalytics }) => {
    analytics = getAnalytics(app);
  }).catch(() => {
    // Analytics unavailable — not a critical failure.
  });
} catch {
  // Swallow silently; analytics is non-critical.
}

export { app, auth, db, analytics };
