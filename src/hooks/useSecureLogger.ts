// src/hooks/useSecureLogger.ts
import { useCallback, useRef } from 'react';
import secureLogger, { LogContext } from '../utils/secure-logger';

export interface UseSecureLoggerOptions {
  component?: string;
  userId?: string;
  sessionId?: string;
  enableLogging?: boolean;
}

export const useSecureLogger = (options: UseSecureLoggerOptions = {}) => {
  const {
    component,
    userId,
    sessionId,
    enableLogging = true,
  } = options;

  const loggerRef = useRef(secureLogger);

  // Create base context
  const baseContext: LogContext = {
    component,
    userId,
    sessionId,
  };

  // Memoized logging functions
  const debug = useCallback((message: string, context?: LogContext) => {
    if (enableLogging) {
      loggerRef.current.debug(message, { ...baseContext, ...context });
    }
  }, [enableLogging, component, userId, sessionId]);

  const info = useCallback((message: string, context?: LogContext) => {
    if (enableLogging) {
      loggerRef.current.info(message, { ...baseContext, ...context });
    }
  }, [enableLogging, component, userId, sessionId]);

  const warn = useCallback((message: string, context?: LogContext) => {
    if (enableLogging) {
      loggerRef.current.warn(message, { ...baseContext, ...context });
    }
  }, [enableLogging, component, userId, sessionId]);

  const error = useCallback((message: string, context?: LogContext) => {
    if (enableLogging) {
      loggerRef.current.error(message, { ...baseContext, ...context });
    }
  }, [enableLogging, component, userId, sessionId]);

  const fatal = useCallback((message: string, context?: LogContext) => {
    if (enableLogging) {
      loggerRef.current.fatal(message, { ...baseContext, ...context });
    }
  }, [enableLogging, component, userId, sessionId]);

  const userAction = useCallback((action: string, context?: LogContext) => {
    if (enableLogging) {
      loggerRef.current.userAction(action, { ...baseContext, ...context });
    }
  }, [enableLogging, component, userId, sessionId]);

  const apiCall = useCallback((method: string, url: string, context?: LogContext) => {
    if (enableLogging) {
      loggerRef.current.apiCall(method, url, { ...baseContext, ...context });
    }
  }, [enableLogging, component, userId, sessionId]);

  const performance = useCallback((metric: string, value: number, context?: LogContext) => {
    if (enableLogging) {
      loggerRef.current.performance(metric, value, { ...baseContext, ...context });
    }
  }, [enableLogging, component, userId, sessionId]);

  const security = useCallback((event: string, context?: LogContext) => {
    if (enableLogging) {
      loggerRef.current.security(event, { ...baseContext, ...context });
    }
  }, [enableLogging, component, userId, sessionId]);

  return {
    debug,
    info,
    warn,
    error,
    fatal,
    userAction,
    apiCall,
    performance,
    security,
  };
};

export default useSecureLogger;

