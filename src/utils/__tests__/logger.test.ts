/**
 * Logger utility tests
 */

describe('logger', () => {
  const originalEnv = process.env.NODE_ENV;

  function setNodeEnv(value: string) {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value,
      writable: true,
      configurable: true,
    });
  }

  afterEach(() => {
    setNodeEnv(originalEnv!);
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it('log calls console.log in development', () => {
    setNodeEnv('development');
    jest.resetModules();
    const spy = jest.spyOn(console, 'log').mockImplementation();
    const { logger } = require('../logger');
    logger.log('test message');
    expect(spy).toHaveBeenCalledWith('test message');
  });

  it('log does not call console.log in production', () => {
    setNodeEnv('production');
    jest.resetModules();
    const spy = jest.spyOn(console, 'log').mockImplementation();
    const { logger } = require('../logger');
    logger.log('test message');
    expect(spy).not.toHaveBeenCalled();
  });

  it('warn always calls console.warn', () => {
    setNodeEnv('production');
    jest.resetModules();
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    const { logger } = require('../logger');
    logger.warn('warning message');
    expect(spy).toHaveBeenCalledWith('warning message');
  });

  it('error always calls console.error', () => {
    setNodeEnv('production');
    jest.resetModules();
    const spy = jest.spyOn(console, 'error').mockImplementation();
    const { logger } = require('../logger');
    logger.error('error message');
    expect(spy).toHaveBeenCalledWith('error message');
  });

  it('log passes multiple arguments', () => {
    setNodeEnv('development');
    jest.resetModules();
    const spy = jest.spyOn(console, 'log').mockImplementation();
    const { logger } = require('../logger');
    logger.log('a', 'b', 'c');
    expect(spy).toHaveBeenCalledWith('a', 'b', 'c');
  });
});
