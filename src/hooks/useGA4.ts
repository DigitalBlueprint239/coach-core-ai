import { useEffect, useCallback, useRef } from 'react';
import { ga4Service, FunnelEvent, CustomEventParams, MarketingAttribution } from '../services/analytics/ga4-config';
import secureLogger from '../utils/secure-logger';

// Hook for Google Analytics 4
export function useGA4() {
  const serviceRef = useRef(ga4Service);

  // Set user ID
  const setUserId = useCallback((userId: string) => {
    try {
      serviceRef.current.setUserId(userId);
    } catch (error) {
      secureLogger.error('Failed to set GA4 user ID', { error, userId });
    }
  }, []);

  // Set user properties
  const setUserProperties = useCallback((properties: Record<string, any>) => {
    try {
      serviceRef.current.setUserProperties(properties);
    } catch (error) {
      secureLogger.error('Failed to set GA4 user properties', { error, properties });
    }
  }, []);

  // Log custom event
  const logEvent = useCallback((eventName: string, parameters?: CustomEventParams) => {
    try {
      serviceRef.current.logEvent(eventName, parameters);
    } catch (error) {
      secureLogger.error('Failed to log GA4 event', { error, eventName, parameters });
    }
  }, []);

  // Log funnel event
  const logFunnelEvent = useCallback((event: FunnelEvent, parameters?: CustomEventParams) => {
    try {
      serviceRef.current.logFunnelEvent(event, parameters);
    } catch (error) {
      secureLogger.error('Failed to log GA4 funnel event', { error, event, parameters });
    }
  }, []);

  // Track page view
  const trackPageView = useCallback((pageName: string, parameters?: CustomEventParams) => {
    try {
      serviceRef.current.trackPageView(pageName, parameters);
    } catch (error) {
      secureLogger.error('Failed to track GA4 page view', { error, pageName, parameters });
    }
  }, []);

  // Track signup submission
  const trackSignupSubmitted = useCallback((parameters?: CustomEventParams) => {
    try {
      serviceRef.current.trackSignupSubmitted(parameters);
    } catch (error) {
      secureLogger.error('Failed to track GA4 signup submission', { error, parameters });
    }
  }, []);

  // Track beta activation
  const trackBetaActivated = useCallback((parameters?: CustomEventParams) => {
    try {
      serviceRef.current.trackBetaActivated(parameters);
    } catch (error) {
      secureLogger.error('Failed to track GA4 beta activation', { error, parameters });
    }
  }, []);

  // Track subscription started
  const trackSubscriptionStarted = useCallback((parameters?: CustomEventParams) => {
    try {
      serviceRef.current.trackSubscriptionStarted(parameters);
    } catch (error) {
      secureLogger.error('Failed to track GA4 subscription started', { error, parameters });
    }
  }, []);

  // Track subscription completed
  const trackSubscriptionCompleted = useCallback((parameters?: CustomEventParams) => {
    try {
      serviceRef.current.trackSubscriptionCompleted(parameters);
    } catch (error) {
      secureLogger.error('Failed to track GA4 subscription completed', { error, parameters });
    }
  }, []);

  // Track subscription canceled
  const trackSubscriptionCanceled = useCallback((parameters?: CustomEventParams) => {
    try {
      serviceRef.current.trackSubscriptionCanceled(parameters);
    } catch (error) {
      secureLogger.error('Failed to track GA4 subscription canceled', { error, parameters });
    }
  }, []);

  // Track trial started
  const trackTrialStarted = useCallback((parameters?: CustomEventParams) => {
    try {
      serviceRef.current.trackTrialStarted(parameters);
    } catch (error) {
      secureLogger.error('Failed to track GA4 trial started', { error, parameters });
    }
  }, []);

  // Track trial ended
  const trackTrialEnded = useCallback((parameters?: CustomEventParams) => {
    try {
      serviceRef.current.trackTrialEnded(parameters);
    } catch (error) {
      secureLogger.error('Failed to track GA4 trial ended', { error, parameters });
    }
  }, []);

  // Track conversion
  const trackConversion = useCallback((parameters?: CustomEventParams) => {
    try {
      serviceRef.current.trackConversion(parameters);
    } catch (error) {
      secureLogger.error('Failed to track GA4 conversion', { error, parameters });
    }
  }, []);

  // Get marketing attribution
  const getMarketingAttribution = useCallback((): MarketingAttribution | null => {
    try {
      return serviceRef.current.getMarketingAttribution();
    } catch (error) {
      secureLogger.error('Failed to get GA4 marketing attribution', { error });
      return null;
    }
  }, []);

  // Check if GA4 is ready
  const isReady = useCallback((): boolean => {
    return serviceRef.current.isReady();
  }, []);

  // Get debug information
  const getDebugInfo = useCallback(() => {
    return serviceRef.current.getDebugInfo();
  }, []);

  return {
    setUserId,
    setUserProperties,
    logEvent,
    logFunnelEvent,
    trackPageView,
    trackSignupSubmitted,
    trackBetaActivated,
    trackSubscriptionStarted,
    trackSubscriptionCompleted,
    trackSubscriptionCanceled,
    trackTrialStarted,
    trackTrialEnded,
    trackConversion,
    getMarketingAttribution,
    isReady,
    getDebugInfo,
  };
}

