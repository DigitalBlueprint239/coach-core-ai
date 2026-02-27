import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, type Analytics, isSupported } from 'firebase/analytics';
import { firebaseConfig, validateFirebaseConfig } from '../config/env';

// Validate env vars at startup — warn but do NOT throw so the app can render
const isConfigured = validateFirebaseConfig();

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let analytics: Analytics | null = null;

if (isConfigured) {
  try {
    // Avoid re-initializing if Firebase is already initialized (e.g. HMR)
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);

    // Analytics requires browser environment — initialize asynchronously
    isSupported().then((supported) => {
      if (supported && app) {
        analytics = getAnalytics(app);
      }
    }).catch(() => {
      // Analytics unavailable in this environment — safe to ignore
    });
  } catch (error) {
    console.error('[Coach Core] Firebase initialization failed:', error);
  }
} else {
  console.warn('[Coach Core] Firebase is not configured. Auth and database features are disabled.');
}

export { app, auth, db, analytics };
