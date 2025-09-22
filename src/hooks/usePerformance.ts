import { useEffect, useRef, useCallback, useMemo } from 'react';
import performanceMonitor, { PerformanceMetric, UserInteractionMetric } from '../services/monitoring/performance-monitor';

export interface UsePerformanceOptions {
  componentName: string;
  trackRenders?: boolean;
  trackInteractions?: boolean;
  trackMountTime?: boolean;
  enableLogging?: boolean;
}

export interface PerformanceData {
  renderCount: number;
  avgRenderTime: number;
  mountTime: number;
  lastRenderTime: number;
  performanceScore: number;
}

export const usePerformance = (options: UsePerformanceOptions) => {
  const {
    componentName,
    trackRenders = true,
    trackInteractions = true,
    trackMountTime = true,
    enableLogging = process.env.NODE_ENV === 'development',
  } = options;

  const renderCount = useRef(0);
  const renderTimes = useRef<number[]>([]);
  const mountStartTime = useRef<number>(Date.now());
  const lastRenderStart = useRef<number>(0);

  // Track component mount time
  useEffect(() => {
    if (trackMountTime) {
      const mountTime = Date.now() - mountStartTime.current;
      performanceMonitor.trackMetric(`${componentName}_Mount`, mountTime);
      
      if (enableLogging) {
        console.log(`🚀 ${componentName} mounted in ${mountTime.toFixed(2)}ms`);
      }
    }
  }, [componentName, trackMountTime, enableLogging]);

  // Track render performance - use ref to avoid dependency issues
  const trackRenderPerformance = useCallback(() => {
    if (trackRenders) {
      const renderTime = Date.now() - lastRenderStart.current;
      if (renderTime > 0) {
        renderCount.current++;
        renderTimes.current.push(renderTime);
        
        // Keep only last 10 render times to prevent memory leaks
        if (renderTimes.current.length > 10) {
          renderTimes.current = renderTimes.current.slice(-10);
        }
        
        performanceMonitor.trackComponentRender(componentName, renderTime);
        
        if (enableLogging && renderTime > 16) {
          console.warn(`🐌 ${componentName} render #${renderCount.current} took ${renderTime.toFixed(2)}ms`);
        }
      }
    }
  }, [trackRenders, componentName, enableLogging]);

  // Use a ref to track renders without causing re-renders
  const renderTrackerRef = useRef<() => void>();
  renderTrackerRef.current = trackRenderPerformance;

  // Track renders using a separate effect that doesn't cause re-renders
  useEffect(() => {
    if (renderTrackerRef.current) {
      renderTrackerRef.current();
    }
  }); // No dependency array - runs after every render but doesn't cause re-renders

  // Track render start time
  useEffect(() => {
    lastRenderStart.current = Date.now();
  }, []); // Only run once on mount

  // Track user interactions
  const trackInteraction = useCallback((
    action: string,
    responseTime: number,
    success: boolean = true
  ) => {
    if (trackInteractions) {
      performanceMonitor.trackUserInteraction(action, responseTime, componentName, success);
      
      if (enableLogging && responseTime > 100) {
        console.warn(`🐌 ${componentName} interaction "${action}" took ${responseTime.toFixed(2)}ms`);
      }
    }
  }, [componentName, trackInteractions, enableLogging]);

  // Track async operations
  const trackAsyncOperation = useCallback(async <T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      trackInteraction(operationName, duration, true);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      trackInteraction(operationName, duration, false);
      throw error;
    }
  }, [trackInteraction]);

  // Calculate performance metrics
  const performanceData = useMemo((): PerformanceData => {
    const avgRenderTime = renderTimes.current.length > 0
      ? renderTimes.current.reduce((sum, time) => sum + time, 0) / renderTimes.current.length
      : 0;

    const lastRenderTime = renderTimes.current.length > 0
      ? renderTimes.current[renderTimes.current.length - 1]
      : 0;

    const mountTime = Date.now() - mountStartTime.current;

    // Calculate performance score (0-100)
    let score = 100;
    if (avgRenderTime > 16) score -= Math.min(30, (avgRenderTime - 16) * 2);
    if (renderCount.current > 10) score -= Math.min(20, (renderCount.current - 10) * 2);
    if (mountTime > 1000) score -= Math.min(20, (mountTime - 1000) / 100);

    return {
      renderCount: renderCount.current,
      avgRenderTime: Number(avgRenderTime.toFixed(2)),
      mountTime: Number(mountTime.toFixed(2)),
      lastRenderTime: Number(lastRenderTime.toFixed(2)),
      performanceScore: Math.max(0, Math.round(score)),
    };
  }, [renderCount.current, renderTimes.current, mountStartTime.current]);

  // Performance optimization helpers
  const memoizeValue = useCallback(<T>(value: T, deps: any[]): T => {
    return useMemo(() => value, deps);
  }, []);

  const debounceCallback = useCallback(<T extends (...args: any[]) => any>(
    callback: T,
    delay: number
  ): T => {
    const timeoutRef = useRef<NodeJS.Timeout>();
    
    return useCallback((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }, [callback, delay]) as T;
  }, []);

  const throttleCallback = useCallback(<T extends (...args: any[]) => any>(
    callback: T,
    delay: number
  ): T => {
    const lastCallRef = useRef<number>(0);
    
    return useCallback((...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        callback(...args);
      }
    }, [callback, delay]) as T;
  }, []);

  return {
    // Performance tracking
    trackInteraction,
    trackAsyncOperation,
    
    // Performance data
    performanceData,
    
    // Performance optimization helpers
    memoizeValue,
    debounceCallback,
    throttleCallback,
    
    // Raw data for advanced usage
    renderCount: renderCount.current,
    renderTimes: renderTimes.current,
    mountTime: Date.now() - mountStartTime.current,
  };
};

// Hook for tracking specific performance metrics
export const usePerformanceMetric = (metricName: string, value: number) => {
  useEffect(() => {
    performanceMonitor.trackMetric(metricName, value);
  }, [metricName, value]);
};

// Hook for tracking component lifecycle
export const useComponentLifecycle = (componentName: string) => {
  const mountTime = useRef<number>(Date.now());
  
  useEffect(() => {
    const mountDuration = Date.now() - mountTime.current;
    performanceMonitor.trackMetric(`${componentName}_Mount`, mountDuration);
    
    return () => {
      const unmountTime = Date.now() - mountTime.current;
      performanceMonitor.trackMetric(`${componentName}_Unmount`, unmountTime);
    };
  }, [componentName]);
};

export default usePerformance;


