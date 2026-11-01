import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as Sentry from '@sentry/react';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
  replayIntegration: vi.fn(() => ({ name: 'Replay' })),
}));

// Fresh module state (initialized or not) for every test.
async function load() {
  vi.resetModules();
  return import('../sentry');
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('initMonitoring', () => {
  it('does nothing without a DSN: no init, and captureError is a no-op', async () => {
    const { initMonitoring, captureError } = await load();
    expect(initMonitoring({ dsn: undefined, mode: 'production' })).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
    captureError(new Error('boom'));
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('treats an empty DSN as no DSN', async () => {
    const { initMonitoring } = await load();
    expect(initMonitoring({ dsn: '', mode: 'production' })).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('initializes once with no PII, 10% tracing and no Session Replay', async () => {
    const { initMonitoring } = await load();
    expect(initMonitoring({ dsn: 'https://public@o0.ingest.sentry.io/1', mode: 'production', release: 'abc123' })).toBe(true);
    expect(Sentry.init).toHaveBeenCalledTimes(1);
    const options = vi.mocked(Sentry.init).mock.calls[0][0]!;
    expect(options).toMatchObject({
      dsn: 'https://public@o0.ingest.sentry.io/1',
      environment: 'production',
      release: 'abc123',
      tracesSampleRate: 0.1,
    });
    // Sentry 11 replaced sendDefaultPii with dataCollection, whose defaults collect user info, cookies,
    // headers and query params. Every category must be switched off explicitly.
    expect(options.dataCollection).toEqual({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
    });
    const names = ((options.integrations as Array<{ name: string }>) ?? []).map((i) => i.name);
    expect(names).not.toContain('Replay');
    expect(Sentry.replayIntegration).not.toHaveBeenCalled();
    expect(options).not.toHaveProperty('replaysSessionSampleRate');
    expect(options).not.toHaveProperty('replaysOnErrorSampleRate');
  });

  it('does not initialize twice', async () => {
    const { initMonitoring } = await load();
    initMonitoring({ dsn: 'https://public@o0.ingest.sentry.io/1', mode: 'staging' });
    expect(initMonitoring({ dsn: 'https://public@o0.ingest.sentry.io/1', mode: 'staging' })).toBe(true);
    expect(Sentry.init).toHaveBeenCalledTimes(1);
  });
});

describe('captureError', () => {
  it('reports to Sentry with context as extra once initialized', async () => {
    const { initMonitoring, captureError } = await load();
    initMonitoring({ dsn: 'https://public@o0.ingest.sentry.io/1', mode: 'preview' });
    const err = new Error('play failed to save');
    captureError(err, { area: 'playbook' });
    expect(Sentry.captureException).toHaveBeenCalledWith(err, { extra: { area: 'playbook' } });
  });
});
