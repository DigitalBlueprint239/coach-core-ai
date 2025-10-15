export const productionConfig = {
  // Firebase Production Configuration
  firebase: {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
  },
  
  // AI Service Configuration
  ai: {
    apiKey: process.env.REACT_APP_AI_API_KEY,
    endpoint: process.env.REACT_APP_AI_ENDPOINT || 'https://api.openai.com/v1',
    model: process.env.REACT_APP_AI_MODEL || 'gpt-4',
    maxTokens: parseInt(process.env.REACT_APP_AI_MAX_TOKENS || '2000'),
  },
  
  // Stripe Configuration
  stripe: {
    publishableKey: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY,
    endpoint: process.env.REACT_APP_STRIPE_ENDPOINT || 'https://api.stripe.com',
  },
  
  // App Configuration
  app: {
    name: 'Coach Core AI',
    version: '1.0.0',
    environment: 'production',
    maxTeamsPerUser: 5,
    maxPlaysPerMonth: {
      free: 5,
      premium: 1000,
      enterprise: 10000,
    },
  },
  
  // Feature Flags
  features: {
    aiPlayGenerator: true,
    teamCollaboration: true,
    analytics: true,
    whiteLabel: false,
    apiAccess: false,
  },
};
