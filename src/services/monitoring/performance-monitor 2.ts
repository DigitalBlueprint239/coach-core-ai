// Performance monitoring service for Coach Core AI
export interface PerformanceMetric {
  componentName: string;
  renderTime: number;
  timestamp: number;
  userAgent: string;
  url: string;
}

export interface UserInteractionMetric {
  action: string;
  responseTime: number;
  timestamp: number;
  componentName?: string;
  success: boolean;
}

export interface BundleMetric {
  chunkName: string;
  size: number;
  loadTime: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private interactionMetrics: UserInteractionMetric[] = [];
  private bundleMetrics: BundleMetric[] = [];
  private isEnabled: boolean = true;
  private maxMetrics: number = 1000; // Prevent memory leaks

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring() {
    if (typeof window !== 'undefined') {
      // Monitor Core Web Vitals
      this.monitorCoreWebVitals();
      
      // Monitor bundle loading
      this.monitorBundleLoading();
      
      // Monitor long tasks
      this.monitorLongTasks();
      
      console.log('🚀 Performance monitoring initialized');
    }
  }

  private monitorCoreWebVitals() {
    // Monitor Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.trackMetric('LCP', lastEntry.startTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // Monitor First Input Delay (FID)
        const fidObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry) => {
            this.trackMetric('FID', entry.processingStart - entry.startTime);
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // Monitor Cumulative Layout Shift (CLS)
        const clsObserver = new PerformanceObserver((entryList) => {
          let clsValue = 0;
          const entries = entryList.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          this.trackMetric('CLS', clsValue);
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('Performance monitoring setup failed:', error);
      }
    }
  }

  private monitorBundleLoading() {
    // Monitor dynamic imports
    const originalImport = (window as any).import;
    if (originalImport) {
      (window as any).import = async (modulePath: string) => {
        const startTime = performance.now();
        try {
          const result = await originalImport(modulePath);
          const loadTime = performance.now() - startTime;
          this.trackBundleMetric(modulePath, 0, loadTime);
          return result;
        } catch (error) {
          console.error('Dynamic import failed:', error);
          throw error;
        }
      };
    }
  }

  private monitorLongTasks() {
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry) => {
            if (entry.duration > 50) { // Tasks longer than 50ms
              this.trackMetric('LongTask', entry.duration);
            }
          });
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('Long task monitoring setup failed:', error);
      }
    }
  }

  // Track component render performance
  trackComponentRender(componentName: string, renderTime: number) {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      componentName,
      renderTime,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    this.metrics.push(metric);
    this.trimMetrics();

    // Log slow renders in development
    if (__DEV__ && renderTime > 16) { // 16ms = 60fps threshold
      console.warn(`🐌 Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }
  }

  // Track user interactions
  trackUserInteraction(action: string, responseTime: number, componentName?: string, success: boolean = true) {
    if (!this.isEnabled) return;

    const metric: UserInteractionMetric = {
      action,
      responseTime,
      timestamp: Date.now(),
      componentName,
      success,
    };

    this.interactionMetrics.push(metric);
    this.trimMetrics();

    // Log slow interactions in development
    if (__DEV__ && responseTime > 100) { // 100ms threshold for interactions
      console.warn(`🐌 Slow interaction detected: ${action} took ${responseTime.toFixed(2)}ms`);
    }
  }

  // Track bundle metrics
  trackBundleMetric(chunkName: string, size: number, loadTime: number) {
    if (!this.isEnabled) return;

    const metric: BundleMetric = {
      chunkName,
      size,
      loadTime,
      timestamp: Date.now(),
    };

    this.bundleMetrics.push(metric);
    this.trimMetrics();
  }

  // Track custom metrics
  trackMetric(name: string, value: number) {
    if (!this.isEnabled) return;

    // Send to analytics service if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'performance_metric', {
        metric_name: name,
        metric_value: value,
      });
    }
  }

  private trimMetrics() {
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics / 2);
    }
    if (this.interactionMetrics.length > this.maxMetrics) {
      this.interactionMetrics = this.interactionMetrics.slice(-this.maxMetrics / 2);
    }
    if (this.bundleMetrics.length > this.maxMetrics) {
      this.bundleMetrics = this.bundleMetrics.slice(-this.maxMetrics / 2);
    }
  }

  // Generate performance report
  generatePerformanceReport() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    const recentMetrics = this.metrics.filter(m => m.timestamp > oneHourAgo);
    const recentInteractions = this.interactionMetrics.filter(m => m.timestamp > oneHourAgo);

    const avgRenderTime = recentMetrics.length > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.renderTime, 0) / recentMetrics.length 
      : 0;

    const avgResponseTime = recentInteractions.length > 0
      ? recentInteractions.reduce((sum, m) => sum + m.responseTime, 0) / recentInteractions.length
      : 0;

    const slowRenders = recentMetrics.filter(m => m.renderTime > 16).length;
    const slowInteractions = recentInteractions.filter(m => m.responseTime > 100).length;

    return {
      summary: {
        totalMetrics: this.metrics.length,
        totalInteractions: this.interactionMetrics.length,
        avgRenderTime: avgRenderTime.toFixed(2),
        avgResponseTime: avgResponseTime.toFixed(2),
        slowRenders,
        slowInteractions,
        performanceScore: this.calculatePerformanceScore(avgRenderTime, avgResponseTime, slowRenders, slowInteractions),
      },
      recentMetrics: recentMetrics.slice(-10),
      recentInteractions: recentInteractions.slice(-10),
      recommendations: this.generateRecommendations(avgRenderTime, avgResponseTime, slowRenders, slowInteractions),
    };
  }

  private calculatePerformanceScore(avgRender: number, avgResponse: number, slowRenders: number, slowInteractions: number): number {
    let score = 100;
    
    // Deduct points for slow renders
    if (avgRender > 16) score -= Math.min(30, (avgRender - 16) * 2);
    
    // Deduct points for slow interactions
    if (avgResponse > 100) score -= Math.min(30, (avgResponse - 100) * 0.3);
    
    // Deduct points for frequency of slow operations
    score -= Math.min(20, slowRenders * 2);
    score -= Math.min(20, slowInteractions * 2);
    
    return Math.max(0, Math.round(score));
  }

  private generateRecommendations(avgRender: number, avgResponse: number, slowRenders: number, slowInteractions: number): string[] {
    const recommendations: string[] = [];

    if (avgRender > 16) {
      recommendations.push('Consider implementing React.memo for frequently re-rendering components');
      recommendations.push('Review component dependencies and optimize useEffect hooks');
    }

    if (avgResponse > 100) {
      recommendations.push('Optimize API calls and implement request caching');
      recommendations.push('Consider implementing optimistic updates for better perceived performance');
    }

    if (slowRenders > 5) {
      recommendations.push('Implement code splitting for large components');
      recommendations.push('Review and optimize component render logic');
    }

    if (slowInteractions > 5) {
      recommendations.push('Implement debouncing for user input handlers');
      recommendations.push('Review event handler performance and optimize');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is excellent! Keep up the good work! 🚀');
    }

    return recommendations;
  }

  // Enable/disable monitoring
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    console.log(`Performance monitoring ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Clear all metrics
  clearMetrics() {
    this.metrics = [];
    this.interactionMetrics = [];
    this.bundleMetrics = [];
    console.log('Performance metrics cleared');
  }

  // Get current metrics
  getMetrics() {
    return {
      metrics: this.metrics,
      interactionMetrics: this.interactionMetrics,
      bundleMetrics: this.bundleMetrics,
    };
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export for use in components
export default performanceMonitor;


