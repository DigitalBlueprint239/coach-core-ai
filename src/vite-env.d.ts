/// <reference types="vite/client" />

// Every REACT_APP_* value is compiled into the public bundle. Never put a secret here.
interface ImportMetaEnv {
  readonly REACT_APP_FIREBASE_API_KEY: string | undefined;
  readonly REACT_APP_FIREBASE_AUTH_DOMAIN: string | undefined;
  readonly REACT_APP_FIREBASE_PROJECT_ID: string | undefined;
  readonly REACT_APP_FIREBASE_STORAGE_BUCKET: string | undefined;
  readonly REACT_APP_FIREBASE_MESSAGING_SENDER_ID: string | undefined;
  readonly REACT_APP_FIREBASE_APP_ID: string | undefined;
  readonly REACT_APP_FIREBASE_MEASUREMENT_ID: string | undefined;
  readonly REACT_APP_AI_ENABLED: string | undefined;
  readonly REACT_APP_AI_PROXY_ENDPOINT: string | undefined;
  readonly REACT_APP_VERSION: string | undefined;
  readonly REACT_APP_BUILD_NUMBER: string | undefined;
  readonly REACT_APP_ERROR_REPORTING_ENDPOINT: string | undefined;
  readonly REACT_APP_VAPID_PUBLIC_KEY: string | undefined;
  readonly REACT_APP_SENTRY_DSN: string | undefined;
  readonly REACT_APP_RELEASE: string | undefined;
  readonly REACT_APP_DEPLOY_ENV: string | undefined;
  readonly REACT_APP_ENABLE_PLAYBOOK_V2: string | undefined;
  readonly REACT_APP_ENABLE_CONTENT_REVIEW: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
