export const monitoringConfig = {
  // Error tracking
  sentry: {
    dsn: process.env.REACT_APP_SENTRY_DSN,
    environment: process.env.REACT_APP_ENVIRONMENT || 'development',
    tracesSampleRate: 0.1,
  },
  
  // Analytics
  analytics: {
    id: process.env.REACT_APP_ANALYTICS_ID,
    enabled: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
  },
  
  // Performance monitoring
  performance: {
    enabled: process.env.REACT_APP_ENABLE_PERFORMANCE_MONITORING === 'true',
    sampleRate: 0.1,
  },
  
  // Error tracking
  errorTracking: {
    enabled: process.env.REACT_APP_ENABLE_ERROR_TRACKING === 'true',
    logToConsole: process.env.NODE_ENV === 'development',
  },
};
