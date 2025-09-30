/*
 * Lightweight monitoring facade used for type-safe environments where the full
 * monitoring stack (Sentry + Firebase Performance) may not be available during
 * static analysis. At runtime it lazily loads the real implementation if it
 * exists; otherwise it falls back to no-op logging so application logic can
 * continue without breaking.
 */

type MonitoringModule = {
  trackUserAction?: (action: string, data?: Record<string, unknown>) => void;
  setSentryUser?: (user: { id: string; email?: string; teamId?: string }) => void;
  trackError?: (error: Error, context?: Record<string, unknown>) => void;
};

let cachedModule: MonitoringModule | null | undefined;

const loadModule = (): MonitoringModule | null => {
  if (cachedModule !== undefined) {
    return cachedModule;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cachedModule = require('./index') as MonitoringModule;
  } catch (error) {
    if (typeof console !== 'undefined' && console.debug) {
      console.debug('[monitoring-lite] Falling back to no-op monitoring', error);
    }
    cachedModule = null;
  }

  return cachedModule;
};

export const trackUserAction = (action: string, data?: Record<string, unknown>) => {
  const module = loadModule();
  if (module?.trackUserAction) {
    module.trackUserAction(action, data);
    return;
  }

  if (import.meta.env?.DEV) {
    console.debug('[monitoring-lite] trackUserAction', action, data);
  }
};

export const setSentryUser = (user: { id: string; email?: string; teamId?: string }) => {
  const module = loadModule();
  if (module?.setSentryUser) {
    module.setSentryUser(user);
    return;
  }

  if (import.meta.env?.DEV) {
    console.debug('[monitoring-lite] setSentryUser', user);
  }
};

export const trackError = (error: Error, context?: Record<string, unknown>) => {
  const module = loadModule();
  if (module?.trackError) {
    module.trackError(error, context);
    return;
  }

  if (import.meta.env?.DEV) {
    console.error('[monitoring-lite] trackError', error, context);
  }
};
