/**
 * Logger utility tests
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadLogger(dev: boolean) {
  vi.stubEnv('DEV', dev);
  vi.resetModules();
  const { logger } = await import('../logger');
  return logger;
}

describe('logger', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('log calls console.log in development', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = await loadLogger(true);
    logger.log('test message');
    expect(spy).toHaveBeenCalledWith('test message');
  });

  it('log does not call console.log in production', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = await loadLogger(false);
    logger.log('test message');
    expect(spy).not.toHaveBeenCalled();
  });

  it('warn always calls console.warn', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logger = await loadLogger(false);
    logger.warn('warning message');
    expect(spy).toHaveBeenCalledWith('warning message');
  });

  it('error always calls console.error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = await loadLogger(false);
    logger.error('error message');
    expect(spy).toHaveBeenCalledWith('error message');
  });

  it('log passes multiple arguments', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = await loadLogger(true);
    logger.log('a', 'b', 'c');
    expect(spy).toHaveBeenCalledWith('a', 'b', 'c');
  });
});
