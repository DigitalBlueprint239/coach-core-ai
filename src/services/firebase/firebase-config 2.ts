import { initializeApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  GoogleAuthProvider,
  OAuthProvider,
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Firebase configuration - support both Vite and Create React App environment variables
const firebaseConfig = {
  apiKey:
    import.meta.env?.VITE_FIREBASE_API_KEY ||
    (typeof process !== 'undefined' && process.env?.REACT_APP_FIREBASE_API_KEY) ||
    'demo-api-key',
  authDomain:
    import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN ||
    (typeof process !== 'undefined' && process.env?.REACT_APP_FIREBASE_AUTH_DOMAIN) ||
    'coach-core-demo.firebaseapp.com',
  projectId:
    import.meta.env?.VITE_FIREBASE_PROJECT_ID ||
    (typeof process !== 'undefined' && process.env?.REACT_APP_FIREBASE_PROJECT_ID) ||
    'coach-core-demo',
  storageBucket:
    import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET ||
    (typeof process !== 'undefined' && process.env?.REACT_APP_FIREBASE_STORAGE_BUCKET) ||
    'coach-core-demo.appspot.com',
  messagingSenderId:
    import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    (typeof process !== 'undefined' && process.env?.REACT_APP_FIREBASE_MESSAGING_SENDER_ID) ||
    '123456789',
  appId:
    import.meta.env?.VITE_FIREBASE_APP_ID ||
    (typeof process !== 'undefined' && process.env?.REACT_APP_FIREBASE_APP_ID) ||
    'demo-app-id',
  measurementId:
    import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID ||
    (typeof process !== 'undefined' && process.env?.REACT_APP_FIREBASE_MEASUREMENT_ID) ||
    'demo-measurement-id',
};

// Log configuration for debugging (remove in production)
if (import.meta.env?.DEV || (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development')) {
  console.log('Firebase Config:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    hasApiKey: !!firebaseConfig.apiKey,
  });
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Initialize Auth Providers
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');

// Configure Google Provider
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Configure Apple Provider
appleProvider.setCustomParameters({
  locale: 'en_US',
});

// Connect to emulators only in development and when explicitly enabled
const isDev = import.meta.env?.DEV || (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development');
const useEmulator =
  import.meta.env?.VITE_USE_EMULATOR === 'true' ||
  (typeof process !== 'undefined' && process.env?.REACT_APP_USE_EMULATOR === 'true');

if (isDev && useEmulator) {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
    connectFunctionsEmulator(functions, 'localhost', 5001);
    console.log('Connected to Firebase emulators');
  } catch (error) {
    console.log('Firebase emulators already connected or not available');
  }
}

export { firebaseConfig };
export default app;
