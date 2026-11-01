import * as Sentry from '@sentry/react';

// Crash reporting. Off unless a DSN is configured (REACT_APP_SENTRY_DSN), so contributor PRs and local dev
// never send anything. Coaches are adults but players may be minors: no default PII and no Session Replay.
// The DSN is public by design; the Sentry auth token (source maps) only ever lives in CI secrets.

export interface MonitoringEnv {
  dsn?: string;
  /** Sentry environment: production | staging | preview | development */
  mode: string;
  release?: string;
}

let initialized = false;

function envFromBuild(): MonitoringEnv {
  return {
    dsn: import.meta.env.REACT_APP_SENTRY_DSN,
    mode: import.meta.env.REACT_APP_DEPLOY_ENV || import.meta.env.MODE,
    release: import.meta.env.REACT_APP_RELEASE,
  };
}

/** Starts Sentry if a DSN is set. Returns true if monitoring is on. */
export function initMonitoring(env: MonitoringEnv = envFromBuild()): boolean {
  if (initialized) return true;
  if (!env.dsn) return false;
  Sentry.init({
    dsn: env.dsn,
    environment: env.mode,
    release: env.release || undefined,
    // No personal data. (Sentry 11's replacement for sendDefaultPii: false; its defaults collect all of these.)
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
    },
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
  });
  initialized = true;
  return true;
}

/** Reports an error with optional context. Does nothing when monitoring is off. */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
