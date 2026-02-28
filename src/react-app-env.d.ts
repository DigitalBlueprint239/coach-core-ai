/// <reference types="react-scripts" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID: string;
  readonly VITE_OPENAI_API_KEY: string;
  readonly VITE_AI_PROXY_ENDPOINT: string;
  readonly VITE_AI_PROXY_TOKEN: string;
  readonly VITE_VERSION: string;
  readonly VITE_BUILD_NUMBER: string;
  readonly VITE_VAPID_PUBLIC_KEY: string;
  readonly VITE_USE_EMULATOR: string;
  readonly VITE_ERROR_REPORTING_ENDPOINT: string;
  readonly [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
