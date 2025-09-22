// Monitoring service exports
export { initSentry, setSentryUser, addSentryBreadcrumb, captureSentryException, captureSentryMessage } from './sentry-config';
export { initFirebasePerformance, PerformanceTracker, usePerformanceTracking } from './firebase-performance';

// Combined monitoring initialization
export const initMonitoring = () => {
  // Initialize Sentry
  const { initSentry } = require('./sentry-config');
  initSentry();

  // Initialize Firebase Performance
  const { initFirebasePerformance } = require('./firebase-performance');
  initFirebasePerformance();
};

// User action tracking utilities
export const trackUserAction = (action: string, data?: any) => {
  const { addSentryBreadcrumb } = require('./sentry-config');
  const { PerformanceTracker } = require('./firebase-performance');
  
  // Add Sentry breadcrumb
  addSentryBreadcrumb(`User action: ${action}`, 'user', data);
  
  // Track performance
  PerformanceTracker.trackUserAction(action);
};

// Error tracking utilities
export const trackError = (error: Error, context?: any) => {
  const { captureSentryException } = require('./sentry-config');
  
  // Capture in Sentry
  captureSentryException(error, context);
  
  // Log to console in development
  if (import.meta.env.MODE === 'development') {
    console.error('🚨 Error tracked:', error, context);
  }
};

// Page navigation tracking
export const trackPageNavigation = (pageName: string, data?: any) => {
  const { addSentryBreadcrumb } = require('./sentry-config');
  const { PerformanceTracker } = require('./firebase-performance');
  
  // Add Sentry breadcrumb
  addSentryBreadcrumb(`Navigation: ${pageName}`, 'navigation', data);
  
  // Track performance
  PerformanceTracker.trackPageLoad(pageName);
};

// API call tracking
export const trackApiCall = (apiName: string, data?: any) => {
  const { addSentryBreadcrumb } = require('./sentry-config');
  const { PerformanceTracker } = require('./firebase-performance');
  
  // Add Sentry breadcrumb
  addSentryBreadcrumb(`API call: ${apiName}`, 'http', data);
  
  // Track performance
  return PerformanceTracker.trackApiCall(apiName);
};