import * as Sentry from '@sentry/react';

import { BrowserTracing } from '@sentry/tracing';
import secureLogger from '../../utils/secure-logger';

// Sentry configuration for Coach Core AI
export const initSentry = () => {
  // Only initialize Sentry in production or when DSN is provided
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE || 'development';
  
  if (!dsn || dsn === 'YOUR_SENTRY_DSN_HERE') {
    secureLogger.debug('Sentry not configured - DSN not provided');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    integrations: [
      new BrowserTracing({
        // Set sampling rate for performance monitoring
        tracingOrigins: [
          'localhost',
          'coach-core-ai.web.app',
          /^\//,
        ],
        // Track user interactions - will be configured in App component
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    // Error sampling
    sampleRate: 1.0,
    // Release tracking
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',
    // User context
    beforeSend(event) {
      // Filter out non-critical errors in production
      if (environment === 'production') {
        // Don't send console errors
        if (event.exception) {
          const error = event.exception.values?.[0];
          if (error?.type === 'Error' && error.value?.includes('console')) {
            return null;
          }
        }
      }
      return event;
    },
    // Breadcrumb configuration
    beforeBreadcrumb(breadcrumb) {
      // Filter out sensitive data
      if (breadcrumb.category === 'http' && breadcrumb.data) {
        // Remove sensitive headers
        delete breadcrumb.data.Authorization;
        delete breadcrumb.data.Cookie;
      }
      return breadcrumb;
    },
  });

  secureLogger.info('Sentry initialized', { environment });
};

// Helper function to set user context
export const setSentryUser = (user: { id: string; email?: string; teamId?: string }) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    teamId: user.teamId,
  });
};

// Helper function to add breadcrumbs
export const addSentryBreadcrumb = (message: string, category: string, data?: Record<string, unknown>) => {
  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
    timestamp: Date.now() / 1000,
  });
};

// Helper function to capture exceptions
export const captureSentryException = (error: Error, context?: Record<string, unknown>) => {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('error_context', context);
    }
    Sentry.captureException(error);
  });
};

// Helper function to capture messages
export const captureSentryMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
  Sentry.captureMessage(message, level);
};

