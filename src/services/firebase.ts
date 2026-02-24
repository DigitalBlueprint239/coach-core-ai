import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Validate required environment variables
const requiredKeys = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
] as const;

const missingVars = requiredKeys.filter(
  key => !firebaseConfig[key as keyof typeof firebaseConfig]
);

if (missingVars.length > 0) {
  throw new Error(
    `Missing required Firebase environment variables: ${missingVars
      .map(k => `VITE_FIREBASE_${k.replace(/([A-Z])/g, '_$1').toUpperCase()}`)
      .join(', ')}`
  );
}

// Initialize Firebase only once across the app
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Analytics is only available in browser environments
let analytics: ReturnType<typeof getAnalytics> | null = null;
try {
  analytics = getAnalytics(app);
} catch {
  // Not available in test/SSR environments
}

export { app, auth, db, analytics };