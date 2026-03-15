/**
 * Logger utility tests
 */

describe('logger', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it('log calls console.log in development', () => {
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    const spy = jest.spyOn(console, 'log').mockImplementation();
    const { logger } = require('../logger');
    logger.log('test message');
    expect(spy).toHaveBeenCalledWith('test message');
  });

  it('log does not call console.log in production', () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const spy = jest.spyOn(console, 'log').mockImplementation();
    const { logger } = require('../logger');
    logger.log('test message');
    expect(spy).not.toHaveBeenCalled();
  });

  it('warn always calls console.warn', () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    const { logger } = require('../logger');
    logger.warn('warning message');
    expect(spy).toHaveBeenCalledWith('warning message');
  });

  it('error always calls console.error', () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const spy = jest.spyOn(console, 'error').mockImplementation();
    const { logger } = require('../logger');
    logger.error('error message');
    expect(spy).toHaveBeenCalledWith('error message');
  });

  it('log passes multiple arguments', () => {
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    const spy = jest.spyOn(console, 'log').mockImplementation();
    const { logger } = require('../logger');
    logger.log('a', 'b', 'c');
    expect(spy).toHaveBeenCalledWith('a', 'b', 'c');
  });
});
