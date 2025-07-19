// Core Services
export * from './ai/ai-brain-mvp-setup';
export * from './firebase/firebaseConfig';
export * from './auth/authService';

// Integration Services  
export * from '../integration/coach-core-integration';

// Default exports for backward compatibility
export { default as AIBrainSetup } from './ai/ai-brain-mvp-setup';
export { default as CoachCoreIntegration } from '../integration/coach-core-integration'; 