// Hook for automatic page view tracking
export function usePageViewTracking(pageName: string, parameters?: CustomEventParams) {
  const { trackPageView } = useGA4();

  useEffect(() => {
    trackPageView(pageName, parameters);
  }, [pageName, trackPageView, parameters]);
}

// Hook for funnel tracking
export function useFunnelTracking() {
  const {
    trackSignupSubmitted,
    trackBetaActivated,
    trackSubscriptionStarted,
    trackSubscriptionCompleted,
    trackSubscriptionCanceled,
    trackTrialStarted,
    trackTrialEnded,
    trackConversion,
  } = useGA4();

  return {
    trackSignupSubmitted,
    trackBetaActivated,
    trackSubscriptionStarted,
    trackSubscriptionCompleted,
    trackSubscriptionCanceled,
    trackTrialStarted,
    trackTrialEnded,
    trackConversion,
  };
}

// Hook for conversion tracking
export function useConversionTracking() {
  const { trackConversion, trackSubscriptionStarted, trackSubscriptionCompleted } = useGA4();

  const trackSubscriptionConversion = useCallback((tier: string, value: number, currency: string = 'USD') => {
    trackSubscriptionStarted({
      subscription_tier: tier,
      value: value,
      currency: currency,
      event_category: 'ecommerce',
      event_label: 'subscription_conversion',
    });
  }, [trackSubscriptionStarted]);

  const trackPurchaseConversion = useCallback((itemId: string, itemName: string, value: number, currency: string = 'USD') => {
    trackConversion({
      item_id: itemId,
      item_name: itemName,
      value: value,
      currency: currency,
      event_category: 'ecommerce',
      event_label: 'purchase_conversion',
    });
  }, [trackConversion]);

  return {
    trackConversion,
    trackSubscriptionConversion,
    trackPurchaseConversion,
  };
}

// Hook for marketing attribution
export function useMarketingAttribution() {
  const { getMarketingAttribution, logEvent } = useGA4();

  const trackMarketingEvent = useCallback((eventName: string, parameters?: CustomEventParams) => {
    const attribution = getMarketingAttribution();
    
    if (attribution) {
      logEvent(eventName, {
        ...parameters,
        marketing_campaign: attribution.campaign,
        marketing_source: attribution.source,
        marketing_medium: attribution.medium,
        marketing_content: attribution.content,
        marketing_term: attribution.term,
      });
    } else {
      logEvent(eventName, parameters);
    }
  }, [getMarketingAttribution, logEvent]);

  const getAttributionData = useCallback(() => {
    return getMarketingAttribution();
  }, [getMarketingAttribution]);

  return {
    trackMarketingEvent,
    getAttributionData,
  };
}

export default useGA4;
