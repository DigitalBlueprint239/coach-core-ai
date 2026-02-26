/**
 * src/config/env.ts
 * Centralized environment variable validation for Create React App (CRA).
 * All vars must use REACT_APP_* prefix to be injected by CRA's webpack.
 * Previously scattered import.meta.env.VITE_* calls have been replaced
 * with process.env.REACT_APP_* via this module.
 */

// ── Firebase (required for app to function) ─────────────────────────────────
export const FIREBASE_API_KEY = process.env.REACT_APP_FIREBASE_API_KEY ?? '';
export const FIREBASE_AUTH_DOMAIN = process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ?? '';
export const FIREBASE_PROJECT_ID = process.env.REACT_APP_FIREBASE_PROJECT_ID ?? '';
export const FIREBASE_STORAGE_BUCKET = process.env.REACT_APP_FIREBASE_STORAGE_BUCKET ?? '';
export const FIREBASE_MESSAGING_SENDER_ID = process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID ?? '';
export const FIREBASE_APP_ID = process.env.REACT_APP_FIREBASE_APP_ID ?? '';
export const FIREBASE_MEASUREMENT_ID = process.env.REACT_APP_FIREBASE_MEASUREMENT_ID ?? '';

// ── AI / Proxy ───────────────────────────────────────────────────────────────
export const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY ?? '';
export const AI_PROXY_ENDPOINT = process.env.REACT_APP_AI_PROXY_ENDPOINT ?? '/api/ai';
export const AI_PROXY_TOKEN = process.env.REACT_APP_AI_PROXY_TOKEN ?? '';

// ── Push notifications ───────────────────────────────────────────────────────
export const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY ?? '';

// ── App metadata ─────────────────────────────────────────────────────────────
export const APP_VERSION = process.env.REACT_APP_VERSION ?? '1.0.0';
export const BUILD_NUMBER = process.env.REACT_APP_BUILD_NUMBER ?? undefined;
export const ERROR_REPORTING_ENDPOINT = process.env.REACT_APP_ERROR_REPORTING_ENDPOINT ?? '/api/errors';

// ── Emulator flag ────────────────────────────────────────────────────────────
export const USE_EMULATOR = process.env.REACT_APP_USE_EMULATOR === 'true';

// ── Firebase config object (convenience export) ──────────────────────────────
export const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
  measurementId: FIREBASE_MEASUREMENT_ID,
};

/**
 * Validates Firebase env vars are present and warns to console if not.
 * Does NOT throw — prevents blank white screen when vars are missing.
 * Returns true if all required vars are present, false otherwise.
 */
export function validateFirebaseConfig(): boolean {
  const required = [
    'REACT_APP_FIREBASE_API_KEY',
    'REACT_APP_FIREBASE_AUTH_DOMAIN',
    'REACT_APP_FIREBASE_PROJECT_ID',
    'REACT_APP_FIREBASE_STORAGE_BUCKET',
    'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
    'REACT_APP_FIREBASE_APP_ID',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      '[Coach Core] Missing Firebase environment variables:\n' +
      missing.map(k => `  • ${k}`).join('\n') + '\n' +
      'Copy .env.local.example to .env.local and fill in your Firebase values.\n' +
      'Firebase features will be unavailable until these are set.'
    );
    return false;
  }

  return true;
}
