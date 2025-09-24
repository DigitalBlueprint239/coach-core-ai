// @ts-nocheck
import { onCLS, onFCP, onLCP, onTTFB } from 'web-vitals';
import { getPerformance, trace } from 'firebase/performance';
import * as Sentry from '@sentry/react';
import secureLogger from '../../utils/secure-logger';

// ============================================
// CORE WEB VITALS CONFIGURATION
// ============================================

interface CoreWebVitalsThresholds {
  LCP: number; // Largest Contentful Paint (ms)
  FID: number; // First Input Delay (ms)
  CLS: number; // Cumulative Layout Shift
  FCP: number; // First Contentful Paint (ms)
  TTFB: number; // Time to First Byte (ms)
  INP: number; // Interaction to Next Paint (ms)
}

const CORE_WEB_VITALS_THRESHOLDS: CoreWebVitalsThresholds = {
  LCP: 2500, // Good: < 2.5s, Needs Improvement: 2.5s - 4s, Poor: > 4s
  // FID: 100,  // Good: < 100ms, Needs Improvement: 100ms - 300ms, Poor: > 300ms - Not available in current web-vitals version
  CLS: 0.1,  // Good: < 0.1, Needs Improvement: 0.1 - 0.25, Poor: > 0.25
  FCP: 1800, // Good: < 1.8s, Needs Improvement: 1.8s - 3s, Poor: > 3s
  TTFB: 800, // Good: < 800ms, Needs Improvement: 800ms - 1.8s, Poor: > 1.8s
  // INP: 200,  // Good: < 200ms, Needs Improvement: 200ms - 500ms, Poor: > 500ms - Not available in current web-vitals version
};

