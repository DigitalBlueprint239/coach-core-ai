import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot,
  Unsubscribe,
  Query,
  WriteBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import { createFirestoreHelper } from '../../utils/firestore-sanitization';

// ============================================
// CACHING SYSTEM
// ============================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class FirestoreCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Generate cache key for queries
  generateQueryKey(collectionName: string, constraints: any[]): string {
    return `${collectionName}:${JSON.stringify(constraints)}`;
  }

  // Generate cache key for documents
  generateDocKey(collectionName: string, docId: string): string {
    return `${collectionName}:${docId}`;
  }
}

// ============================================
// BATCH OPERATIONS
// ============================================

class BatchManager {
  private batch: WriteBatch | null = null;
  private operations: Array<() => void> = [];
  private readonly MAX_BATCH_SIZE = 500; // Firestore limit

  startBatch(): void {
    this.batch = writeBatch(db);
    this.operations = [];
  }

  addOperation(operation: () => void): void {
    this.operations.push(operation);
    
    if (this.operations.length >= this.MAX_BATCH_SIZE) {
      this.commitBatch();
    }
  }

  async commitBatch(): Promise<void> {
    if (!this.batch || this.operations.length === 0) return;

    try {
      // Apply all operations to the batch
      this.operations.forEach(operation => operation());
      
      // Commit the batch
      await this.batch.commit();
      
      console.log(`✅ Batch committed: ${this.operations.length} operations`);
    } catch (error) {
      console.error('❌ Batch commit failed:', error);
      throw error;
    } finally {
      this.resetBatch();
    }
  }

  private resetBatch(): void {
    this.batch = null;
    this.operations = [];
  }

  getBatch(): WriteBatch | null {
    return this.batch;
  }
}

// ============================================
// QUERY OPTIMIZATION
// ============================================

interface QueryOptions {
  useCache?: boolean;
  cacheTTL?: number;
  batchSize?: number;
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  limitCount?: number;
}

interface IndexedQuery {
  collection: string;
  field: string;
  operator: any;
  value: any;
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  limit?: number;
}

// ============================================
// MAIN OPTIMIZED FIRESTORE SERVICE
// ============================================

export class OptimizedFirestoreService {
  private cache = new FirestoreCache();
  private batchManager = new BatchManager();
  private activeListeners = new Map<string, Unsubscribe>();
  private firestoreHelper = createFirestoreHelper('optimized');

  // ============================================
  // DOCUMENT OPERATIONS
  // ============================================

  /**
   * Get a single document with caching
   */
  async getDocument<T>(
    collectionName: string,
    docId: string,
    options: QueryOptions = {}
  ): Promise<T | null> {
    const { useCache = true, cacheTTL } = options;
    const cacheKey = this.cache.generateDocKey(collectionName, docId);

    // Check cache first
    if (useCache) {
      const cached = this.cache.get<T>(cacheKey);
      if (cached) {
        console.log(`📦 Cache hit: ${cacheKey}`);
        return cached;
      }
    }

    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as T;
        
        // Cache the result
        if (useCache) {
          this.cache.set(cacheKey, data, cacheTTL);
        }

        return data;
      }

