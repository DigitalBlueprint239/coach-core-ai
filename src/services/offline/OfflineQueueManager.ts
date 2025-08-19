// src/services/offline/OfflineQueueManager.ts
import { 
  doc, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  runTransaction,
  serverTimestamp,
  DocumentReference,
  WriteBatch,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firestore';

// ============================================
// TYPES AND INTERFACES
// ============================================

export interface QueueItem {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'BATCH';
  collection: string;
  documentId?: string;
  data?: any;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  userId: string;
  teamId?: string;
  metadata?: {
    optimisticData?: any;
    conflictResolution?: 'SERVER_WINS' | 'CLIENT_WINS' | 'MERGE' | 'USER_CHOICE';
    originalVersion?: number;
    description?: string;
  };
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CONFLICT';
  error?: string;
  lastAttempt?: number;
}

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  conflicts: number;
  oldestItem?: number;
  newestItem?: number;
}

export interface ConflictResolution {
  itemId: string;
  strategy: 'SERVER_WINS' | 'CLIENT_WINS' | 'MERGE' | 'USER_CHOICE';
  serverData?: any;
  clientData?: any;
  mergedData?: any;
  resolvedBy?: string;
  resolvedAt?: number;
}

export interface BatchOperation {
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  collection: string;
  documentId?: string;
  data?: any;
  metadata?: any;
}

// ============================================
// INDEXEDDB SCHEMA
// ============================================

const DB_NAME = 'CoachCoreOfflineQueue';
const DB_VERSION = 1;
const STORES = {
  QUEUE: 'queue',
  CONFLICTS: 'conflicts',
  STATS: 'stats'
};

// ============================================
// OFFLINE QUEUE MANAGER
// ============================================

export class OfflineQueueManager {
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private processingQueue = false;
  private networkStatus = navigator.onLine;
  private syncCallbacks: Array<(status: 'online' | 'offline') => void> = [];

  constructor() {
    this.initializeDB();
    this.setupNetworkListeners();
  }

  // ============================================
  // DATABASE INITIALIZATION
  // ============================================

  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create queue store
        if (!db.objectStoreNames.contains(STORES.QUEUE)) {
          const queueStore = db.createObjectStore(STORES.QUEUE, { keyPath: 'id' });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
          queueStore.createIndex('priority', 'priority', { unique: false });
          queueStore.createIndex('status', 'status', { unique: false });
          queueStore.createIndex('userId', 'userId', { unique: false });
          queueStore.createIndex('collection', 'collection', { unique: false });
        }

