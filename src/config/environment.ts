/**
 * Environment Configuration System
 * - Centralized environment variable management
 * - Validation on startup
 * - Different configs for dev/staging/prod
 * - Type-safe configuration access
 */

export interface EnvironmentConfig {
  // Environment
  NODE_ENV: 'development' | 'production' | 'test';
  ENVIRONMENT: 'development' | 'staging' | 'production';

  // Firebase Configuration
  FIREBASE: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
  };

  // API Configuration
  API: {
    baseUrl: string;
    aiServiceUrl: string;
    timeout: number;
  };

  // AI Services
  AI: {
    openaiApiKey: string;
    claudeApiKey: string;
    aiProxyToken: string;
    enableAiAssistant: boolean;
    enableClaudeService: boolean;
  };

  // Analytics & Monitoring
  MONITORING: {
    sentryDsn?: string;
    enableAnalytics: boolean;
    enableErrorReporting: boolean;
  };

  // Security
  SECURITY: {
    enableCSP: boolean;
    enableHSTS: boolean;
    enable2FA: boolean;
    sessionTimeout: number;
  };

  // Features
  FEATURES: {
    enablePushNotifications: boolean;
    enableOfflineMode: boolean;
    enableHudlIntegration: boolean;
    enableStripeIntegration: boolean;
  };

  // Development
  DEVELOPMENT: {
    useEmulator: boolean;
    enableDebugMode: boolean;
    enableHotReload: boolean;
  };
}

// Environment validation schema
const requiredEnvVars = {
  // Firebase (required)
  REACT_APP_FIREBASE_API_KEY: 'Firebase API Key',
  REACT_APP_FIREBASE_AUTH_DOMAIN: 'Firebase Auth Domain',
  REACT_APP_FIREBASE_PROJECT_ID: 'Firebase Project ID',
  REACT_APP_FIREBASE_STORAGE_BUCKET: 'Firebase Storage Bucket',
  REACT_APP_FIREBASE_MESSAGING_SENDER_ID: 'Firebase Messaging Sender ID',
  REACT_APP_FIREBASE_APP_ID: 'Firebase App ID',

  // AI Services (required)
  REACT_APP_OPENAI_API_KEY: 'OpenAI API Key',
  REACT_APP_CLAUDE_API_KEY: 'Claude API Key',
  REACT_APP_AI_PROXY_TOKEN: 'AI Proxy Token',
} as const;

const optionalEnvVars = {
  // Firebase (optional)
  REACT_APP_FIREBASE_MEASUREMENT_ID: 'Firebase Measurement ID',

  // API (optional)
  REACT_APP_API_BASE_URL: 'API Base URL',
  REACT_APP_AI_SERVICE_URL: 'AI Service URL',

  // Monitoring (optional)
  REACT_APP_SENTRY_DSN: 'Sentry DSN',

  // Features (optional)
  REACT_APP_ENABLE_AI_ASSISTANT: 'Enable AI Assistant',
  REACT_APP_ENABLE_ANALYTICS: 'Enable Analytics',
  REACT_APP_ENABLE_PUSH_NOTIFICATIONS: 'Enable Push Notifications',
  REACT_APP_ENABLE_OFFLINE_MODE: 'Enable Offline Mode',
  REACT_APP_ENABLE_HUDL_INTEGRATION: 'Enable Hudl Integration',
  REACT_APP_ENABLE_STRIPE_INTEGRATION: 'Enable Stripe Integration',

  // Security (optional)
  REACT_APP_ENABLE_CSP: 'Enable Content Security Policy',
  REACT_APP_ENABLE_HSTS: 'Enable HSTS',
  REACT_APP_ENABLE_2FA: 'Enable Two-Factor Authentication',

  // Development (optional)
  REACT_APP_USE_EMULATOR: 'Use Firebase Emulator',
  REACT_APP_ENABLE_DEBUG_MODE: 'Enable Debug Mode',
} as const;

/**
 * Validate environment variables
 */
function validateEnvironment(): void {
  const missingVars: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  Object.entries(requiredEnvVars).forEach(([key, description]) => {
    if (!process.env[key]) {
      missingVars.push(`${key} (${description})`);
    }
  });

  // Check optional variables and provide warnings
  Object.entries(optionalEnvVars).forEach(([key, description]) => {
    if (!process.env[key]) {
      warnings.push(`${key} (${description}) - Optional`);
    }
  });

  // Throw error if required variables are missing
  if (missingVars.length > 0) {
    const errorMessage = `Missing required environment variables:\n${missingVars.join('\n')}`;
    console.error('❌ Environment Validation Failed:', errorMessage);
    throw new Error(errorMessage);
  }

  // Log warnings for missing optional variables
  if (warnings.length > 0) {
    console.warn('⚠️ Missing optional environment variables:', warnings);
  }

  console.log('✅ Environment validation passed');
}

/**
 * Get environment-specific configuration
 */
