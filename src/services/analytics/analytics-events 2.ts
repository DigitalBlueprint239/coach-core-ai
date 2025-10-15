import { trackEvent, trackPageView, setUserProperties, setUserId, trackConversion, trackTiming, trackError } from './analytics-config';

// Event categories
export const EVENT_CATEGORIES = {
  USER: 'user',
  NAVIGATION: 'navigation',
  WAITLIST: 'waitlist',
  AUTHENTICATION: 'authentication',
  PERFORMANCE: 'performance',
  ERROR: 'error',
  CONVERSION: 'conversion'
} as const;

// Waitlist events
export const trackWaitlistSignup = (email: string, source?: string) => {
  trackEvent('waitlist_signup', {
    event_category: EVENT_CATEGORIES.WAITLIST,
    event_label: 'email_signup',
    email_domain: email.split('@')[1],
    source: source || 'unknown',
    timestamp: new Date().toISOString()
  });
};

export const trackWaitlistSignupSuccess = (email: string, source?: string) => {
  trackEvent('waitlist_signup_success', {
    event_category: EVENT_CATEGORIES.WAITLIST,
    event_label: 'email_signup_success',
    email_domain: email.split('@')[1],
    source: source || 'unknown',
    timestamp: new Date().toISOString()
  });
};

export const trackWaitlistSignupError = (email: string, error: string, source?: string) => {
  trackEvent('waitlist_signup_error', {
    event_category: EVENT_CATEGORIES.WAITLIST,
    event_label: 'email_signup_error',
    email_domain: email.split('@')[1],
    error_message: error,
    source: source || 'unknown',
    timestamp: new Date().toISOString()
  });
};

// Navigation events
export const trackPageNavigation = (pagePath: string, pageTitle?: string) => {
  trackPageView(pagePath, pageTitle);
  
  trackEvent('page_navigation', {
    event_category: EVENT_CATEGORIES.NAVIGATION,
    event_label: pagePath,
    page_title: pageTitle || (typeof globalThis !== 'undefined' && globalThis.document ? globalThis.document.title : 'Unknown'),
    page_path: pagePath,
    timestamp: new Date().toISOString()
  });
};

export const trackRouteChange = (fromRoute: string, toRoute: string) => {
  trackEvent('route_change', {
    event_category: EVENT_CATEGORIES.NAVIGATION,
    event_label: `${fromRoute} -> ${toRoute}`,
    from_route: fromRoute,
    to_route: toRoute,
    timestamp: new Date().toISOString()
  });
};

// Authentication events
export const trackLogin = (method: string, userId?: string) => {
  trackEvent('login', {
    event_category: EVENT_CATEGORIES.AUTHENTICATION,
    event_label: 'user_login',
    login_method: method,
    user_id: userId,
    timestamp: new Date().toISOString()
  });
};

export const trackLogout = (userId?: string) => {
  trackEvent('logout', {
    event_category: EVENT_CATEGORIES.AUTHENTICATION,
    event_label: 'user_logout',
    user_id: userId,
    timestamp: new Date().toISOString()
  });
};

export const trackSignup = (method: string, userId?: string, teamId?: string) => {
  trackEvent('signup', {
    event_category: EVENT_CATEGORIES.AUTHENTICATION,
    event_label: 'user_signup',
    signup_method: method,
    user_id: userId,
    team_id: teamId,
    timestamp: new Date().toISOString()
  });
};

// User interaction events
export const trackButtonClick = (buttonName: string, location: string) => {
  trackEvent('button_click', {
    event_category: EVENT_CATEGORIES.USER,
    event_label: buttonName,
    button_location: location,
    timestamp: new Date().toISOString()
  });
};

export const trackFormSubmit = (formName: string, success: boolean) => {
  trackEvent('form_submit', {
    event_category: EVENT_CATEGORIES.USER,
    event_label: formName,
    form_success: success,
    timestamp: new Date().toISOString()
  });
};

export const trackFeatureUsage = (featureName: string, action: string) => {
  trackEvent('feature_usage', {
    event_category: EVENT_CATEGORIES.USER,
    event_label: featureName,
    feature_action: action,
    timestamp: new Date().toISOString()
  });
};

// Performance events
export const trackPageLoadTime = (pagePath: string, loadTime: number) => {
  trackTiming('page_load', loadTime, 'performance');
  
  trackEvent('page_load_time', {
    event_category: EVENT_CATEGORIES.PERFORMANCE,
    event_label: pagePath,
    load_time: loadTime,
    page_path: pagePath,
    timestamp: new Date().toISOString()
  });
};

export const trackComponentRenderTime = (componentName: string, renderTime: number) => {
  trackTiming('component_render', renderTime, 'performance');
  
  trackEvent('component_render_time', {
    event_category: EVENT_CATEGORIES.PERFORMANCE,
    event_label: componentName,
    render_time: renderTime,
    component_name: componentName,
    timestamp: new Date().toISOString()
  });
};

// Error events
export const trackAppError = (error: Error, component?: string, action?: string) => {
  trackError(error, false);
  
  trackEvent('app_error', {
    event_category: EVENT_CATEGORIES.ERROR,
    event_label: error.message,
    error_message: error.message,
    error_stack: error.stack,
    component,
    action,
    timestamp: new Date().toISOString()
  });
};

export const trackApiError = (endpoint: string, statusCode: number, errorMessage: string) => {
  trackEvent('api_error', {
    event_category: EVENT_CATEGORIES.ERROR,
    event_label: endpoint,
    endpoint,
    status_code: statusCode,
    error_message: errorMessage,
    timestamp: new Date().toISOString()
  });
};

// Conversion events
export const trackWaitlistConversion = (email: string, source?: string) => {
  trackConversion('waitlist_signup', 1, 'USD');
  
  trackEvent('waitlist_conversion', {
    event_category: EVENT_CATEGORIES.CONVERSION,
    event_label: 'waitlist_signup',
    email_domain: email.split('@')[1],
    source: source || 'unknown',
    conversion_value: 1,
    timestamp: new Date().toISOString()
  });
};

export const trackUserOnboarding = (userId: string, step: string) => {
  trackEvent('onboarding_step', {
    event_category: EVENT_CATEGORIES.CONVERSION,
    event_label: step,
    user_id: userId,
    onboarding_step: step,
    timestamp: new Date().toISOString()
  });
};

// User context management
export const setUserContext = (userId: string, userEmail: string, teamId?: string, userType?: string) => {
  setUserId(userId);
  
  setUserProperties({
    user_id: userId,
    user_email: userEmail,
    team_id: teamId,
    user_type: userType || 'coach',
    environment: import.meta.env.VITE_ENVIRONMENT || 'development'
  });
};

export const clearUserContext = () => {
  setUserId('');
  setUserProperties({});
};
