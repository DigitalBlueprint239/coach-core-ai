type EnvRecord = Record<string, string | undefined>;

const resolveEnv = (key: string): string | undefined => {
  if (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: EnvRecord }).env) {
    const metaEnv = (import.meta as unknown as { env: EnvRecord }).env;
    if (key in metaEnv) {
      return metaEnv[key];
    }
  }
  return process.env[key];
};

const isEnabled = (...keys: string[]): boolean =>
  keys.some((key) => resolveEnv(key)?.toLowerCase() === 'true');

export const appConfig = {
  // Environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // Firebase Configuration
  firebase: {
    apiKey: resolveEnv('REACT_APP_FIREBASE_API_KEY'),
    authDomain: resolveEnv('REACT_APP_FIREBASE_AUTH_DOMAIN'),
    projectId: resolveEnv('REACT_APP_FIREBASE_PROJECT_ID'),
    storageBucket: resolveEnv('REACT_APP_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: resolveEnv('REACT_APP_FIREBASE_MESSAGING_SENDER_ID'),
    appId: resolveEnv('REACT_APP_FIREBASE_APP_ID'),
    measurementId: resolveEnv('REACT_APP_FIREBASE_MEASUREMENT_ID'),
  },

  // API Configuration
  api: {
    baseUrl: resolveEnv('REACT_APP_API_BASE_URL') || resolveEnv('VITE_API_BASE_URL') || 'http://localhost:3001',
    timeout: 30000,
  },

  // Feature Flags
  features: {
    aiAssistant: isEnabled('REACT_APP_ENABLE_AI_ASSISTANT', 'VITE_ENABLE_AI_ASSISTANT'),
    analytics: isEnabled('REACT_APP_ENABLE_ANALYTICS', 'VITE_ENABLE_ANALYTICS'),
    pushNotifications: isEnabled('REACT_APP_ENABLE_PUSH_NOTIFICATIONS', 'VITE_ENABLE_PUSH_NOTIFICATIONS'),
    recruitingHub: isEnabled('VITE_FEATURE_RECRUITING', 'REACT_APP_FEATURE_RECRUITING'),
  },

  // Security
  security: {
    enableCSP: isEnabled('REACT_APP_ENABLE_CSP', 'VITE_CSP_ENABLED'),
    enableHSTS: isEnabled('REACT_APP_ENABLE_HSTS', 'VITE_ENABLE_HSTS'),
  },
};
