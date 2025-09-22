// Monitoring service exports
export { initSentry, setSentryUser, addSentryBreadcrumb, captureSentryException, captureSentryMessage } from './sentry-config';
export { initFirebasePerformance, PerformanceTracker, usePerformanceTracking } from './firebase-performance';

// Import for internal use
import { initSentry, addSentryBreadcrumb, captureSentryException } from './sentry-config';
import { initFirebasePerformance, PerformanceTracker } from './firebase-performance';

// Combined monitoring initialization
export const initMonitoring = () => {
  // Initialize Sentry
  initSentry();

  // Initialize Firebase Performance
  initFirebasePerformance();
};

// User action tracking utilities
export const trackUserAction = (action: string, data?: any) => {
  // Add Sentry breadcrumb
  addSentryBreadcrumb(`User action: ${action}`, 'user', data);
  
  // Track performance
  PerformanceTracker.trackUserAction(action);
};

// Error tracking utilities
export const trackError = (error: Error, context?: any) => {
  // Capture in Sentry
  captureSentryException(error, context);
  
  // Log to console in development
  if (import.meta.env.MODE === 'development') {
    console.error('🚨 Error tracked:', error, context);
  }
};

// Page navigation tracking
export const trackPageNavigation = (pageName: string, data?: any) => {
  // Add Sentry breadcrumb
  addSentryBreadcrumb(`Navigation: ${pageName}`, 'navigation', data);
  
  // Track performance
  PerformanceTracker.trackPageLoad(pageName);
};

// API call tracking
export const trackApiCall = (apiName: string, data?: any) => {
  // Add Sentry breadcrumb
  addSentryBreadcrumb(`API call: ${apiName}`, 'http', data);
  
  // Track performance
  return PerformanceTracker.trackApiCall(apiName);
};