// Analytics service exports
export { 
  initAnalytics, 
  isAnalyticsEnabled,
  trackPageView, 
  trackEvent, 
  setUserProperties, 
  setUserId, 
  trackConversion, 
  trackTiming, 
  trackError 
} from './analytics-config';

export {
  EVENT_CATEGORIES,
  trackWaitlistSignup,
  trackWaitlistSignupSuccess,
  trackWaitlistSignupError,
  trackPageNavigation,
  trackRouteChange,
  trackLogin,
  trackLogout,
  trackSignup,
  trackButtonClick,
  trackFormSubmit,
  trackFeatureUsage,
  trackPageLoadTime,
  trackComponentRenderTime,
  trackAppError,
  trackApiError,
  trackWaitlistConversion,
  trackUserOnboarding,
  setUserContext,
  clearUserContext
} from './analytics-events';

// Analytics hook for React components
export { useAnalytics } from './useAnalytics';

