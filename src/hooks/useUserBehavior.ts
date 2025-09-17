import { useEffect, useCallback, useRef } from 'react';
import { userBehaviorLogger, UserBehaviorEvent, ErrorEvent, BetaFeedback } from '../services/analytics/user-behavior-logger';
import secureLogger from '../utils/secure-logger';

// Hook for user behavior logging
export function useUserBehavior() {
  const loggerRef = useRef(userBehaviorLogger);

  // Log user behavior event
  const logBehavior = useCallback((eventName: string, properties: Record<string, any> = {}) => {
    try {
      loggerRef.current.logBehavior(eventName, properties);
    } catch (error) {
      secureLogger.error('Failed to log behavior', { error, eventName, properties });
    }
  }, []);

  // Log page view
  const logPageView = useCallback((pageName: string, properties: Record<string, any> = {}) => {
    try {
      loggerRef.current.logPageView(pageName, properties);
    } catch (error) {
      secureLogger.error('Failed to log page view', { error, pageName, properties });
    }
  }, []);

  // Log feature usage
  const logFeatureUsage = useCallback((feature: string, action: string, properties: Record<string, any> = {}) => {
    try {
      loggerRef.current.logFeatureUsage(feature, action, properties);
    } catch (error) {
      secureLogger.error('Failed to log feature usage', { error, feature, action, properties });
    }
  }, []);

  // Log error
  const logError = useCallback((errorData: Omit<ErrorEvent, 'userId' | 'sessionId' | 'timestamp' | 'userAgent' | 'url'>) => {
    try {
      loggerRef.current.logError(errorData);
    } catch (error) {
      secureLogger.error('Failed to log error', { error, errorData });
    }
  }, []);

  // Log beta feedback
  const logBetaFeedback = useCallback((feedback: Omit<BetaFeedback, 'userId' | 'sessionId' | 'timestamp' | 'userAgent' | 'url'>) => {
    try {
      loggerRef.current.logBetaFeedback(feedback);
    } catch (error) {
      secureLogger.error('Failed to log beta feedback', { error, feedback });
    }
  }, []);

  // Get session ID
  const getSessionId = useCallback(() => {
    return loggerRef.current.getSessionId();
  }, []);

  // Get queue sizes
  const getQueueSizes = useCallback(() => {
    return loggerRef.current.getQueueSizes();
  }, []);

  return {
    logBehavior,
    logPageView,
    logFeatureUsage,
    logError,
    logBetaFeedback,
    getSessionId,
    getQueueSizes,
  };
}

// Hook for automatic page view logging
export function usePageViewLogging(pageName: string, properties: Record<string, any> = {}) {
  const { logPageView } = useUserBehavior();

  useEffect(() => {
    logPageView(pageName, properties);
  }, [pageName, logPageView, properties]);
}

// Hook for feature usage tracking
export function useFeatureUsageTracking(feature: string) {
  const { logFeatureUsage } = useUserBehavior();

  const trackFeatureUsage = useCallback((action: string, properties: Record<string, any> = {}) => {
    logFeatureUsage(feature, action, properties);
  }, [feature, logFeatureUsage]);

  return { trackFeatureUsage };
}

// Hook for error tracking
export function useErrorTracking(component: string) {
  const { logError } = useUserBehavior();

  const trackError = useCallback((error: Error, action?: string, properties: Record<string, any> = {}) => {
    logError({
      errorType: 'javascript',
      errorMessage: error.message,
      errorStack: error.stack,
      component,
      action: action || 'unknown',
      properties,
      severity: 'medium',
    });
  }, [component, logError]);

  const trackNetworkError = useCallback((error: Error, endpoint: string, properties: Record<string, any> = {}) => {
    logError({
      errorType: 'network',
      errorMessage: error.message,
      errorStack: error.stack,
      component,
      action: 'network_request',
      properties: {
        endpoint,
        ...properties,
      },
      severity: 'high',
    });
  }, [component, logError]);

  const trackFirebaseError = useCallback((error: Error, operation: string, properties: Record<string, any> = {}) => {
    logError({
      errorType: 'firebase',
      errorMessage: error.message,
      errorStack: error.stack,
      component,
      action: operation,
      properties,
      severity: 'high',
    });
  }, [component, logError]);

  return {
    trackError,
    trackNetworkError,
    trackFirebaseError,
  };
}

// Hook for beta feedback
export function useBetaFeedback() {
  const { logBetaFeedback } = useUserBehavior();

  const submitFeedback = useCallback((feedback: Omit<BetaFeedback, 'userId' | 'sessionId' | 'timestamp' | 'userAgent' | 'url'>) => {
    logBetaFeedback(feedback);
  }, [logBetaFeedback]);

  const reportBug = useCallback((feature: string, description: string, stepsToReproduce?: string) => {
    submitFeedback({
      feature,
      rating: 1, // Low rating for bugs
      feedback: description,
      category: 'bug',
      priority: 'high',
      stepsToReproduce,
    });
  }, [submitFeedback]);

  const requestFeature = useCallback((feature: string, description: string, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium') => {
    submitFeedback({
      feature,
      rating: 5, // High rating for feature requests
      feedback: description,
      category: 'feature_request',
      priority,
    });
  }, [submitFeedback]);

  const rateFeature = useCallback((feature: string, rating: number, feedback: string) => {
    submitFeedback({
      feature,
      rating,
      feedback,
      category: 'general',
      priority: 'low',
    });
  }, [submitFeedback]);

  return {
    submitFeedback,
    reportBug,
    requestFeature,
    rateFeature,
  };
}

// Hook for performance tracking
export function usePerformanceTracking(component: string) {
  const { logBehavior } = useUserBehavior();

  const trackPerformance = useCallback((metric: string, value: number, properties: Record<string, any> = {}) => {
    logBehavior('performance_metric', {
      component,
      metric,
      value,
      ...properties,
    });
  }, [component, logBehavior]);

  const trackRenderTime = useCallback((renderTime: number) => {
    trackPerformance('render_time', renderTime);
  }, [trackPerformance]);

  const trackLoadTime = useCallback((loadTime: number) => {
    trackPerformance('load_time', loadTime);
  }, [trackPerformance]);

  const trackUserInteraction = useCallback((interaction: string, duration: number) => {
    trackPerformance('user_interaction', duration, { interaction });
  }, [trackPerformance]);

  return {
    trackPerformance,
    trackRenderTime,
    trackLoadTime,
    trackUserInteraction,
  };
}

export default useUserBehavior;
