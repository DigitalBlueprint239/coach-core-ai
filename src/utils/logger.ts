/**
 * Logger utility — respects environment mode.
 * console.log only fires in development; warn/error always fire.
 */

const isDev = typeof process !== 'undefined'
  ? process.env.NODE_ENV === 'development'
  : false;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};