function getEnvironmentConfig(): EnvironmentConfig {
  const nodeEnv = (process.env.NODE_ENV ||
    'development') as EnvironmentConfig['NODE_ENV'];

  // Determine environment (development, staging, production)
  let environment: EnvironmentConfig['ENVIRONMENT'] = 'development';
  if (nodeEnv === 'production') {
    environment =
      process.env.REACT_APP_ENVIRONMENT === 'staging'
        ? 'staging'
        : 'production';
  }

  return {
    NODE_ENV: nodeEnv,
    ENVIRONMENT: environment,

    FIREBASE: {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY!,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN!,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID!,
      storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET!,
      messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID!,
      appId: process.env.REACT_APP_FIREBASE_APP_ID!,
      measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
    },

    API: {
      baseUrl:
        process.env.REACT_APP_API_BASE_URL || getDefaultApiUrl(environment),
      aiServiceUrl:
        process.env.REACT_APP_AI_SERVICE_URL ||
        getDefaultAiServiceUrl(environment),
      timeout: 30000, // 30 seconds
    },

    AI: {
      openaiApiKey: process.env.REACT_APP_OPENAI_API_KEY!,
      claudeApiKey: process.env.REACT_APP_CLAUDE_API_KEY!,
      aiProxyToken: process.env.REACT_APP_AI_PROXY_TOKEN!,
      enableAiAssistant: process.env.REACT_APP_ENABLE_AI_ASSISTANT === 'true',
      enableClaudeService: process.env.REACT_APP_ENABLE_AI_ASSISTANT === 'true',
    },

    MONITORING: {
      sentryDsn: process.env.REACT_APP_SENTRY_DSN,
      enableAnalytics: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
      enableErrorReporting: environment === 'production',
    },

    SECURITY: {
      enableCSP:
        process.env.REACT_APP_ENABLE_CSP === 'true' ||
        environment === 'production',
      enableHSTS:
        process.env.REACT_APP_ENABLE_HSTS === 'true' ||
        environment === 'production',
      enable2FA: process.env.REACT_APP_ENABLE_2FA === 'true',
      sessionTimeout: 3600000, // 1 hour
    },

    FEATURES: {
      enablePushNotifications:
        process.env.REACT_APP_ENABLE_PUSH_NOTIFICATIONS === 'true',
      enableOfflineMode: process.env.REACT_APP_ENABLE_OFFLINE_MODE === 'true',
      enableHudlIntegration:
        process.env.REACT_APP_ENABLE_HUDL_INTEGRATION === 'true',
      enableStripeIntegration:
        process.env.REACT_APP_ENABLE_STRIPE_INTEGRATION === 'true',
    },

    DEVELOPMENT: {
      useEmulator:
        process.env.REACT_APP_USE_EMULATOR === 'true' &&
        environment === 'development',
      enableDebugMode:
        process.env.REACT_APP_ENABLE_DEBUG_MODE === 'true' &&
        environment === 'development',
      enableHotReload: environment === 'development',
    },
  };
}

/**
 * Get default API URL based on environment
 */
function getDefaultApiUrl(
  environment: EnvironmentConfig['ENVIRONMENT']
): string {
  switch (environment) {
    case 'development':
      return 'http://localhost:3001/api';
    case 'staging':
      return 'https://api-staging.coachcore.ai/api';
    case 'production':
      return 'https://api.coachcore.ai/api';
    default:
      return 'http://localhost:3001/api';
  }
}

/**
 * Get default AI service URL based on environment
 */
function getDefaultAiServiceUrl(
  environment: EnvironmentConfig['ENVIRONMENT']
): string {
  switch (environment) {
    case 'development':
      return 'http://localhost:8000';
    case 'staging':
      return 'https://ai-staging.coachcore.ai';
    case 'production':
      return 'https://ai.coachcore.ai';
    default:
      return 'http://localhost:8000';
  }
}

/**
 * Environment configuration instance
 */
let config: EnvironmentConfig | null = null;

/**
 * Get environment configuration (singleton)
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  if (!config) {
    validateEnvironment();
    config = getEnvironmentConfig();
  }
  return config;
}

/**
 * Reset configuration (for testing)
 */
export function resetEnvironmentConfig(): void {
  config = null;
}

/**
 * Check if running in specific environment
 */
export const isDevelopment = () =>
  getEnvironmentConfig().ENVIRONMENT === 'development';
export const isStaging = () => getEnvironmentConfig().ENVIRONMENT === 'staging';
export const isProduction = () =>
  getEnvironmentConfig().ENVIRONMENT === 'production';

/**
 * Get Firebase configuration
 */
export const getFirebaseConfig = () => getEnvironmentConfig().FIREBASE;

/**
 * Get API configuration
 */
export const getApiConfig = () => getEnvironmentConfig().API;

/**
 * Get AI configuration
 */
export const getAiConfig = () => getEnvironmentConfig().AI;

/**
 * Get monitoring configuration
 */
export const getMonitoringConfig = () => getEnvironmentConfig().MONITORING;

/**
 * Get security configuration
 */
export const getSecurityConfig = () => getEnvironmentConfig().SECURITY;

/**
 * Get features configuration
 */
export const getFeaturesConfig = () => getEnvironmentConfig().FEATURES;

/**
 * Get development configuration
 */
export const getDevelopmentConfig = () => getEnvironmentConfig().DEVELOPMENT;

// Export default configuration
export default getEnvironmentConfig();
