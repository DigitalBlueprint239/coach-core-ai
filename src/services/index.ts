// Core Services
export * from './ai/ai-brain-mvp-setup';
export * from './firebase/firebase-config';
// export * from './auth/authService'; // File does not exist

// Integration Services  
export * from '../integration/coach-core-integration';

// Default exports for backward compatibility
export { default as AIBrainSetup } from './ai/ai-brain-mvp-setup';
export { default as CoachCoreIntegration } from '../integration/coach-core-integration'; 