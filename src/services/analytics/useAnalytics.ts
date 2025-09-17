import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  trackPageNavigation, 
  trackRouteChange, 
  trackPageLoadTime,
  isAnalyticsEnabled 
} from './analytics-config';

// Custom hook for analytics in React components
export const useAnalytics = () => {
  const location = useLocation();
  const isEnabled = isAnalyticsEnabled();

  // Track page navigation on route change
  useEffect(() => {
    if (!isEnabled) return;

    const startTime = performance.now();
    
    // Track page view
    trackPageNavigation(location.pathname, document.title);
    
    // Track page load time
    const handleLoad = () => {
      const loadTime = performance.now() - startTime;
      trackPageLoadTime(location.pathname, loadTime);
    };

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(handleLoad);
  }, [location.pathname, isEnabled]);

  // Track route changes
  useEffect(() => {
    if (!isEnabled) return;

    // Get previous route from sessionStorage
    const previousRoute = sessionStorage.getItem('previousRoute');
    const currentRoute = location.pathname;

    if (previousRoute && previousRoute !== currentRoute) {
      trackRouteChange(previousRoute, currentRoute);
    }

    // Store current route for next navigation
    sessionStorage.setItem('previousRoute', currentRoute);
  }, [location.pathname, isEnabled]);

  // Track component performance
  const trackComponentPerformance = useCallback((componentName: string, renderTime: number) => {
    if (!isEnabled) return;
    
    // Import here to avoid circular dependency
    import('./analytics-events').then(({ trackComponentRenderTime }) => {
      trackComponentRenderTime(componentName, renderTime);
    });
  }, [isEnabled]);

  // Track user interactions
  const trackInteraction = useCallback((action: string, details?: Record<string, any>) => {
    if (!isEnabled) return;
    
    // Import here to avoid circular dependency
    import('./analytics-events').then(({ trackEvent, EVENT_CATEGORIES }) => {
      trackEvent('user_interaction', {
        event_category: EVENT_CATEGORIES.USER,
        event_label: action,
        ...details,
        timestamp: new Date().toISOString()
      });
    });
  }, [isEnabled]);

  // Track errors
  const trackError = useCallback((error: Error, context?: Record<string, any>) => {
    if (!isEnabled) return;
    
    // Import here to avoid circular dependency
    import('./analytics-events').then(({ trackAppError }) => {
      trackAppError(error, context?.component, context?.action);
    });
  }, [isEnabled]);

  return {
    isEnabled,
    trackComponentPerformance,
    trackInteraction,
    trackError
  };
};