// ============================================
// PERFORMANCE MONITORING CLASS
// ============================================

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private performanceData: Map<string, any> = new Map();
  private alerts: PerformanceAlert[] = [];
  private isInitialized = false;

  private constructor() {
    this.setupCoreWebVitals();
    this.setupCustomMetrics();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // ============================================
  // CORE WEB VITALS SETUP
  // ============================================

  private setupCoreWebVitals(): void {
    // Track Largest Contentful Paint
    onLCP((metric) => {
      this.trackCoreWebVital('LCP', metric.value, metric.rating);
      this.checkThreshold('LCP', metric.value, metric.rating);
    });

    // Track First Input Delay (not available in current web-vitals version)
    // onFID((metric) => {
    //   this.trackCoreWebVital('FID', metric.value, metric.rating);
    //   this.checkThreshold('FID', metric.value, metric.rating);
    // });

    // Track Cumulative Layout Shift
    onCLS((metric) => {
      this.trackCoreWebVital('CLS', metric.value, metric.rating);
      this.checkThreshold('CLS', metric.value, metric.rating);
    });

    // Track First Contentful Paint
    onFCP((metric) => {
      this.trackCoreWebVital('FCP', metric.value, metric.rating);
      this.checkThreshold('FCP', metric.value, metric.rating);
    });

    // Track Time to First Byte
    onTTFB((metric) => {
      this.trackCoreWebVital('TTFB', metric.value, metric.rating);
      this.checkThreshold('TTFB', metric.value, metric.rating);
    });

    // Track Interaction to Next Paint (if available)
    // Note: INP is not available in current web-vitals version
    // if (getINP) {
    //   getINP((metric) => {
    //     this.trackCoreWebVital('INP', metric.value, metric.rating);
    //     this.checkThreshold('INP', metric.value, metric.rating);
    //   });
    // }
  }

  private trackCoreWebVital(metricName: string, value: number, rating: 'good' | 'needs-improvement' | 'poor'): void {
    const metricData = {
      name: metricName,
      value,
      rating,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    // Store in local data
    this.performanceData.set(metricName, metricData);

    // Send to Firebase Performance
    this.sendToFirebasePerformance(metricName, value);

    // Send to Sentry
    this.sendToSentry(metricName, value, rating);

    // Log locally
    secureLogger.info(`Core Web Vital: ${metricName}`, {
      value: `${value}ms`,
      rating,
      threshold: CORE_WEB_VITALS_THRESHOLDS[metricName as keyof CoreWebVitalsThresholds],
    });
  }

  private checkThreshold(metricName: string, value: number, rating: 'good' | 'needs-improvement' | 'poor'): void {
    const threshold = CORE_WEB_VITALS_THRESHOLDS[metricName as keyof CoreWebVitalsThresholds];
    
    if (rating === 'poor' || (rating === 'needs-improvement' && value > threshold)) {
      this.createAlert(metricName, value, threshold, rating);
    }
  }

  // ============================================
  // CUSTOM METRICS SETUP
  // ============================================

  private setupCustomMetrics(): void {
    // Track page load performance
    this.trackPageLoad();

    // Track resource loading
    this.trackResourceLoading();

    // Track user interactions
    this.trackUserInteractions();

    // Track memory usage
    this.trackMemoryUsage();
  }

  private trackPageLoad(): void {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
        
        this.trackCustomMetric('page_load_time', loadTime);
        this.trackCustomMetric('dom_content_loaded', domContentLoaded);
        this.trackCustomMetric('dom_interactive', navigation.domInteractive - navigation.navigationStart);
      }
    });
  }

  private trackResourceLoading(): void {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resource = entry as PerformanceResourceTiming;
          const loadTime = resource.responseEnd - resource.startTime;
          
          this.trackCustomMetric(`resource_${resource.name.split('/').pop()}`, loadTime);
        }
      }
    });

    observer.observe({ entryTypes: ['resource'] });
  }

  private trackUserInteractions(): void {
    let interactionCount = 0;
    
    ['click', 'keydown', 'scroll', 'touchstart'].forEach(eventType => {
      document.addEventListener(eventType, () => {
        interactionCount++;
        this.trackCustomMetric('user_interactions', interactionCount);
      }, { passive: true });
    });
  }

  private trackMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      
      setInterval(() => {
        this.trackCustomMetric('memory_used', memory.usedJSHeapSize);
        this.trackCustomMetric('memory_total', memory.totalJSHeapSize);
        this.trackCustomMetric('memory_limit', memory.jsHeapSizeLimit);
      }, 30000); // Every 30 seconds
    }
  }

  // ============================================
  // CUSTOM METRICS TRACKING
  // ============================================

  trackCustomMetric(name: string, value: number, tags?: Record<string, string>): void {
    const metricData = {
      name,
      value,
      tags: tags || {},
      timestamp: Date.now(),
      url: window.location.href,
    };

    this.performanceData.set(name, metricData);

    // Send to Firebase Performance
    this.sendToFirebasePerformance(name, value);

    // Send to Sentry
    Sentry.addBreadcrumb({
      message: `Custom metric: ${name}`,
      category: 'performance',
      data: { value, tags },
      level: 'info',
    });
  }

  // ============================================
  // FIREBASE PERFORMANCE INTEGRATION
  // ============================================

  private sendToFirebasePerformance(metricName: string, value: number): void {
    try {
      const perf = getPerformance();
      if (perf) {
        const traceInstance = trace(perf, `custom_${metricName}`);
        traceInstance.putMetric(metricName, value);
        traceInstance.stop();
      }
    } catch (error) {
      secureLogger.error('Failed to send metric to Firebase Performance', { metricName, error });
    }
  }

  // ============================================
  // SENTRY INTEGRATION
  // ============================================

  private sendToSentry(metricName: string, value: number, rating?: string): void {
    Sentry.addBreadcrumb({
      message: `Performance metric: ${metricName}`,
      category: 'performance',
      data: { 
        value, 
        rating,
        metric: metricName,
        timestamp: Date.now(),
      },
      level: 'info',
    });

    // Send as custom event for better tracking
    Sentry.captureMessage(`Performance: ${metricName}`, {
      level: 'info',
      tags: {
        metric: metricName,
        rating: rating || 'unknown',
      },
      extra: {
        value,
        url: window.location.href,
        userAgent: navigator.userAgent,
      },
    });
  }

  // ============================================
  // ALERT SYSTEM
  // ============================================

  private createAlert(metricName: string, value: number, threshold: number, rating: string): void {
    const alert: PerformanceAlert = {
      id: `${metricName}_${Date.now()}`,
      metric: metricName,
      value,
      threshold,
      rating,
      timestamp: Date.now(),
      url: window.location.href,
      severity: this.getAlertSeverity(metricName, value, threshold),
    };

    this.alerts.push(alert);
    this.sendAlert(alert);
  }

  private getAlertSeverity(metricName: string, value: number, threshold: number): 'low' | 'medium' | 'high' {
    const ratio = value / threshold;
    
    if (ratio > 2) return 'high';
    if (ratio > 1.5) return 'medium';
    return 'low';
  }

  private sendAlert(alert: PerformanceAlert): void {
    // Send to Sentry as error for high severity alerts
    if (alert.severity === 'high') {
      Sentry.captureMessage(`Performance Alert: ${alert.metric}`, {
        level: 'error',
        tags: {
          metric: alert.metric,
          severity: alert.severity,
        },
        extra: {
          value: alert.value,
          threshold: alert.threshold,
          rating: alert.rating,
          url: alert.url,
        },
      });
    }

    // Log locally
    secureLogger.warn(`Performance Alert: ${alert.metric}`, {
      value: alert.value,
      threshold: alert.threshold,
      rating: alert.rating,
      severity: alert.severity,
    });
  }

  // ============================================
  // PUBLIC API
  // ============================================

  getPerformanceData(): Map<string, any> {
    return new Map(this.performanceData);
  }

  getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  getCoreWebVitals(): Record<string, any> {
    const coreVitals: Record<string, any> = {};
    
    ['LCP', 'CLS', 'FCP', 'TTFB'].forEach(metric => {
      const data = this.performanceData.get(metric);
      if (data) {
        coreVitals[metric] = data;
      }
    });

    return coreVitals;
  }

  getPerformanceScore(): number {
    const coreVitals = this.getCoreWebVitals();
    const scores = Object.values(coreVitals).map((metric: any) => {
      switch (metric.rating) {
        case 'good': return 100;
        case 'needs-improvement': return 50;
        case 'poor': return 0;
        default: return 0;
      }
    });

    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  initialize(): void {
    if (this.isInitialized) return;

    this.isInitialized = true;
    secureLogger.info('Performance Monitor initialized');
  }
}

// ============================================
// TYPES
// ============================================

interface PerformanceAlert {
  id: string;
  metric: string;
  value: number;
  threshold: number;
  rating: string;
  timestamp: number;
  url: string;
  severity: 'low' | 'medium' | 'high';
}

// ============================================
// EXPORTS
// ============================================

export const performanceMonitor = PerformanceMonitor.getInstance();
export { PerformanceMonitor, CORE_WEB_VITALS_THRESHOLDS };
export type { PerformanceAlert, CoreWebVitalsThresholds };