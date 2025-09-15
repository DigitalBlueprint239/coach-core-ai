// src/hooks/useOfflineQueue.ts
import { useState, useEffect, useCallback } from 'react';
import {
  offlineQueueManager,
  QueueItem,
} from '../services/offline/OfflineQueueManager';

interface UseOfflineQueueOptions {
  userId: string;
  teamId?: string;
  autoSync?: boolean;
  retryAttempts?: number;
  onQueueUpdate?: (stats: any) => void;
  onConflict?: (conflict: any) => void;
}

interface OfflineOperation {
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'BATCH';
  collection: string;
  documentId?: string;
  data?: any;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  metadata?: any;
}

export const useOfflineQueue = (options: UseOfflineQueueOptions) => {
  const {
    userId,
    teamId,
    autoSync = true,
    retryAttempts = 3,
    onQueueUpdate,
    onConflict,
  } = options;

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueStats, setQueueStats] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);

  // Initialize and monitor queue
  useEffect(() => {
    const updateStats = async () => {
      try {
        const stats = await offlineQueueManager.getQueueStats();
        setQueueStats(stats);
        onQueueUpdate?.(stats);
      } catch (error) {
        console.error('Failed to get queue stats:', error);
      }
    };

    updateStats();
    const statsInterval = setInterval(updateStats, 5000);

    // Network status listener
    const unsubscribe = offlineQueueManager.onNetworkStatusChange(status => {
      setIsOnline(status === 'online');
      if (status === 'online' && autoSync) {
        processQueue();
      }
    });

    return () => {
      clearInterval(statsInterval);
      unsubscribe();
    };
  }, [autoSync, onQueueUpdate]);

  // Monitor conflicts
  useEffect(() => {
    const checkConflicts = async () => {
      try {
        const conflicts = await offlineQueueManager.getConflicts();
        if (conflicts.length > 0) {
          conflicts.forEach(conflict => onConflict?.(conflict));
        }
      } catch (error) {
        console.error('Failed to check conflicts:', error);
      }
    };

    checkConflicts();
    const conflictsInterval = setInterval(checkConflicts, 10000);

    return () => clearInterval(conflictsInterval);
  }, [onConflict]);

  // ============================================
  // QUEUE OPERATIONS
  // ============================================

  const addToQueue = useCallback(
    async (operation: OfflineOperation): Promise<string> => {
      try {
        const itemId = await offlineQueueManager.addToQueue(
          operation.type,
          operation.collection,
          operation.data,
          {
            documentId: operation.documentId,
            priority: operation.priority || 'NORMAL',
            userId,
            teamId,
            metadata: {
              ...operation.metadata,
              maxRetries: retryAttempts,
            },
          }
        );

        console.log(`Added operation to queue: ${itemId}`);
        return itemId;
      } catch (error) {
        console.error('Failed to add to queue:', error);
        throw error;
      }
    },
    [userId, teamId, retryAttempts]
  );

  const processQueue = useCallback(async () => {
    if (isProcessing || !isOnline) return;

    setIsProcessing(true);
    try {
      await offlineQueueManager.processQueue();
      setLastSync(Date.now());
    } catch (error) {
      console.error('Failed to process queue:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, isOnline]);

  // ============================================
  // CONVENIENCE METHODS
  // ============================================

  const createDocument = useCallback(
    async (
      collection: string,
      data: any,
      priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL' = 'NORMAL'
    ): Promise<string> => {
      return addToQueue({
        type: 'CREATE',
        collection,
        data,
        priority,
      });
    },
    [addToQueue]
  );

  const updateDocument = useCallback(
    async (
      collection: string,
      documentId: string,
      data: any,
      options: {
        priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
        originalVersion?: number;
        conflictResolution?: string;
      } = {}
    ): Promise<string> => {
      return addToQueue({
        type: 'UPDATE',
        collection,
        documentId,
        data,
        priority: options.priority || 'NORMAL',
        metadata: {
          originalVersion: options.originalVersion,
          conflictResolution: options.conflictResolution,
        },
      });
    },
    [addToQueue]
  );

  const deleteDocument = useCallback(
    async (
      collection: string,
      documentId: string,
      priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL' = 'NORMAL'
    ): Promise<string> => {
      return addToQueue({
        type: 'DELETE',
        collection,
        documentId,
        priority,
      });
    },
    [addToQueue]
  );

  const batchOperation = useCallback(
    async (
      operations: Array<{
        type: 'CREATE' | 'UPDATE' | 'DELETE';
        collection: string;
        documentId?: string;
        data?: any;
      }>,
      priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL' = 'NORMAL'
    ): Promise<string> => {
      return addToQueue({
        type: 'BATCH',
        collection: 'batch',
        data: { operations },
        priority,
      });
    },
    [addToQueue]
  );

  // ============================================
  // QUEUE MANAGEMENT
  // ============================================

  const getQueueItems = useCallback(
    async (filters?: any): Promise<QueueItem[]> => {
      return offlineQueueManager.getQueueItems({ userId, ...filters });
    },
    [userId]
  );

  const removeFromQueue = useCallback(async (itemId: string): Promise<void> => {
    await offlineQueueManager.removeFromQueue(itemId);
  }, []);

  const clearQueue = useCallback(async (): Promise<void> => {
    await offlineQueueManager.clearQueue();
  }, []);

  const getConflicts = useCallback(async (): Promise<any[]> => {
    return offlineQueueManager.getConflicts();
  }, []);

  const resolveConflict = useCallback(
    async (
      itemId: string,
      resolution: 'SERVER_WINS' | 'CLIENT_WINS' | 'MERGE',
      mergedData?: any
    ): Promise<void> => {
      await offlineQueueManager.resolveConflict(
        itemId,
        resolution,
        mergedData,
        userId
      );
    },
    [userId]
  );

  // ============================================
  // RETRY UTILITY
  // ============================================

  const withRetry = useCallback(
    async <T>(
      fn: () => Promise<T>,
      options = { maxAttempts: 3, delay: 1000 }
    ): Promise<T> => {
      for (let i = 0; i < options.maxAttempts; i++) {
        try {
          return await fn();
        } catch (error) {
          if (i === options.maxAttempts - 1) throw error;
          await new Promise(resolve =>
            setTimeout(resolve, options.delay * Math.pow(2, i))
          );
        }
      }
      throw new Error('Max retries reached');
    },
    []
  );

  // ============================================
  // SMART RETRY LOGIC
  // ============================================

  const retryWithBackoff = useCallback(
    async <T>(
      operation: () => Promise<T>,
      maxRetries: number = retryAttempts
    ): Promise<T> => {
      return withRetry(operation, { maxAttempts: maxRetries, delay: 1000 });
    },
    [retryAttempts, withRetry]
  );

  // ============================================
  // TRANSACTION SUPPORT
  // ============================================

  const createTransaction = useCallback(() => {
    const operations: Array<{
      type: 'CREATE' | 'UPDATE' | 'DELETE';
      collection: string;
      documentId?: string;
      data?: any;
    }> = [];

    return {
      add: (operation: {
        type: 'CREATE' | 'UPDATE' | 'DELETE';
        collection: string;
        documentId?: string;
        data?: any;
      }) => {
        operations.push(operation);
      },
      commit: async (
        priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL' = 'NORMAL'
      ) => {
        if (operations.length === 0) {
          throw new Error('No operations in transaction');
        }
        return batchOperation(operations, priority);
      },
      rollback: () => {
        operations.length = 0;
      },
      getOperations: () => [...operations],
    };
  }, [batchOperation]);

  // ============================================
  // INTEGRATION HELPERS
  // ============================================

  const withOfflineFallback = useCallback(
    async <T>(
      onlineOperation: () => Promise<T>,
      offlineOperation: () => Promise<string>,
      options: {
        priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
        metadata?: any;
      } = {}
    ): Promise<T | string> => {
      if (isOnline) {
        try {
          return await retryWithBackoff(onlineOperation);
        } catch (error) {
          console.warn(
            'Online operation failed, falling back to offline queue:',
            error
          );
          return await offlineOperation();
        }
      } else {
        return await offlineOperation();
      }
    },
    [isOnline, retryWithBackoff]
  );

  const createOfflineWrapper = useCallback(
    (collection: string) => ({
      create: (data: any, priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL') =>
        createDocument(collection, data, priority),

      update: (documentId: string, data: any, options?: any) =>
        updateDocument(collection, documentId, data, options),

      delete: (
        documentId: string,
        priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'
      ) => deleteDocument(collection, documentId, priority),

      batch: (
        operations: any[],
        priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'
      ) =>
        batchOperation(
          operations.map(op => ({ ...op, collection })),
          priority
        ),
    }),
    [createDocument, updateDocument, deleteDocument, batchOperation]
  );

  // ============================================
  // RETURN OBJECT
  // ============================================

  return {
    // State
    isOnline,
    queueStats,
    isProcessing,
    lastSync,

    // Core operations
    addToQueue,
    processQueue,
    createDocument,
    updateDocument,
    deleteDocument,
    batchOperation,

    // Queue management
    getQueueItems,
    removeFromQueue,
    clearQueue,
    getConflicts,
    resolveConflict,

    // Advanced features
    withRetry,
    retryWithBackoff,
    createTransaction,
    withOfflineFallback,
    createOfflineWrapper,

    // Utility methods
    getQueueSize: () => queueStats?.total || 0,
    hasPendingItems: () => (queueStats?.pending || 0) > 0,
    hasConflicts: () => (queueStats?.conflicts || 0) > 0,
  };
};
