import { useEffect, useRef, useCallback } from 'react';
import { performanceMonitor } from '../services/monitoring/performance-monitor';
import { trace, getTrace } from 'firebase/performance';
import * as Sentry from '@sentry/react';
import secureLogger from '../utils/secure-logger';

// ============================================
// PERFORMANCE MONITORING HOOK
// ============================================

export interface PerformanceMetrics {
  coreWebVitals: Record<string, any>;
  customMetrics: Map<string, any>;
  alerts: any[];
  score: number;
}

export interface UsePerformanceMonitoringOptions {
  trackPageLoad?: boolean;
  trackUserInteractions?: boolean;
  trackMemoryUsage?: boolean;
  trackResourceLoading?: boolean;
  alertThresholds?: {
    LCP?: number;
    FID?: number;
    CLS?: number;
    FCP?: number;
    TTFB?: number;
    INP?: number;
  };
}

export function usePerformanceMonitoring(
  componentName: string,
  options: UsePerformanceMonitoringOptions = {}
) {
  const {
    trackPageLoad = true,
    trackUserInteractions = true,
    trackMemoryUsage = false,
    trackResourceLoading = true,
    alertThresholds = {},
  } = options;

  const traceRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  // ============================================
  // COMPONENT RENDER TRACKING
  // ============================================

  const startRenderTrace = useCallback(() => {
    try {
      const perf = getPerformance();
      if (perf) {
        traceRef.current = getTrace(perf, `component_render_${componentName}`);
        startTimeRef.current = performance.now();
        secureLogger.debug(`Started render trace for ${componentName}`);
      }
    } catch (error) {
      secureLogger.error('Failed to start render trace', { componentName, error });
    }
  }, [componentName]);

  const endRenderTrace = useCallback(() => {
    try {
      if (traceRef.current) {
        const renderTime = performance.now() - startTimeRef.current;
        traceRef.current.putMetric('render_time', renderTime);
        traceRef.current.stop();
        
        // Track custom metric
        performanceMonitor.trackCustomMetric(`component_render_${componentName}`, renderTime, {
          component: componentName,
          type: 'render',
        });

        secureLogger.debug(`Ended render trace for ${componentName}`, { renderTime });
        traceRef.current = null;
      }
    } catch (error) {
      secureLogger.error('Failed to end render trace', { componentName, error });
    }
  }, [componentName]);

  // ============================================
  // USER INTERACTION TRACKING
  // ============================================

  const trackUserInteraction = useCallback((action: string, data?: any) => {
    try {
      const startTime = performance.now();
      
      // Track with Firebase Performance
      const perf = getPerformance();
      if (perf) {
        const trace = getTrace(perf, `user_interaction_${componentName}_${action}`);
        trace.putMetric('interaction_time', 0);
        trace.stop();
      }

      // Track with Sentry
      Sentry.addBreadcrumb({
        message: `User interaction: ${action}`,
        category: 'user',
        data: {
          component: componentName,
          action,
          ...data,
        },
        level: 'info',
      });

      // Track custom metric
      performanceMonitor.trackCustomMetric(`user_interaction_${componentName}_${action}`, 0, {
        component: componentName,
        action,
        ...data,
      });

      secureLogger.debug(`Tracked user interaction: ${action}`, { componentName, data });
    } catch (error) {
      secureLogger.error('Failed to track user interaction', { componentName, action, error });
    }
  }, [componentName]);

  // ============================================
  // API CALL TRACKING
  // ============================================

  const trackApiCall = useCallback((apiName: string, startTime?: number) => {
    const callStartTime = startTime || performance.now();
    
    return {
      end: (success: boolean = true, error?: any) => {
        try {
          const duration = performance.now() - callStartTime;
          
          // Track with Firebase Performance
          const perf = getPerformance();
          if (perf) {
            const trace = getTrace(perf, `api_call_${apiName}`);
            trace.putMetric('duration', duration);
            trace.putMetric('success', success ? 1 : 0);
            trace.stop();
          }

          // Track with Sentry
          Sentry.addBreadcrumb({
            message: `API call: ${apiName}`,
            category: 'http',
            data: {
              component: componentName,
              api: apiName,
              duration,
              success,
              error: error?.message,
            },
            level: success ? 'info' : 'error',
          });

          // Track custom metric
          performanceMonitor.trackCustomMetric(`api_call_${apiName}`, duration, {
            component: componentName,
            api: apiName,
            success: success.toString(),
          });

          secureLogger.debug(`Tracked API call: ${apiName}`, { 
            componentName, 
            duration, 
            success, 
            error: error?.message 
          });
        } catch (err) {
          secureLogger.error('Failed to track API call', { componentName, apiName, error: err });
        }
      },
    };
  }, [componentName]);

  // ============================================
  // CUSTOM METRIC TRACKING
  // ============================================

  const trackCustomMetric = useCallback((name: string, value: number, tags?: Record<string, string>) => {
    try {
      performanceMonitor.trackCustomMetric(`${componentName}_${name}`, value, {
        component: componentName,
        ...tags,
      });

      secureLogger.debug(`Tracked custom metric: ${name}`, { componentName, value, tags });
    } catch (error) {
      secureLogger.error('Failed to track custom metric', { componentName, name, error });
    }
  }, [componentName]);

  // ============================================
  // PERFORMANCE DATA ACCESS
  // ============================================

  const getPerformanceData = useCallback((): PerformanceMetrics => {
    return {
      coreWebVitals: performanceMonitor.getCoreWebVitals(),
      customMetrics: performanceMonitor.getPerformanceData(),
      alerts: performanceMonitor.getAlerts(),
      score: performanceMonitor.getPerformanceScore(),
    };
  }, []);

  // ============================================
  // EFFECTS
  // ============================================

  // Initialize performance monitoring
  useEffect(() => {
    performanceMonitor.initialize();
  }, []);

  // Track page load
  useEffect(() => {
    if (trackPageLoad) {
      const handlePageLoad = () => {
        performanceMonitor.trackCustomMetric(`page_load_${componentName}`, 0, {
          component: componentName,
          type: 'page_load',
        });
      };

      if (document.readyState === 'complete') {
        handlePageLoad();
      } else {
        window.addEventListener('load', handlePageLoad);
        return () => window.removeEventListener('load', handlePageLoad);
      }
    }
  }, [componentName, trackPageLoad]);

  // Track memory usage
  useEffect(() => {
    if (trackMemoryUsage && 'memory' in performance) {
      const interval = setInterval(() => {
        const memory = (performance as any).memory;
        performanceMonitor.trackCustomMetric(`memory_${componentName}`, memory.usedJSHeapSize, {
          component: componentName,
          type: 'memory',
        });
      }, 30000); // Every 30 seconds

      return () => clearInterval(interval);
    }
  }, [componentName, trackMemoryUsage]);

  // ============================================
  // RETURN API
  // ============================================

  return {
    // Render tracking
    startRenderTrace,
    endRenderTrace,
    
    // User interaction tracking
    trackUserInteraction,
    
    // API call tracking
    trackApiCall,
    
    // Custom metric tracking
    trackCustomMetric,
    
    // Performance data access
    getPerformanceData,
    
    // Performance monitor instance
    performanceMonitor,
  };
}

// ============================================
// CONVENIENCE HOOKS
// ============================================

// Hook for page-level performance monitoring
export function usePagePerformanceMonitoring(pageName: string) {
  return usePerformanceMonitoring(pageName, {
    trackPageLoad: true,
    trackUserInteractions: true,
    trackMemoryUsage: true,
    trackResourceLoading: true,
  });
}

// Hook for component-level performance monitoring
export function useComponentPerformanceMonitoring(componentName: string) {
  return usePerformanceMonitoring(componentName, {
    trackPageLoad: false,
    trackUserInteractions: true,
    trackMemoryUsage: false,
    trackResourceLoading: false,
  });
}

// Hook for API performance monitoring
export function useApiPerformanceMonitoring(apiName: string) {
  return usePerformanceMonitoring(apiName, {
    trackPageLoad: false,
    trackUserInteractions: false,
    trackMemoryUsage: false,
    trackResourceLoading: false,
  });
}

export default usePerformanceMonitoring;
