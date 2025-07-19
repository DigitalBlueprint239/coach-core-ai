export const appConfig = {
  app: {
    name: 'Coach Core AI',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  },
  features: {
    ai: process.env.REACT_APP_ENABLE_AI === 'true',
    offline: process.env.REACT_APP_ENABLE_OFFLINE === 'true',
    analytics: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
  },
  api: {
    baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:5000',
    aiServiceUrl: process.env.REACT_APP_AI_SERVICE_URL || 'http://localhost:8000',
    timeout: 30000,
  },
}; 