      return null;
    } catch (error) {
      console.error(`❌ Error getting document ${collectionName}/${docId}:`, error);
      throw error;
    }
  }

  /**
   * Get multiple documents with caching and batching
   */
  async getDocuments<T>(
    collectionName: string,
    constraints: Array<{ field: string; operator: any; value: any }> = [],
    options: QueryOptions = {}
  ): Promise<T[]> {
    const { useCache = true, cacheTTL, orderByField, orderDirection = 'asc', limitCount } = options;
    const cacheKey = this.cache.generateQueryKey(collectionName, constraints);

    // Check cache first
    if (useCache) {
      const cached = this.cache.get<T[]>(cacheKey);
      if (cached) {
        console.log(`📦 Cache hit: ${cacheKey}`);
        return cached;
      }
    }

    try {
      let q: Query = collection(db, collectionName);

      // Apply constraints
      constraints.forEach(constraint => {
        q = query(q, where(constraint.field, constraint.operator, constraint.value));
      });

      // Apply ordering
      if (orderByField) {
        q = query(q, orderBy(orderByField, orderDirection));
      }

      // Apply limit
      if (limitCount) {
        q = query(q, limit(limitCount));
      }

      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));

      // Cache the result
      if (useCache) {
        this.cache.set(cacheKey, data, cacheTTL);
      }

      return data;
    } catch (error) {
      console.error(`❌ Error getting documents from ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Create a document with sanitization
   */
  async createDocument<T>(
    collectionName: string,
    data: Partial<T>,
    requiredFields: string[] = [],
    useBatch: boolean = false
  ): Promise<string> {
    try {
      const helper = createFirestoreHelper(collectionName);
      const { data: sanitizedData, isValid, warnings } = helper.prepareCreate(data, requiredFields);

      if (!isValid) {
        throw new Error(`Invalid data for collection ${collectionName}: ${warnings.join(', ')}`);
      }

      if (useBatch) {
        const batch = this.batchManager.getBatch();
        if (!batch) {
          this.batchManager.startBatch();
        }
        
        const docRef = doc(collection(db, collectionName));
        this.batchManager.addOperation(() => {
          batch!.set(docRef, sanitizedData);
        });
        
        return docRef.id;
      } else {
        const docRef = await addDoc(collection(db, collectionName), sanitizedData);
        helper.logResult('create', true, docRef.id, warnings);
        
        // Invalidate related caches
        this.invalidateCollectionCache(collectionName);
        
        return docRef.id;
      }
    } catch (error) {
      console.error(`❌ Error creating document in ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Update a document with sanitization
   */
  async updateDocument<T>(
    collectionName: string,
    docId: string,
    data: Partial<T>,
    requiredFields: string[] = [],
    useBatch: boolean = false
  ): Promise<void> {
    try {
      const helper = createFirestoreHelper(collectionName);
      const { data: sanitizedData, isValid, warnings } = helper.prepareUpdate(data, requiredFields);

      if (!isValid) {
        throw new Error(`Invalid update data for collection ${collectionName}: ${warnings.join(', ')}`);
      }

      if (useBatch) {
        const batch = this.batchManager.getBatch();
        if (!batch) {
          this.batchManager.startBatch();
        }
        
        const docRef = doc(db, collectionName, docId);
        this.batchManager.addOperation(() => {
          batch!.update(docRef, sanitizedData);
        });
      } else {
        const docRef = doc(db, collectionName, docId);
        await updateDoc(docRef, sanitizedData);
        helper.logResult('update', true, docId, warnings);
        
        // Invalidate related caches
        this.invalidateDocumentCache(collectionName, docId);
        this.invalidateCollectionCache(collectionName);
      }
    } catch (error) {
      console.error(`❌ Error updating document ${collectionName}/${docId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(
    collectionName: string,
    docId: string,
    useBatch: boolean = false
  ): Promise<void> {
    try {
      if (useBatch) {
        const batch = this.batchManager.getBatch();
        if (!batch) {
          this.batchManager.startBatch();
        }
        
        const docRef = doc(db, collectionName, docId);
        this.batchManager.addOperation(() => {
          batch!.delete(docRef);
        });
      } else {
        const docRef = doc(db, collectionName, docId);
        await deleteDoc(docRef);
        
        // Invalidate related caches
        this.invalidateDocumentCache(collectionName, docId);
        this.invalidateCollectionCache(collectionName);
      }
    } catch (error) {
      console.error(`❌ Error deleting document ${collectionName}/${docId}:`, error);
      throw error;
    }
  }

  // ============================================
  // BATCH OPERATIONS
  // ============================================

  /**
   * Start a batch operation
   */
  startBatch(): void {
    this.batchManager.startBatch();
  }

  /**
   * Commit the current batch
   */
  async commitBatch(): Promise<void> {
    await this.batchManager.commitBatch();
  }

  /**
   * Create multiple documents in a batch
   */
  async createDocumentsBatch<T>(
    collectionName: string,
    documents: Array<{ data: Partial<T>; requiredFields: string[] }>
  ): Promise<string[]> {
    this.startBatch();
    const docIds: string[] = [];

    for (const doc of documents) {
      const docId = await this.createDocument(collectionName, doc.data, doc.requiredFields, true);
      docIds.push(docId);
    }

    await this.commitBatch();
    return docIds;
  }

  /**
   * Update multiple documents in a batch
   */
  async updateDocumentsBatch<T>(
    collectionName: string,
    updates: Array<{ docId: string; data: Partial<T>; requiredFields: string[] }>
  ): Promise<void> {
    this.startBatch();

    for (const update of updates) {
      await this.updateDocument(collectionName, update.docId, update.data, update.requiredFields, true);
    }

    await this.commitBatch();
  }

  // ============================================
  // REAL-TIME LISTENERS
  // ============================================

  /**
   * Subscribe to a document with caching
   */
  subscribeToDocument<T>(
    collectionName: string,
    docId: string,
    callback: (data: T | null) => void,
    options: QueryOptions = {}
  ): Unsubscribe {
    const { useCache = true } = options;
    const cacheKey = this.cache.generateDocKey(collectionName, docId);

    const unsubscribe = onSnapshot(
      doc(db, collectionName, docId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as T;
          
          // Update cache
          if (useCache) {
            this.cache.set(cacheKey, data);
          }
          
          callback(data);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error(`❌ Error in document listener ${collectionName}/${docId}:`, error);
        callback(null);
      }
    );

    // Store listener for cleanup
    this.activeListeners.set(cacheKey, unsubscribe);
    return unsubscribe;
  }

  /**
   * Subscribe to a collection with caching
   */
  subscribeToCollection<T>(
    collectionName: string,
    constraints: Array<{ field: string; operator: any; value: any }> = [],
    callback: (data: T[]) => void,
    options: QueryOptions = {}
  ): Unsubscribe {
    const { useCache = true, orderByField, orderDirection = 'asc', limitCount } = options;
    const cacheKey = this.cache.generateQueryKey(collectionName, constraints);

    let q: Query = collection(db, collectionName);

    // Apply constraints
    constraints.forEach(constraint => {
      q = query(q, where(constraint.field, constraint.operator, constraint.value));
    });

    // Apply ordering
    if (orderByField) {
      q = query(q, orderBy(orderByField, orderDirection));
    }

    // Apply limit
    if (limitCount) {
      q = query(q, limit(limitCount));
    }

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        
        // Update cache
        if (useCache) {
          this.cache.set(cacheKey, data);
        }
        
        callback(data);
      },
      (error) => {
        console.error(`❌ Error in collection listener ${collectionName}:`, error);
        callback([]);
      }
    );

    // Store listener for cleanup
    this.activeListeners.set(cacheKey, unsubscribe);
    return unsubscribe;
  }

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  /**
   * Invalidate cache for a specific document
   */
  invalidateDocumentCache(collectionName: string, docId: string): void {
    const cacheKey = this.cache.generateDocKey(collectionName, docId);
    this.cache.delete(cacheKey);
  }

  /**
   * Invalidate cache for a collection
   */
  invalidateCollectionCache(collectionName: string): void {
    // Remove all cache entries for this collection
    const keysToDelete: string[] = [];
    for (const key of this.cache['cache'].keys()) {
      if (key.startsWith(`${collectionName}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache['cache'].size,
      keys: Array.from(this.cache['cache'].keys()),
    };
  }

  // ============================================
  // CLEANUP
  // ============================================

  /**
   * Cleanup all active listeners
   */
  cleanup(): void {
    this.activeListeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.activeListeners.clear();
    this.cache.clear();
  }

  /**
   * Cleanup specific listener
   */
  cleanupListener(collectionName: string, docId?: string): void {
    const key = docId 
      ? this.cache.generateDocKey(collectionName, docId)
      : collectionName;
    
    const unsubscribe = this.activeListeners.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.activeListeners.delete(key);
    }
  }
}

// ============================================
// EXPORT SINGLETON INSTANCE
// ============================================

export const optimizedFirestore = new OptimizedFirestoreService();

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

export const getDocument = <T>(collectionName: string, docId: string, options?: QueryOptions) =>
  optimizedFirestore.getDocument<T>(collectionName, docId, options);

export const getDocuments = <T>(collectionName: string, constraints?: any[], options?: QueryOptions) =>
  optimizedFirestore.getDocuments<T>(collectionName, constraints, options);

export const createDocument = <T>(collectionName: string, data: Partial<T>, requiredFields?: string[], useBatch?: boolean) =>
  optimizedFirestore.createDocument<T>(collectionName, data, requiredFields, useBatch);

export const updateDocument = <T>(collectionName: string, docId: string, data: Partial<T>, requiredFields?: string[], useBatch?: boolean) =>
  optimizedFirestore.updateDocument<T>(collectionName, docId, data, requiredFields, useBatch);

export const deleteDocument = (collectionName: string, docId: string, useBatch?: boolean) =>
  optimizedFirestore.deleteDocument(collectionName, docId, useBatch);

export const subscribeToDocument = <T>(collectionName: string, docId: string, callback: (data: T | null) => void, options?: QueryOptions) =>
  optimizedFirestore.subscribeToDocument<T>(collectionName, docId, callback, options);

export const subscribeToCollection = <T>(collectionName: string, constraints?: any[], callback: (data: T[]) => void, options?: QueryOptions) =>
  optimizedFirestore.subscribeToCollection<T>(collectionName, constraints, callback, options);

export default optimizedFirestore;
