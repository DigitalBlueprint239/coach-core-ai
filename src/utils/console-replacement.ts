// src/utils/console-replacement.ts
// Replace console methods with secure logging

import secureLogger from './secure-logger';

// Store original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

// Replace console methods with secure logging
export const replaceConsole = () => {
  console.log = (message: string, ...args: any[]) => {
    secureLogger.info(message, { args: args.length > 0 ? args : undefined });
  };

  console.info = (message: string, ...args: any[]) => {
    secureLogger.info(message, { args: args.length > 0 ? args : undefined });
  };

  console.warn = (message: string, ...args: any[]) => {
    secureLogger.warn(message, { args: args.length > 0 ? args : undefined });
  };

  console.error = (message: string, ...args: any[]) => {
    secureLogger.error(message, { args: args.length > 0 ? args : undefined });
  };

  console.debug = (message: string, ...args: any[]) => {
    secureLogger.debug(message, { args: args.length > 0 ? args : undefined });
  };
};

// Restore original console methods
export const restoreConsole = () => {
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.debug = originalConsole.debug;
};

// Initialize console replacement in development
if (process.env.NODE_ENV === 'development') {
  replaceConsole();
}

