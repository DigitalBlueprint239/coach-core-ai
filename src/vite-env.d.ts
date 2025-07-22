/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Firebase Configuration
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string

  // AI Service Configuration
  readonly VITE_OPENAI_API_KEY?: string
  readonly VITE_AI_PROXY_ENDPOINT?: string
  readonly VITE_AI_PROXY_TOKEN?: string
  readonly VITE_AI_MODEL?: string
  readonly VITE_AI_MAX_TOKENS?: string
  readonly VITE_AI_TEMPERATURE?: string
  readonly VITE_USE_AI_PROXY?: string

  // App Configuration
  readonly VITE_APP_NAME?: string
  readonly VITE_APP_VERSION?: string
  readonly VITE_APP_URL?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_ENVIRONMENT?: string

  // Feature Flags
  readonly VITE_ENABLE_ANALYTICS?: string
  readonly VITE_ENABLE_ERROR_REPORTING?: string
  readonly VITE_ENABLE_OFFLINE?: string
  readonly VITE_ENABLE_PWA?: string
  readonly VITE_ENABLE_PUSH_NOTIFICATIONS?: string
  readonly VITE_ENABLE_AI_SUGGESTIONS?: string
  readonly VITE_ENABLE_VIDEO_ANALYSIS?: string
  readonly VITE_ENABLE_TEAM_MANAGEMENT?: string
  readonly VITE_ENABLE_REALTIME_COLLABORATION?: string
  readonly VITE_ENABLE_MOBILE_APP?: string
  readonly VITE_ENABLE_SOCIAL_LOGIN?: string
  readonly VITE_ENABLE_NOTIFICATIONS?: string

  // Analytics & Monitoring
  readonly VITE_GOOGLE_ANALYTICS_ID?: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_GA_TRACKING_ID?: string

  // Development
  readonly VITE_USE_EMULATOR?: string
  readonly VITE_DEBUG_MODE?: string
  readonly VITE_LOG_LEVEL?: string

  // Other
  readonly VITE_VAPID_PUBLIC_KEY?: string
  readonly VITE_VERSION?: string
  readonly VITE_BUILD_NUMBER?: string
  readonly VITE_ERROR_REPORTING_ENDPOINT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}