        // Create conflicts store
        if (!db.objectStoreNames.contains(STORES.CONFLICTS)) {
          const conflictsStore = db.createObjectStore(STORES.CONFLICTS, { keyPath: 'itemId' });
          conflictsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create stats store
        if (!db.objectStoreNames.contains(STORES.STATS)) {
          db.createObjectStore(STORES.STATS, { keyPath: 'id' });
        }
      };
    });
  }

  // ============================================
  // NETWORK STATUS MANAGEMENT
  // ============================================

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.networkStatus = true;
      this.notifySyncCallbacks('online');
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      this.networkStatus = false;
      this.notifySyncCallbacks('offline');
    });
  }

  private notifySyncCallbacks(status: 'online' | 'offline'): void {
    this.syncCallbacks.forEach(callback => callback(status));
  }

  onNetworkStatusChange(callback: (status: 'online' | 'offline') => void): () => void {
    this.syncCallbacks.push(callback);
    return () => {
      const index = this.syncCallbacks.indexOf(callback);
      if (index > -1) {
        this.syncCallbacks.splice(index, 1);
      }
    };
  }

  isOnline(): boolean {
    return this.networkStatus;
  }

  // ============================================
  // QUEUE OPERATIONS
  // ============================================

  async addToQueue(
    type: QueueItem['type'],
    collection: string,
    data?: any,
    options: {
      documentId?: string;
      priority?: QueueItem['priority'];
      userId: string;
      teamId?: string;
      metadata?: QueueItem['metadata'];
      maxRetries?: number;
    } = { userId: 'anonymous' }
  ): Promise<string> {
    await this.waitForInitialization();

    const item: QueueItem = {
      id: this.generateId(),
      type,
      collection,
      documentId: options.documentId,
      data,
      priority: options.priority || 'NORMAL',
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: options.maxRetries || 3,
      userId: options.userId,
      teamId: options.teamId,
      metadata: options.metadata,
      status: 'PENDING'
    };

    await this.saveToIndexedDB(STORES.QUEUE, item);
    this.updateStats();
    
    console.log(`Added item to queue: ${item.id} (${type} on ${collection})`);
    
    // Process queue if online
    if (this.isOnline()) {
      this.processQueue();
    }

    return item.id;
  }

  async removeFromQueue(itemId: string): Promise<void> {
    await this.waitForInitialization();
    await this.deleteFromIndexedDB(STORES.QUEUE, itemId);
    this.updateStats();
  }

  async getQueueItems(
    filters: {
      status?: QueueItem['status'];
      priority?: QueueItem['priority'];
      userId?: string;
      collection?: string;
    } = {}
  ): Promise<QueueItem[]> {
    await this.waitForInitialization();
    
    const items = await this.getAllFromIndexedDB(STORES.QUEUE) as QueueItem[];
    
    return items.filter(item => {
      if (filters.status && item.status !== filters.status) return false;
      if (filters.priority && item.priority !== filters.priority) return false;
      if (filters.userId && item.userId !== filters.userId) return false;
      if (filters.collection && item.collection !== filters.collection) return false;
      return true;
    }).sort((a, b) => {
      // Sort by priority first, then by timestamp
      const priorityOrder = { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      return a.timestamp - b.timestamp;
    });
  }

  async getQueueStats(): Promise<QueueStats> {
    await this.waitForInitialization();
    
    const items = await this.getAllFromIndexedDB(STORES.QUEUE) as QueueItem[];
    
    const stats: QueueStats = {
      total: items.length,
      pending: items.filter(item => item.status === 'PENDING').length,
      processing: items.filter(item => item.status === 'PROCESSING').length,
      completed: items.filter(item => item.status === 'COMPLETED').length,
      failed: items.filter(item => item.status === 'FAILED').length,
      conflicts: items.filter(item => item.status === 'CONFLICT').length,
      oldestItem: items.length > 0 ? Math.min(...items.map(item => item.timestamp)) : undefined,
      newestItem: items.length > 0 ? Math.max(...items.map(item => item.timestamp)) : undefined
    };

    return stats;
  }

  // ============================================
  // QUEUE PROCESSING
  // ============================================

  async processQueue(): Promise<void> {
    if (this.processingQueue || !this.isOnline()) {
      return;
    }

    this.processingQueue = true;
    console.log('Starting queue processing...');

    try {
      const pendingItems = await this.getQueueItems({ status: 'PENDING' });
      
      for (const item of pendingItems) {
        try {
          await this.processQueueItem(item);
        } catch (error) {
          console.error(`Failed to process queue item ${item.id}:`, error);
          await this.handleProcessingError(item, error);
        }
      }

      // Process conflicts
      await this.processConflicts();
      
    } catch (error) {
      console.error('Queue processing failed:', error);
    } finally {
      this.processingQueue = false;
    }
  }

  private async processQueueItem(item: QueueItem): Promise<void> {
    // Update status to processing
    item.status = 'PROCESSING';
    item.lastAttempt = Date.now();
    await this.updateInIndexedDB(STORES.QUEUE, item);

    try {
      switch (item.type) {
        case 'CREATE':
          await this.processCreate(item);
          break;
        case 'UPDATE':
          await this.processUpdate(item);
          break;
        case 'DELETE':
          await this.processDelete(item);
          break;
        case 'BATCH':
          await this.processBatch(item);
          break;
        default:
          throw new Error(`Unknown operation type: ${item.type}`);
      }

      // Mark as completed
      item.status = 'COMPLETED';
      await this.updateInIndexedDB(STORES.QUEUE, item);
      
      console.log(`Successfully processed queue item: ${item.id}`);

    } catch (error) {
      throw error;
    }
  }

  private async processCreate(item: QueueItem): Promise<void> {
    if (!item.data) {
      throw new Error('No data provided for CREATE operation');
    }

    const docRef = await addDoc(collection(db, item.collection), {
      ...item.data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: item.userId,
      lastModifiedBy: item.userId,
      lastModifiedAt: serverTimestamp()
    });

    console.log(`Created document: ${docRef.id} in ${item.collection}`);
  }

  private async processUpdate(item: QueueItem): Promise<void> {
    if (!item.documentId) {
      throw new Error('Document ID required for UPDATE operation');
    }

    if (!item.data) {
      throw new Error('No data provided for UPDATE operation');
    }

    const docRef = doc(db, item.collection, item.documentId);
    
    // Check for optimistic locking conflicts
    if (item.metadata?.originalVersion !== undefined) {
      await runTransaction(db, async (transaction) => {
        const docSnapshot = await transaction.get(docRef);
        
        if (!docSnapshot.exists()) {
          throw new Error('Document not found');
        }

        const currentData = docSnapshot.data();
        const currentVersion = currentData.version || 0;
        const expectedVersion = item.metadata!.originalVersion;

        if (currentVersion !== expectedVersion) {
          // Conflict detected - store for resolution
          await this.storeConflict(item, {
            serverData: currentData,
            clientData: item.data,
            strategy: item.metadata?.conflictResolution || 'USER_CHOICE'
          });
          throw new Error('Version conflict detected');
        }

        const updateData = {
          ...item.data,
          version: currentVersion + 1,
          lastModifiedBy: item.userId,
          lastModifiedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        transaction.update(docRef, updateData);
      });
    } else {
      // No optimistic locking - direct update
      await updateDoc(docRef, {
        ...item.data,
        lastModifiedBy: item.userId,
        lastModifiedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    console.log(`Updated document: ${item.documentId} in ${item.collection}`);
  }

  private async processDelete(item: QueueItem): Promise<void> {
    if (!item.documentId) {
      throw new Error('Document ID required for DELETE operation');
    }

    const docRef = doc(db, item.collection, item.documentId);
    await deleteDoc(docRef);

    console.log(`Deleted document: ${item.documentId} from ${item.collection}`);
  }

  private async processBatch(item: QueueItem): Promise<void> {
    if (!item.data || !Array.isArray(item.data.operations)) {
      throw new Error('Batch operations array required for BATCH operation');
    }

    const batch = writeBatch(db);
    const operations: BatchOperation[] = item.data.operations;

    for (const operation of operations) {
      switch (operation.type) {
        case 'CREATE':
          const docRef = doc(collection(db, operation.collection));
          batch.set(docRef, {
            ...operation.data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: item.userId,
            lastModifiedBy: item.userId,
            lastModifiedAt: serverTimestamp()
          });
          break;

        case 'UPDATE':
          if (!operation.documentId) {
            throw new Error('Document ID required for batch UPDATE operation');
          }
          const updateRef = doc(db, operation.collection, operation.documentId);
          batch.update(updateRef, {
            ...operation.data,
            lastModifiedBy: item.userId,
            lastModifiedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          break;

        case 'DELETE':
          if (!operation.documentId) {
            throw new Error('Document ID required for batch DELETE operation');
          }
          const deleteRef = doc(db, operation.collection, operation.documentId);
          batch.delete(deleteRef);
          break;
      }
    }

    await batch.commit();
    console.log(`Executed batch operation with ${operations.length} operations`);
  }

  // ============================================
  // CONFLICT RESOLUTION
  // ============================================

  private async storeConflict(item: QueueItem, conflict: {
    serverData: any;
    clientData: any;
    strategy: string;
  }): Promise<void> {
    const conflictData: ConflictResolution = {
      itemId: item.id,
      strategy: conflict.strategy as any,
      serverData: conflict.serverData,
      clientData: conflict.clientData,
      timestamp: Date.now()
    };

    await this.saveToIndexedDB(STORES.CONFLICTS, conflictData);
    
    item.status = 'CONFLICT';
    await this.updateInIndexedDB(STORES.QUEUE, item);
    
    console.log(`Stored conflict for item: ${item.id}`);
  }

  async getConflicts(): Promise<ConflictResolution[]> {
    await this.waitForInitialization();
    return await this.getAllFromIndexedDB(STORES.CONFLICTS) as ConflictResolution[];
  }

  async resolveConflict(
    itemId: string, 
    resolution: 'SERVER_WINS' | 'CLIENT_WINS' | 'MERGE',
    mergedData?: any,
    resolvedBy?: string
  ): Promise<void> {
    await this.waitForInitialization();

    const conflict = await this.getFromIndexedDB(STORES.CONFLICTS, itemId) as ConflictResolution;
    if (!conflict) {
      throw new Error(`Conflict not found for item: ${itemId}`);
    }

    const item = await this.getFromIndexedDB(STORES.QUEUE, itemId) as QueueItem;
    if (!item) {
      throw new Error(`Queue item not found: ${itemId}`);
    }

    // Update conflict resolution
    conflict.resolvedBy = resolvedBy || 'system';
    conflict.resolvedAt = Date.now();
    conflict.mergedData = mergedData;

    // Update queue item based on resolution
    switch (resolution) {
      case 'SERVER_WINS':
        item.status = 'COMPLETED';
        break;
      case 'CLIENT_WINS':
        item.status = 'PENDING';
        break;
      case 'MERGE':
        if (mergedData) {
          item.data = mergedData;
          item.status = 'PENDING';
        } else {
          throw new Error('Merged data required for MERGE resolution');
        }
        break;
    }

    // Save updates
    await this.updateInIndexedDB(STORES.CONFLICTS, conflict);
    await this.updateInIndexedDB(STORES.QUEUE, item);
    await this.deleteFromIndexedDB(STORES.CONFLICTS, itemId);

    console.log(`Resolved conflict for item: ${itemId} with strategy: ${resolution}`);
  }

  private async processConflicts(): Promise<void> {
    const conflicts = await this.getConflicts();
    
    for (const conflict of conflicts) {
      const item = await this.getFromIndexedDB(STORES.QUEUE, conflict.itemId) as QueueItem;
      if (!item) continue;

      // Auto-resolve based on strategy
      switch (conflict.strategy) {
        case 'SERVER_WINS':
          await this.resolveConflict(conflict.itemId, 'SERVER_WINS');
          break;
        case 'CLIENT_WINS':
          await this.resolveConflict(conflict.itemId, 'CLIENT_WINS');
          break;
        case 'MERGE':
          // For merge strategy, we need user input, so leave it for manual resolution
          break;
        case 'USER_CHOICE':
          // Leave for manual resolution
          break;
      }
    }
  }

  // ============================================
  // RETRY UTILITY
  // ============================================

  private withRetry = async <T>(
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
  };

  // ============================================
  // ERROR HANDLING
  // ============================================

  private async handleProcessingError(item: QueueItem, error: any): Promise<void> {
    item.retryCount++;
    item.error = error instanceof Error ? error.message : 'Unknown error';
    item.lastAttempt = Date.now();

    if (item.retryCount >= item.maxRetries) {
      item.status = 'FAILED';
      console.error(`Item ${item.id} failed after ${item.maxRetries} retries`);
    } else {
      item.status = 'PENDING';
      // Use retry utility for backoff
      const backoffDelay = Math.min(1000 * Math.pow(2, item.retryCount), 30000);
      setTimeout(() => {
        this.processQueue();
      }, backoffDelay);
    }

    await this.updateInIndexedDB(STORES.QUEUE, item);
  }

  // ============================================
  // INDEXEDDB UTILITIES
  // ============================================

  private async waitForInitialization(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeDB();
    }
  }

  private async saveToIndexedDB(storeName: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getFromIndexedDB(storeName: string, key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async getAllFromIndexedDB(storeName: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async updateInIndexedDB(storeName: string, data: any): Promise<void> {
    return this.saveToIndexedDB(storeName, data);
  }

  private async deleteFromIndexedDB(storeName: string, key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async updateStats(): Promise<void> {
    const stats = await this.getQueueStats();
    await this.saveToIndexedDB(STORES.STATS, { id: 'current', ...stats });
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  private generateId(): string {
    return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async clearQueue(): Promise<void> {
    await this.waitForInitialization();
    
    const transaction = this.db!.transaction([STORES.QUEUE, STORES.CONFLICTS], 'readwrite');
    const queueStore = transaction.objectStore(STORES.QUEUE);
    const conflictsStore = transaction.objectStore(STORES.CONFLICTS);
    
    await Promise.all([
      new Promise((resolve, reject) => {
        const request = queueStore.clear();
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      }),
      new Promise((resolve, reject) => {
        const request = conflictsStore.clear();
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      })
    ]);

    this.updateStats();
    console.log('Queue cleared');
  }

  async getQueueSize(): Promise<number> {
    const stats = await this.getQueueStats();
    return stats.total;
  }

  // ============================================
  // PUBLIC API
  // ============================================

  // Convenience methods for common operations
  async createDocument(
    collection: string,
    data: any,
    options: { userId: string; teamId?: string; priority?: QueueItem['priority'] }
  ): Promise<string> {
    return this.addToQueue('CREATE', collection, data, options);
  }

  async updateDocument(
    collection: string,
    documentId: string,
    data: any,
    options: { 
      userId: string; 
      teamId?: string; 
      priority?: QueueItem['priority'];
      originalVersion?: number;
      conflictResolution?: string;
    }
  ): Promise<string> {
    return this.addToQueue('UPDATE', collection, data, {
      ...options,
      documentId,
      metadata: {
        originalVersion: options.originalVersion,
        conflictResolution: options.conflictResolution as any
      }
    });
  }

  async deleteDocument(
    collection: string,
    documentId: string,
    options: { userId: string; teamId?: string; priority?: QueueItem['priority'] }
  ): Promise<string> {
    return this.addToQueue('DELETE', collection, undefined, {
      ...options,
      documentId
    });
  }

  async batchOperation(
    operations: BatchOperation[],
    options: { userId: string; teamId?: string; priority?: QueueItem['priority'] }
  ): Promise<string> {
    return this.addToQueue('BATCH', 'batch', { operations }, options);
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const offlineQueueManager = new OfflineQueueManager(); 