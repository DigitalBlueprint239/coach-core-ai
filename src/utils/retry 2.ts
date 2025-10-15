// src/utils/retry.ts

export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoffMultiplier?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
  shouldRetry?: (error: Error) => boolean;
}

export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoffMultiplier = 2,
    maxDelay = 30000,
    onRetry,
    shouldRetry,
  } = options;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry this error
      if (shouldRetry && !shouldRetry(err)) {
        throw err;
      }

      // If this is the last attempt, throw the error
      if (i === maxAttempts - 1) {
        throw err;
      }

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(i + 1, err);
      }

      // Calculate delay with exponential backoff
      const currentDelay = Math.min(
        delay * Math.pow(backoffMultiplier, i),
        maxDelay
      );

      await new Promise(resolve => setTimeout(resolve, currentDelay));
    }
  }

  throw new Error('Max retries reached');
};

// ============================================
// SPECIALIZED RETRY FUNCTIONS
// ============================================

export const withNetworkRetry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  return withRetry(fn, {
    maxAttempts: 3,
    delay: 1000,
    shouldRetry: error => {
      // Retry network-related errors
      return (
        error.name === 'NetworkError' ||
        error.message.includes('network') ||
        error.message.includes('fetch') ||
        error.message.includes('timeout')
      );
    },
    ...options,
  });
};

export const withDatabaseRetry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  return withRetry(fn, {
    maxAttempts: 5,
    delay: 500,
    shouldRetry: error => {
      // Retry database-related errors
      return (
        error.name === 'QuotaExceededError' ||
        error.message.includes('database') ||
        error.message.includes('indexeddb') ||
        error.message.includes('quota')
      );
    },
    ...options,
  });
};

export const withAPIRetry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  return withRetry(fn, {
    maxAttempts: 3,
    delay: 1000,
    shouldRetry: error => {
      // Retry API-related errors
      const retryableStatuses = [408, 429, 500, 502, 503, 504];
      const statusMatch = error.message.match(/HTTP (\d+)/);

      if (statusMatch) {
        const status = parseInt(statusMatch[1]);
        return retryableStatuses.includes(status);
      }

      return (
        error.message.includes('timeout') ||
        error.message.includes('network') ||
        error.message.includes('connection')
      );
    },
    ...options,
  });
};

// ============================================
// RETRY DECORATORS
// ============================================

export const retryable = (options: RetryOptions = {}) => {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return withRetry(() => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
};

export const networkRetryable = (options: RetryOptions = {}) => {
  return retryable({
    maxAttempts: 3,
    delay: 1000,
    shouldRetry: error => {
      return (
        error.name === 'NetworkError' ||
        error.message.includes('network') ||
        error.message.includes('fetch') ||
        error.message.includes('timeout')
      );
    },
    ...options,
  });
};

export const databaseRetryable = (options: RetryOptions = {}) => {
  return retryable({
    maxAttempts: 5,
    delay: 500,
    shouldRetry: error => {
      return (
        error.name === 'QuotaExceededError' ||
        error.message.includes('database') ||
        error.message.includes('indexeddb') ||
        error.message.includes('quota')
      );
    },
    ...options,
  });
};

// ============================================
// RETRY HOOKS FOR REACT
// ============================================

import { useCallback } from 'react';

export const useRetry = () => {
  const retry = useCallback(
    <T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> => {
      return withRetry(fn, options);
    },
    []
  );

  const networkRetry = useCallback(
    <T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> => {
      return withNetworkRetry(fn, options);
    },
    []
  );

  const databaseRetry = useCallback(
    <T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> => {
      return withDatabaseRetry(fn, options);
    },
    []
  );

  const apiRetry = useCallback(
    <T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> => {
      return withAPIRetry(fn, options);
    },
    []
  );

  return {
    retry,
    networkRetry,
    databaseRetry,
    apiRetry,
  };
};

// ============================================
// RETRY UTILITIES
// ============================================

export const createRetryableFunction = <
  T extends (...args: any[]) => Promise<any>,
>(
  fn: T,
  options: RetryOptions = {}
): T => {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return withRetry(() => fn(...args), options);
  }) as T;
};

export const createNetworkRetryableFunction = <
  T extends (...args: any[]) => Promise<any>,
>(
  fn: T
): T => {
  return createRetryableFunction(fn, {
    maxAttempts: 3,
    delay: 1000,
    shouldRetry: error => {
      return (
        error.name === 'NetworkError' ||
        error.message.includes('network') ||
        error.message.includes('fetch') ||
        error.message.includes('timeout')
      );
    },
  });
};

export const createDatabaseRetryableFunction = <
  T extends (...args: any[]) => Promise<any>,
>(
  fn: T
): T => {
  return createRetryableFunction(fn, {
    maxAttempts: 5,
    delay: 500,
    shouldRetry: error => {
      return (
        error.name === 'QuotaExceededError' ||
        error.message.includes('database') ||
        error.message.includes('indexeddb') ||
        error.message.includes('quota')
      );
    },
  });
};

// ============================================
// DEFAULT EXPORT
// ============================================

export default withRetry;
