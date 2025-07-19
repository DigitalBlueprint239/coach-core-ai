import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import { firebase } from '@/services/firebase/config';

export function initializeMonitoring() {
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.REACT_APP_SENTRY_DSN,
      integrations: [
        new BrowserTracing(),
      ],
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
    });
  }
}

// Performance monitoring
export function trackPerformance(metricName: string, value: number) {
  if ('sendBeacon' in navigator) {
    navigator.sendBeacon('/api/metrics', JSON.stringify({
      metric: metricName,
      value,
      timestamp: Date.now(),
    }));
  }
}

// User analytics
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (firebase.analytics) {
    firebase.analytics.logEvent(eventName, properties);
  }
} 