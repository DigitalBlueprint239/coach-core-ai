// src/services/firebase/firebase-config.ts
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { env } from '@/utils/env-validator';

// Firebase configuration using validated environment variables
export const firebaseConfig = {
  apiKey: env.firebaseApiKey,
  authDomain: env.firebaseAuthDomain,
  projectId: env.firebaseProjectId,
  storageBucket: env.firebaseStorageBucket,
  messagingSenderId: env.firebaseMessagingSenderId,
  appId: env.firebaseAppId,
  measurementId: env.firebaseMeasurementId, // Optional
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Initialize Analytics (only in browser and if supported)
let analyticsInstance: ReturnType<typeof getAnalytics> | null = null;

if (typeof window !== 'undefined') {
  isSupported()
    .then(yes => {
      if (yes && env.firebaseMeasurementId) {
        analyticsInstance = getAnalytics(app);
      }
    })
    .catch(err => {
      console.warn('Firebase Analytics not supported:', err);
    });
}

export const analytics = analyticsInstance;

// Development emulator setup
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  console.log('🔧 Connecting to Firebase Emulators...');

  // Connect to Auth Emulator
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });

  // Connect to Firestore Emulator
  connectFirestoreEmulator(db, 'localhost', 8080);

  // Connect to Storage Emulator
  connectStorageEmulator(storage, 'localhost', 9199);

  // Connect to Functions Emulator
  connectFunctionsEmulator(functions, 'localhost', 5001);

  console.log('✅ Connected to Firebase Emulators');
}

export default app;
