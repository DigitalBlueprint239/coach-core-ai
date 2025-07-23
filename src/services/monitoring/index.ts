import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import { firebase } from '../firebase/config';
import { logEvent } from 'firebase/analytics';

const SENTRY_DSN = process.env.REACT_APP_SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';

export const initializeMonitoring = () => {
  if (process.env.NODE_ENV === 'production' && SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      integrations: [
        new BrowserTracing() as any,
      ],
      tracesSampleRate: 0.1,
      environment: ENVIRONMENT,
    });
  }
};

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
    logEvent(firebase.analytics, eventName, properties);
  }
} 