interface EnvironmentConfig {
  // Firebase Configuration
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
  };
  
  // App Configuration
  app: {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
    apiUrl: string;
    enableAnalytics: boolean;
    enableNotifications: boolean;
    enableSocialLogin: boolean;
  };
  
  // Analytics
  analytics: {
    googleAnalyticsId?: string;
    sentryDsn?: string;
  };
  
  // Feature Flags
  features: {
    aiSuggestions: boolean;
    videoAnalysis: boolean;
    teamManagement: boolean;
    realTimeCollaboration: boolean;
    mobileApp: boolean;
  };
}

const validateEnvironment = (): EnvironmentConfig => {
  const requiredVars = [
    'REACT_APP_FIREBASE_API_KEY',
    'REACT_APP_FIREBASE_AUTH_DOMAIN',
    'REACT_APP_FIREBASE_PROJECT_ID',
    'REACT_APP_FIREBASE_STORAGE_BUCKET',
    'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
    'REACT_APP_FIREBASE_APP_ID',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return {
    firebase: {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY!,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN!,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID!,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET!,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID!,
      appId: import.meta.env.VITE_FIREBASE_APP_ID!,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    },
    
    app: {
      name: 'Coach Core',
      version: import.meta.env.VITE_VERSION || '1.0.0',
      environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
      apiUrl: import.meta.env.VITE_API_URL || 'https://api.coachcore.ai',
      enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
      enableNotifications: import.meta.env.VITE_ENABLE_NOTIFICATIONS === 'true',
      enableSocialLogin: import.meta.env.VITE_ENABLE_SOCIAL_LOGIN === 'true',
    },
    
    analytics: {
      googleAnalyticsId: import.meta.env.VITE_GA_TRACKING_ID,
      sentryDsn: import.meta.env.VITE_SENTRY_DSN,
    },
    
    features: {
      aiSuggestions: import.meta.env.VITE_ENABLE_AI_SUGGESTIONS !== 'false',
      videoAnalysis: import.meta.env.VITE_ENABLE_VIDEO_ANALYSIS === 'true',
      teamManagement: import.meta.env.VITE_ENABLE_TEAM_MANAGEMENT !== 'false',
      realTimeCollaboration: import.meta.env.VITE_ENABLE_REALTIME_COLLABORATION === 'true',
      mobileApp: import.meta.env.VITE_ENABLE_MOBILE_APP === 'true',
    },
  };
};

export const config = validateEnvironment();

// Environment-specific configurations
export const isDevelopment = config.app.environment === 'development';
export const isProduction = config.app.environment === 'production';
export const isStaging = config.app.environment === 'staging';

// Feature flags
export const features = config.features;

// Firebase config for direct use
export const firebaseConfig = config.firebase;

// Analytics helpers
export const analytics = {
  enabled: config.app.enableAnalytics,
  googleAnalyticsId: config.analytics.googleAnalyticsId,
  sentryDsn: config.analytics.sentryDsn,
};

// App info
export const appInfo = {
  name: config.app.name,
  version: config.app.version,
  environment: config.app.environment,
};

export default config; 