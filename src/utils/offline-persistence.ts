// src/utils/offline-persistence.ts
import { 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  enableNetwork,
  disableNetwork,
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED,
  writeBatch,
  runTransaction,
  Timestamp,
  FieldValue,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../services/firebase';

// ============================================
// OFFLINE QUEUE TYPES
// ============================================

export interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  documentId?: string;
  data?: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: number;
  pendingOperations: number;
  failedOperations: number;
  syncInProgress: boolean;
}

export interface ConflictResolution {
  strategy: 'server-wins' | 'client-wins' | 'manual' | 'merge';
  resolvedData?: any;
  conflictDetails?: any;
}

// ============================================
// OFFLINE PERSISTENCE MANAGER
// ============================================

export class OfflinePersistenceManager {
  private queue: OfflineOperation[] = [];
  private syncStatus: SyncStatus = {
    isOnline: true,
    lastSyncTime: Date.now(),
    pendingOperations: 0,
    failedOperations: 0,
    syncInProgress: false
  };
  private listeners: Set<(status: SyncStatus) => void> = new Set();
  private conflictResolvers: Map<string, (conflict: any) => ConflictResolution> = new Map();

  constructor() {
    this.initializeOfflineSupport();
    this.setupNetworkListeners();
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  private async initializeOfflineSupport() {
    try {
      await enableIndexedDbPersistence(db);
      console.log('Offline persistence enabled');
    } catch (error: any) {
      if (error.code === 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time');
      } else if (error.code === 'unimplemented') {
        console.warn('Browser doesn\'t support offline persistence');
      }
    }
  }

  private setupNetworkListeners() {
    // Monitor network status
    const unsubscribe = onSnapshot(doc(db, '_health', 'network'), (doc) => {
      const wasOnline = this.syncStatus.isOnline;
      this.syncStatus.isOnline = doc.exists();
      
      if (!wasOnline && this.syncStatus.isOnline) {
        this.processOfflineQueue();
      }
      
      this.notifyListeners();
    }, () => {
      // If health check fails, assume offline
      this.syncStatus.isOnline = false;
      this.notifyListeners();
    });

    // Cleanup on unmount
    return unsubscribe;
  }

  // ============================================
  // QUEUE MANAGEMENT
  // ============================================

  async addToQueue(operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const queuedOperation: OfflineOperation = {
      ...operation,
      id: this.generateOperationId(),
      timestamp: Date.now(),
      retryCount: 0
    };

    this.queue.push(queuedOperation);
    this.syncStatus.pendingOperations = this.queue.length;
    this.notifyListeners();

    // Try to process immediately if online
    if (this.syncStatus.isOnline) {
      this.processOfflineQueue();
    }

    return queuedOperation.id;
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async processOfflineQueue(): Promise<void> {
    if (this.syncStatus.syncInProgress || !this.syncStatus.isOnline) {
      return;
    }

    this.syncStatus.syncInProgress = true;
    this.notifyListeners();

    try {
      const operationsToProcess = [...this.queue];
      const batch = writeBatch(db);
      const successfulOperations: string[] = [];
      const failedOperations: OfflineOperation[] = [];

      for (const operation of operationsToProcess) {
        try {
          await this.processOperation(operation, batch);
          successfulOperations.push(operation.id);
        } catch (error) {
          console.error(`Failed to process operation ${operation.id}:`, error);
          
          if (operation.retryCount < operation.maxRetries) {
            operation.retryCount++;
            failedOperations.push(operation);
          } else {
            this.syncStatus.failedOperations++;
          }
        }
      }

      // Commit batch if there are successful operations
      if (successfulOperations.length > 0) {
        await batch.commit();
        
        // Remove successful operations from queue
        this.queue = this.queue.filter(op => !successfulOperations.includes(op.id));
      }

      // Update failed operations in queue
      this.queue = this.queue.filter(op => !successfulOperations.includes(op.id));
      this.queue.push(...failedOperations);

      this.syncStatus.pendingOperations = this.queue.length;
      this.syncStatus.lastSyncTime = Date.now();

    } catch (error) {
      console.error('Error processing offline queue:', error);
    } finally {
      this.syncStatus.syncInProgress = false;
      this.notifyListeners();
    }
  }

  private async processOperation(operation: OfflineOperation, batch: any): Promise<void> {
    const docRef = doc(db, operation.collection, operation.documentId || this.generateDocumentId());

    switch (operation.type) {
      case 'create':
        batch.set(docRef, {
          ...operation.data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        break;

      case 'update':
        batch.update(docRef, {
          ...operation.data,
          updatedAt: serverTimestamp()
        });
        break;

      case 'delete':
        batch.delete(docRef);
        break;
    }
  }

  private generateDocumentId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================
  // CONFLICT RESOLUTION
  // ============================================

  async resolveConflict(
    collection: string,
    documentId: string,
    localData: any,
    serverData: any
  ): Promise<any> {
    const resolver = this.conflictResolvers.get(collection);
    
    if (resolver) {
      const resolution = resolver({ localData, serverData, collection, documentId });
      return resolution.resolvedData;
    }

    // Default conflict resolution strategy
    return this.defaultConflictResolution(localData, serverData);
  }

  private defaultConflictResolution(localData: any, serverData: any): any {
    // Merge strategy: combine both datasets, server wins on conflicts
    const merged = { ...localData, ...serverData };
    
    // Handle arrays by combining unique items
    Object.keys(merged).forEach(key => {
      if (Array.isArray(localData[key]) && Array.isArray(serverData[key])) {
        merged[key] = [...new Set([...localData[key], ...serverData[key]])];
      }
    });

    return merged;
  }

  setConflictResolver(collection: string, resolver: (conflict: any) => ConflictResolution) {
    this.conflictResolvers.set(collection, resolver);
  }

  // ============================================
  // DATA SYNCHRONIZATION
  // ============================================

  async syncCollection(collectionName: string, filters?: any): Promise<void> {
    if (!this.syncStatus.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    try {
      let q: any = collection(db, collectionName);
      
      if (filters) {
        Object.entries(filters).forEach(([field, value]) => {
          q = query(q, where(field, '==', value));
        });
      }

      const snapshot = await getDocs(q);
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Store in local cache
      this.storeInLocalCache(collectionName, documents);
      
      this.syncStatus.lastSyncTime = Date.now();
      this.notifyListeners();

    } catch (error) {
      console.error(`Error syncing collection ${collectionName}:`, error);
      throw error;
    }
  }

  private storeInLocalCache(collectionName: string, documents: any[]): void {
    const cacheKey = `cache_${collectionName}`;
    localStorage.setItem(cacheKey, JSON.stringify({
      documents,
      timestamp: Date.now()
    }));
  }

  getFromLocalCache(collectionName: string): any[] {
    const cacheKey = `cache_${collectionName}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      const { documents } = JSON.parse(cached);
      return documents;
    }
    
    return [];
  }

  // ============================================
  // STATUS AND MONITORING
  // ============================================

  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  subscribeToStatus(callback: (status: SyncStatus) => void): () => void {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.getSyncStatus());
      } catch (error) {
        console.error('Error in status listener:', error);
      }
    });
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  async clearQueue(): Promise<void> {
    this.queue = [];
    this.syncStatus.pendingOperations = 0;
    this.syncStatus.failedOperations = 0;
    this.notifyListeners();
  }

  async retryFailedOperations(): Promise<void> {
    const failedOperations = this.queue.filter(op => op.retryCount >= op.maxRetries);
    
    failedOperations.forEach(op => {
      op.retryCount = 0;
    });

    this.syncStatus.failedOperations = 0;
    this.notifyListeners();

    if (this.syncStatus.isOnline) {
      await this.processOfflineQueue();
    }
  }

  getQueueStats(): { total: number; pending: number; failed: number; byPriority: Record<string, number> } {
    const byPriority = this.queue.reduce((acc, op) => {
      acc[op.priority] = (acc[op.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: this.queue.length,
      pending: this.syncStatus.pendingOperations,
      failed: this.syncStatus.failedOperations,
      byPriority
    };
  }
}

// ============================================
// REACT HOOKS
// ============================================

import { useState, useEffect, useCallback } from 'react';

export const useOfflinePersistence = () => {
  const [manager] = useState(() => new OfflinePersistenceManager());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(manager.getSyncStatus());

  useEffect(() => {
    const unsubscribe = manager.subscribeToStatus(setSyncStatus);
    return unsubscribe;
  }, [manager]);

  const addToQueue = useCallback(async (operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount'>) => {
    return manager.addToQueue(operation);
  }, [manager]);

  const processQueue = useCallback(async () => {
    return manager.processOfflineQueue();
  }, [manager]);

  const syncCollection = useCallback(async (collectionName: string, filters?: any) => {
    return manager.syncCollection(collectionName, filters);
  }, [manager]);

  const clearQueue = useCallback(async () => {
    return manager.clearQueue();
  }, [manager]);

  const retryFailed = useCallback(async () => {
    return manager.retryFailedOperations();
  }, [manager]);

  return {
    syncStatus,
    addToQueue,
    processQueue,
    syncCollection,
    clearQueue,
    retryFailed,
    getQueueStats: () => manager.getQueueStats()
  };
};

// ============================================
// OFFLINE-AWARE FIRESTORE OPERATIONS
// ============================================

export class OfflineFirestore {
  private manager: OfflinePersistenceManager;

  constructor() {
    this.manager = new OfflinePersistenceManager();
  }

  async create(collection: string, data: any, documentId?: string): Promise<string> {
    const operationId = await this.manager.addToQueue({
      type: 'create',
      collection,
      documentId,
      data,
      maxRetries: 3,
      priority: 'normal'
    });

    return operationId;
  }

  async update(collection: string, documentId: string, data: any): Promise<string> {
    const operationId = await this.manager.addToQueue({
      type: 'update',
      collection,
      documentId,
      data,
      maxRetries: 3,
      priority: 'normal'
    });

    return operationId;
  }

  async delete(collection: string, documentId: string): Promise<string> {
    const operationId = await this.manager.addToQueue({
      type: 'delete',
      collection,
      documentId,
      maxRetries: 3,
      priority: 'high'
    });

    return operationId;
  }

  async read(collection: string, documentId: string): Promise<any> {
    try {
      const docRef = doc(db, collection, documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      
      return null;
    } catch (error) {
      console.error('Error reading document:', error);
      throw error;
    }
  }

  async query(collection: string, filters?: any, orderByField?: string, limitCount?: number): Promise<any[]> {
    try {
      let q: any = collection(db, collection);
      
      if (filters) {
        Object.entries(filters).forEach(([field, value]) => {
          q = query(q, where(field, '==', value));
        });
      }

      if (orderByField) {
        q = query(q, orderBy(orderByField));
      }

      if (limitCount) {
        q = query(q, limit(limitCount));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...(doc.data() as Record<string, any>) 
      }));
    } catch (error) {
      console.error('Error querying collection:', error);
      throw error;
    }
  }

  getSyncStatus(): SyncStatus {
    return this.manager.getSyncStatus();
  }

  subscribeToStatus(callback: (status: SyncStatus) => void): () => void {
    return this.manager.subscribeToStatus(callback);
  }
}

export default OfflinePersistenceManager; 