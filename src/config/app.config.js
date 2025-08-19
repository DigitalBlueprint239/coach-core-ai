"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appConfig = void 0;
exports.appConfig = {
    // Environment
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    // Firebase Configuration
    firebase: {
        apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
        authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
        storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.REACT_APP_FIREBASE_APP_ID,
        measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
    },
    // API Configuration
    api: {
        baseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001',
        timeout: 30000,
    },
    // Feature Flags
    features: {
        aiAssistant: process.env.REACT_APP_ENABLE_AI_ASSISTANT === 'true',
        analytics: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
        pushNotifications: process.env.REACT_APP_ENABLE_PUSH_NOTIFICATIONS === 'true',
    },
    // Security
    security: {
        enableCSP: process.env.REACT_APP_ENABLE_CSP === 'true',
        enableHSTS: process.env.REACT_APP_ENABLE_HSTS === 'true',
    }
};
