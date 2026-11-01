import { describe, it, expect, vi, afterEach } from 'vitest';

describe('build environment', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('exposes REACT_APP_ variables through import.meta.env', () => {
    vi.stubEnv('REACT_APP_FIREBASE_PROJECT_ID', 'demo-project');
    expect(import.meta.env.REACT_APP_FIREBASE_PROJECT_ID).toBe('demo-project');
  });

  it('does not run under Jest', () => {
    expect(typeof (globalThis as any).jest).toBe('undefined');
  });
});
