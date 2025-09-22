import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { optimizedFirestore, QueryOptions } from '../services/firestore/optimized-firestore-service';

// ============================================
// TYPES
// ============================================

interface UseDocumentOptions extends QueryOptions {
  enabled?: boolean;
  onError?: (error: Error) => void;
  onSuccess?: (data: any) => void;
}

interface UseCollectionOptions extends QueryOptions {
  enabled?: boolean;
  onError?: (error: Error) => void;
  onSuccess?: (data: any[]) => void;
}

interface UseDocumentResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isStale: boolean;
}

interface UseCollectionResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isStale: boolean;
}

// ============================================
// DOCUMENT HOOK
// ============================================

export function useOptimizedDocument<T>(
  collectionName: string,
  docId: string | null,
  options: UseDocumentOptions = {}
): UseDocumentResult<T> {
  const {
    enabled = true,
    useCache = true,
    cacheTTL,
    onError,
    onSuccess,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);
  const lastFetchTime = useRef<number>(0);
  const isMounted = useRef(true);

  const fetchData = useCallback(async () => {
    if (!enabled || !docId || !isMounted.current) return;

    setLoading(true);
    setError(null);
    setIsStale(false);

    try {
      const result = await optimizedFirestore.getDocument<T>(
        collectionName,
        docId,
        { useCache, cacheTTL }
      );

      if (isMounted.current) {
        setData(result);
        lastFetchTime.current = Date.now();
        onSuccess?.(result);
      }
    } catch (err) {
      if (isMounted.current) {
        const error = err as Error;
        setError(error);
        onError?.(error);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [collectionName, docId, enabled, useCache, cacheTTL, onError, onSuccess]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Effect to fetch data when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Effect to mark data as stale after cache TTL
  useEffect(() => {
    if (!cacheTTL || !lastFetchTime.current) return;

    const timer = setTimeout(() => {
      setIsStale(true);
    }, cacheTTL);

    return () => clearTimeout(timer);
  }, [cacheTTL, lastFetchTime.current]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    isStale,
  };
}

// ============================================
// COLLECTION HOOK
// ============================================

export function useOptimizedCollection<T>(
  collectionName: string,
  constraints: Array<{ field: string; operator: any; value: any }> = [],
  options: UseCollectionOptions = {}
): UseCollectionResult<T> {
  const {
    enabled = true,
    useCache = true,
    cacheTTL,
    orderByField,
    orderDirection = 'asc',
    limitCount,
    onError,
    onSuccess,
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);
  const lastFetchTime = useRef<number>(0);
  const isMounted = useRef(true);

  const fetchData = useCallback(async () => {
    if (!enabled || !isMounted.current) return;

    setLoading(true);
    setError(null);
    setIsStale(false);

    try {
      const result = await optimizedFirestore.getDocuments<T>(
        collectionName,
        constraints,
        {
          useCache,
          cacheTTL,
          orderByField,
          orderDirection,
          limitCount,
        }
      );

      if (isMounted.current) {
        setData(result);
        lastFetchTime.current = Date.now();
        onSuccess?.(result);
      }
    } catch (err) {
      if (isMounted.current) {
        const error = err as Error;
        setError(error);
        onError?.(error);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [
    collectionName,
    constraints,
    enabled,
    useCache,
    cacheTTL,
    orderByField,
    orderDirection,
    limitCount,
    onError,
    onSuccess,
  ]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Effect to fetch data when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Effect to mark data as stale after cache TTL
  useEffect(() => {
    if (!cacheTTL || !lastFetchTime.current) return;

    const timer = setTimeout(() => {
      setIsStale(true);
    }, cacheTTL);

    return () => clearTimeout(timer);
  }, [cacheTTL, lastFetchTime.current]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    isStale,
  };
}

// ============================================
// REAL-TIME HOOKS
// ============================================

export function useOptimizedDocumentListener<T>(
  collectionName: string,
  docId: string | null,
  options: UseDocumentOptions = {}
): UseDocumentResult<T> {
  const {
    enabled = true,
    useCache = true,
    onError,
    onSuccess,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    if (!enabled || !docId || !isMounted.current) return;

    setLoading(true);
    setError(null);

    const unsubscribe = optimizedFirestore.subscribeToDocument<T>(
      collectionName,
      docId,
      (result) => {
        if (isMounted.current) {
          setData(result);
          setLoading(false);
          setIsStale(false);
          onSuccess?.(result);
        }
      },
      { useCache }
    );

    return () => {
      unsubscribe();
    };
  }, [collectionName, docId, enabled, useCache, onSuccess]);

  const refetch = useCallback(async () => {
    // For real-time listeners, refetch is not needed
    // as data is automatically updated
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    isStale,
  };
}

export function useOptimizedCollectionListener<T>(
  collectionName: string,
  constraints: Array<{ field: string; operator: any; value: any }> = [],
  options: UseCollectionOptions = {}
): UseCollectionResult<T> {
  const {
    enabled = true,
    useCache = true,
    orderByField,
    orderDirection = 'asc',
    limitCount,
    onError,
    onSuccess,
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    if (!enabled || !isMounted.current) return;

    setLoading(true);
    setError(null);

    const unsubscribe = optimizedFirestore.subscribeToCollection<T>(
      collectionName,
      constraints,
      (result) => {
        if (isMounted.current) {
          setData(result);
          setLoading(false);
          setIsStale(false);
          onSuccess?.(result);
        }
      },
      {
        useCache,
        orderByField,
        orderDirection,
        limitCount,
      }
    );

    return () => {
      unsubscribe();
    };
  }, [
    collectionName,
    constraints,
    enabled,
    useCache,
    orderByField,
    orderDirection,
    limitCount,
    onSuccess,
  ]);

  const refetch = useCallback(async () => {
    // For real-time listeners, refetch is not needed
    // as data is automatically updated
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    isStale,
  };
}

// ============================================
// MUTATION HOOKS
// ============================================

export function useOptimizedMutation<T>(
  collectionName: string,
  options: {
    onSuccess?: (result: any) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createDocument = useCallback(async (
    data: Partial<T>,
    requiredFields: string[] = [],
    useBatch: boolean = false
  ) => {
    setLoading(true);
    setError(null);

    try {
      const result = await optimizedFirestore.createDocument<T>(
        collectionName,
        data,
        requiredFields,
        useBatch
      );

      options.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      options.onError?.(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [collectionName, options]);

  const updateDocument = useCallback(async (
    docId: string,
    data: Partial<T>,
    requiredFields: string[] = [],
    useBatch: boolean = false
  ) => {
    setLoading(true);
    setError(null);

    try {
      await optimizedFirestore.updateDocument<T>(
        collectionName,
        docId,
        data,
        requiredFields,
        useBatch
      );

      options.onSuccess?.(docId);
      return docId;
    } catch (err) {
      const error = err as Error;
      setError(error);
      options.onError?.(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [collectionName, options]);

  const deleteDocument = useCallback(async (
    docId: string,
    useBatch: boolean = false
  ) => {
    setLoading(true);
    setError(null);

    try {
      await optimizedFirestore.deleteDocument(
        collectionName,
        docId,
        useBatch
      );

      options.onSuccess?.(docId);
      return docId;
    } catch (err) {
      const error = err as Error;
      setError(error);
      options.onError?.(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [collectionName, options]);

  return {
    createDocument,
    updateDocument,
    deleteDocument,
    loading,
    error,
  };
}

// ============================================
// BATCH OPERATIONS HOOK
// ============================================

export function useOptimizedBatch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const startBatch = useCallback(() => {
    optimizedFirestore.startBatch();
  }, []);

  const commitBatch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await optimizedFirestore.commitBatch();
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    startBatch,
    commitBatch,
    loading,
    error,
  };
}

// ============================================
// CACHE MANAGEMENT HOOK
// ============================================

export function useOptimizedCache() {
  const clearCache = useCallback(() => {
    optimizedFirestore.clearCache();
  }, []);

  const invalidateDocument = useCallback((collectionName: string, docId: string) => {
    optimizedFirestore.invalidateDocumentCache(collectionName, docId);
  }, []);

  const invalidateCollection = useCallback((collectionName: string) => {
    optimizedFirestore.invalidateCollectionCache(collectionName);
  }, []);

  const getCacheStats = useCallback(() => {
    return optimizedFirestore.getCacheStats();
  }, []);

  return {
    clearCache,
    invalidateDocument,
    invalidateCollection,
    getCacheStats,
  };
}

// ============================================
// CONVENIENCE HOOKS
// ============================================

// Common collection hooks
export const useWaitlist = (constraints: any[] = [], options: UseCollectionOptions = {}) =>
  useOptimizedCollection('waitlist', constraints, options);

export const useUsers = (constraints: any[] = [], options: UseCollectionOptions = {}) =>
  useOptimizedCollection('users', constraints, options);

export const useTeams = (constraints: any[] = [], options: UseCollectionOptions = {}) =>
  useOptimizedCollection('teams', constraints, options);

export const usePlays = (constraints: any[] = [], options: UseCollectionOptions = {}) =>
  useOptimizedCollection('plays', constraints, options);

export const usePracticePlans = (constraints: any[] = [], options: UseCollectionOptions = {}) =>
  useOptimizedCollection('practicePlans', constraints, options);

// Common document hooks
export const useUser = (userId: string | null, options: UseDocumentOptions = {}) =>
  useOptimizedDocument('users', userId, options);

export const useTeam = (teamId: string | null, options: UseDocumentOptions = {}) =>
  useOptimizedDocument('teams', teamId, options);

export const usePlay = (playId: string | null, options: UseDocumentOptions = {}) =>
  useOptimizedDocument('plays', playId, options);

export const usePracticePlan = (planId: string | null, options: UseDocumentOptions = {}) =>
  useOptimizedDocument('practicePlans', planId, options);

// Real-time hooks
export const useWaitlistListener = (constraints: any[] = [], options: UseCollectionOptions = {}) =>
  useOptimizedCollectionListener('waitlist', constraints, options);

export const useUsersListener = (constraints: any[] = [], options: UseCollectionOptions = {}) =>
  useOptimizedCollectionListener('users', constraints, options);

export const useTeamsListener = (constraints: any[] = [], options: UseCollectionOptions = {}) =>
  useOptimizedCollectionListener('teams', constraints, options);

export const usePlaysListener = (constraints: any[] = [], options: UseCollectionOptions = {}) =>
  useOptimizedCollectionListener('plays', constraints, options);

export const usePracticePlansListener = (constraints: any[] = [], options: UseCollectionOptions = {}) =>
  useOptimizedCollectionListener('practicePlans', constraints, options);

export default {
  useOptimizedDocument,
  useOptimizedCollection,
  useOptimizedDocumentListener,
  useOptimizedCollectionListener,
  useOptimizedMutation,
  useOptimizedBatch,
  useOptimizedCache,
  // Convenience hooks
  useWaitlist,
  useUsers,
  useTeams,
  usePlays,
  usePracticePlans,
  useUser,
  useTeam,
  usePlay,
  usePracticePlan,
  useWaitlistListener,
  useUsersListener,
  useTeamsListener,
  usePlaysListener,
  usePracticePlansListener,
};
