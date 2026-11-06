import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, type Analytics } from 'firebase/analytics';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: import.meta.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: import.meta.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// Additional runtime protection if a build or deployment bypasses CI safeguards.
const deployEnv = import.meta.env.REACT_APP_DEPLOY_ENV;
if (deployEnv === 'staging' || deployEnv === 'preview') {
  if (!firebaseConfig.projectId || firebaseConfig.projectId === 'coach-core-ai' ||
      firebaseConfig.authDomain !== firebaseConfig.projectId + '.firebaseapp.com' ||
      ![firebaseConfig.projectId + '.firebasestorage.app',
         firebaseConfig.projectId + '.appspot.com'].includes(firebaseConfig.storageBucket)) {
    throw new Error('Refusing to initialize an unisolated staging or preview Firebase client.');
  }
} else if (deployEnv === 'production' && firebaseConfig.projectId !== 'coach-core-ai') {
  throw new Error('Refusing to initialize production with an unexpected Firebase project.');
}

// Initialize Firebase (and refuse to reuse an app initialized for a different project).
const existingApp = getApps().length ? getApp() : null;
if (existingApp && existingApp.options.projectId !== firebaseConfig.projectId) {
  throw new Error('Existing Firebase app does not belong to the configured Firebase project.');
}
const app = existingApp ?? initializeApp(firebaseConfig);

// Initialize Firebase services
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);
let analytics: Analytics | undefined;

if (app.name && typeof window !== 'undefined') {
  if (import.meta.env.PROD) {
    analytics = getAnalytics(app);
  }
}

export { app, auth, db, storage, analytics };
