// gtag is loaded globally via Google Analytics script

// Environment configuration
const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT || 'development';
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const ENABLE_ANALYTICS = import.meta.env.VITE_ENABLE_ANALYTICS === 'true';

// Check if analytics should be enabled
export const isAnalyticsEnabled = (): boolean => {
  return ENVIRONMENT === 'production' && !!GA_MEASUREMENT_ID && ENABLE_ANALYTICS;
};

// Initialize Google Analytics
export const initAnalytics = (): void => {
  if (!isAnalyticsEnabled()) {
    console.log('Google Analytics not initialized (not in production or missing config)');
    return;
  }

  if (!GA_MEASUREMENT_ID) {
    console.warn('Google Analytics Measurement ID not provided');
    return;
  }

  // Load Google Analytics script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Initialize gtag
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    window.dataLayer.push(args);
  }
  window.gtag = gtag;

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_title: document.title,
    page_location: window.location.href,
    custom_map: {
      dimension1: 'user_type',
      dimension2: 'team_id',
      dimension3: 'environment'
    }
  });

  console.log('Google Analytics initialized for production environment');
};

// Track page views
export const trackPageView = (pagePath: string, pageTitle?: string): void => {
  if (!isAnalyticsEnabled()) {
    console.log(`Analytics: Page view - ${pagePath} (not tracked - not in production)`);
    return;
  }

  window.gtag('config', GA_MEASUREMENT_ID!, {
    page_path: pagePath,
    page_title: pageTitle || document.title,
    page_location: window.location.href
  });

  console.log(`Analytics: Page view tracked - ${pagePath}`);
};

// Track custom events
export const trackEvent = (eventName: string, parameters?: Record<string, any>): void => {
  if (!isAnalyticsEnabled()) {
    console.log(`Analytics: Event - ${eventName} (not tracked - not in production)`, parameters);
    return;
  }

  window.gtag('event', eventName, {
    ...parameters,
    environment: ENVIRONMENT,
    timestamp: new Date().toISOString()
  });

  console.log(`Analytics: Event tracked - ${eventName}`, parameters);
};

// Track user properties
export const setUserProperties = (properties: Record<string, any>): void => {
  if (!isAnalyticsEnabled()) {
    console.log('Analytics: User properties (not tracked - not in production)', properties);
    return;
  }

  window.gtag('config', GA_MEASUREMENT_ID!, {
    user_properties: properties
  });

  console.log('Analytics: User properties set', properties);
};

// Track user ID
export const setUserId = (userId: string): void => {
  if (!isAnalyticsEnabled()) {
    console.log(`Analytics: User ID (not tracked - not in production) - ${userId}`);
    return;
  }

  window.gtag('config', GA_MEASUREMENT_ID!, {
    user_id: userId
  });

  console.log(`Analytics: User ID set - ${userId}`);
};

// Track conversion events
export const trackConversion = (conversionName: string, value?: number, currency?: string): void => {
  if (!isAnalyticsEnabled()) {
    console.log(`Analytics: Conversion (not tracked - not in production) - ${conversionName}`);
    return;
  }

  window.gtag('event', 'conversion', {
    send_to: GA_MEASUREMENT_ID,
    event_category: 'conversion',
    event_label: conversionName,
    value: value,
    currency: currency
  });

  console.log(`Analytics: Conversion tracked - ${conversionName}`);
};

// Track timing events
export const trackTiming = (name: string, value: number, category?: string): void => {
  if (!isAnalyticsEnabled()) {
    console.log(`Analytics: Timing (not tracked - not in production) - ${name}: ${value}ms`);
    return;
  }

  window.gtag('event', 'timing_complete', {
    name: name,
    value: value,
    event_category: category || 'performance'
  });

  console.log(`Analytics: Timing tracked - ${name}: ${value}ms`);
};

// Track errors
export const trackError = (error: Error, fatal: boolean = false): void => {
  if (!isAnalyticsEnabled()) {
    console.log(`Analytics: Error (not tracked - not in production) - ${error.message}`);
    return;
  }

  window.gtag('event', 'exception', {
    description: error.message,
    fatal: fatal,
    event_category: 'error'
  });

  console.log(`Analytics: Error tracked - ${error.message}`);
};

// Additional analytics functions
export const trackPageNavigation = (pagePath: string, pageTitle?: string): void => {
  trackPageView(pagePath, pageTitle);
};

export const trackRouteChange = (from: string, to: string): void => {
  trackEvent('route_change', {
    from_route: from,
    to_route: to,
    event_category: 'navigation'
  });
};

export const trackPageLoadTime = (loadTime: number, pagePath: string): void => {
  trackTiming('page_load', loadTime, 'performance');
  trackEvent('page_load_time', {
    load_time: loadTime,
    page_path: pagePath,
    event_category: 'performance'
  });
};

// Declare global types for TypeScript
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}
