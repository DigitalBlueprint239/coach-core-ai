import { useState, useCallback, useRef } from 'react';
import { errorRecoveryService, RecoveryContext } from '../services/error/error-recovery-service';

export interface UseErrorRecoveryOptions {
  maxRetries?: number;
  onRecoverySuccess?: (strategy: string) => void;
  onRecoveryFailure?: (error: any) => void;
  autoRetry?: boolean;
}

export interface ErrorRecoveryState {
  isRecovering: boolean;
  lastError: any;
  recoveryAttempts: number;
  lastRecoveryStrategy?: string;
  recoveryStats: {
    totalAttempts: number;
    successfulRecoveries: number;
    successRate: number;
  };
}

export const useErrorRecovery = (options: UseErrorRecoveryOptions = {}) => {
  const {
    maxRetries = 3,
    onRecoverySuccess,
    onRecoveryFailure,
    autoRetry = true,
  } = options;

  const [state, setState] = useState<ErrorRecoveryState>({
    isRecovering: false,
    lastError: null,
    recoveryAttempts: 0,
    lastRecoveryStrategy: undefined,
    recoveryStats: {
      totalAttempts: 0,
      successfulRecoveries: 0,
      successRate: 0,
    },
  });

  const retryCountRef = useRef(0);
  const lastErrorRef = useRef<any>(null);

  /**
   * Attempt to recover from an error
   */
  const attemptRecovery = useCallback(async (
    error: any,
    context: RecoveryContext = {}
  ): Promise<boolean> => {
    if (state.isRecovering) {
      console.warn('Recovery already in progress');
      return false;
    }

    // Check if this is the same error as last time
    const isSameError = lastErrorRef.current === error;
    if (isSameError && retryCountRef.current >= maxRetries) {
      console.warn('Max retries exceeded for this error');
      return false;
    }

    setState(prev => ({
      ...prev,
      isRecovering: true,
      lastError: error,
      recoveryAttempts: isSameError ? prev.recoveryAttempts + 1 : 1,
    }));

    lastErrorRef.current = error;
    retryCountRef.current = isSameError ? retryCountRef.current + 1 : 1;

    try {
      const recoveryContext: RecoveryContext = {
        ...context,
        retryCount: retryCountRef.current,
        lastAttempt: new Date(),
      };

      const result = await errorRecoveryService.attemptRecovery(error, recoveryContext);

      if (result.success) {
        setState(prev => ({
          ...prev,
          isRecovering: false,
          lastRecoveryStrategy: result.strategy,
        }));

        onRecoverySuccess?.(result.strategy || 'unknown');
        return true;
      } else {
        setState(prev => ({
          ...prev,
          isRecovering: false,
        }));

        onRecoveryFailure?.(error);
        return false;
      }
    } catch (recoveryError) {
      console.error('Error during recovery attempt:', recoveryError);
      
      setState(prev => ({
        ...prev,
        isRecovering: false,
      }));

      onRecoveryFailure?.(recoveryError);
      return false;
    }
  }, [state.isRecovering, maxRetries, onRecoverySuccess, onRecoveryFailure]);

  /**
   * Execute an operation with automatic error recovery
   */
  const executeWithRecovery = useCallback(async <T>(
    operation: () => Promise<T>,
    context: RecoveryContext = {}
  ): Promise<T> => {
    try {
      const result = await operation();
      
      // Reset retry count on success
      retryCountRef.current = 0;
      lastErrorRef.current = null;
      
      return result;
    } catch (error) {
      if (autoRetry) {
        const recovered = await attemptRecovery(error, context);
        if (recovered) {
          // Retry the operation after successful recovery
          try {
            return await operation();
          } catch (retryError) {
            throw retryError;
          }
        }
      }
      
      throw error;
    }
  }, [autoRetry, attemptRecovery]);

  /**
   * Get current recovery statistics
   */
  const getRecoveryStats = useCallback(() => {
    const stats = errorRecoveryService.getRecoveryStats();
    setState(prev => ({
      ...prev,
      recoveryStats: {
        totalAttempts: stats.totalAttempts,
        successfulRecoveries: stats.successfulRecoveries,
        successRate: stats.successRate,
      },
    }));
    return stats;
  }, []);

  /**
   * Reset recovery state
   */
  const resetRecovery = useCallback(() => {
    retryCountRef.current = 0;
    lastErrorRef.current = null;
    setState({
      isRecovering: false,
      lastError: null,
      recoveryAttempts: 0,
      lastRecoveryStrategy: undefined,
      recoveryStats: {
        totalAttempts: 0,
        successfulRecoveries: 0,
        successRate: 0,
      },
    });
  }, []);

  /**
   * Clear recovery history
   */
  const clearHistory = useCallback(() => {
    errorRecoveryService.clearHistory();
    getRecoveryStats();
  }, [getRecoveryStats]);

  return {
    ...state,
    attemptRecovery,
    executeWithRecovery,
    getRecoveryStats,
    resetRecovery,
    clearHistory,
  };
};

export default useErrorRecovery;

