import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, type Analytics } from 'firebase/analytics';

// Firebase configuration from environment variables
// Fallback values prevent SDK initialization errors in test/CI environments
// where env vars are not set. Real values must be set in production.
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY ?? 'placeholder-api-key',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ?? 'placeholder.firebaseapp.com',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID ?? 'placeholder-project',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET ?? 'placeholder.appspot.com',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID ?? '000000000000',
  appId: process.env.REACT_APP_FIREBASE_APP_ID ?? '1:000000000000:web:placeholder',
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase services
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);
let analytics: Analytics | undefined;

if (app.name && typeof window !== 'undefined') {
  if (process.env.NODE_ENV === 'production') {
    analytics = getAnalytics(app);
  }
}

export { app, auth, db, storage, analytics };
