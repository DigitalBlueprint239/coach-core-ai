import { db } from '../firebase/firebase-config';
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
  Timestamp,
  writeBatch,
  Query,
  DocumentData,
} from 'firebase/firestore';
import { offlineQueue } from '../offline/offline-queue';
import { conflictResolutionService, ConflictData } from './conflict-resolution';

export interface DataServiceOptions {
  enableOfflineQueue?: boolean;
  enableRealTime?: boolean;
  retryOnFailure?: boolean;
}

export interface QueryOptions {
  where?: Array<{ field: string; operator: any; value: any }>;
  orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  limit?: number;
}

export class DataService {
  private options: DataServiceOptions;

  constructor(options: DataServiceOptions = {}) {
    this.options = {
      enableOfflineQueue: true,
      enableRealTime: true,
      retryOnFailure: true,
      ...options,
    };
  }

  // Create document
  async create<T extends Record<string, any>>(
    collectionName: string, 
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
    docId?: string
  ): Promise<string> {
    try {
      const docData = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (docId) {
        await setDoc(doc(db, collectionName, docId), docData);
        return docId;
      } else {
        const docRef = await addDoc(collection(db, collectionName), docData);
        return docRef.id;
      }
    } catch (error) {
      console.error(`Error creating document in ${collectionName}:`, error);
      
      if (this.options.enableOfflineQueue && this.options.retryOnFailure) {
        const actionId = await offlineQueue.addToQueue({
          type: 'CREATE',
          collection: collectionName,
          docId,
          data,
          priority: 'high',
        });
        console.log(`Queued create action: ${actionId}`);
        throw new Error(`Document creation failed, queued for retry: ${actionId}`);
      }
      
      throw error;
    }
  }

  // Read single document
  async read<T>(collectionName: string, docId: string): Promise<T | null> {
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return this.convertFirestoreData(docSnap.data()) as T;
      }
      
      return null;
    } catch (error) {
      console.error(`Error reading document ${docId} from ${collectionName}:`, error);
      throw error;
    }
  }

  // Read multiple documents
  async readMany<T>(
    collectionName: string, 
    options: QueryOptions = {}
  ): Promise<T[]> {
    try {
      let q: Query<DocumentData> = collection(db, collectionName);

      // Apply where clauses
      if (options.where) {
        for (const whereClause of options.where) {
          q = query(q, where(whereClause.field, whereClause.operator, whereClause.value));
        }
      }

      // Apply order by
      if (options.orderBy) {
        for (const orderClause of options.orderBy) {
          q = query(q, orderBy(orderClause.field, orderClause.direction));
        }
      }

      // Apply limit
      if (options.limit) {
        q = query(q, limit(options.limit));
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => this.convertFirestoreData(doc.data()) as T);
    } catch (error) {
      console.error(`Error reading documents from ${collectionName}:`, error);
      throw error;
    }
  }

  // Update document
  async update<T extends Record<string, any>>(
    collectionName: string, 
    docId: string, 
    data: Partial<T>
  ): Promise<void> {
    try {
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error(`Error updating document ${docId} in ${collectionName}:`, error);
      
      if (this.options.enableOfflineQueue && this.options.retryOnFailure) {
        const actionId = await offlineQueue.addToQueue({
          type: 'UPDATE',
          collection: collectionName,
          docId,
          data,
          priority: 'high',
        });
        console.log(`Queued update action: ${actionId}`);
        throw new Error(`Document update failed, queued for retry: ${actionId}`);
      }
      
      throw error;
    }
  }

  // Delete document
  async delete(collectionName: string, docId: string): Promise<void> {
    try {
      const docRef = doc(db, collectionName, docId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting document ${docId} from ${collectionName}:`, error);
      
      if (this.options.enableOfflineQueue && this.options.retryOnFailure) {
        const actionId = await offlineQueue.addToQueue({
          type: 'DELETE',
          collection: collectionName,
          docId,
          data: {},
          priority: 'medium',
        });
        console.log(`Queued delete action: ${actionId}`);
        throw new Error(`Document deletion failed, queued for retry: ${actionId}`);
      }
      
      throw error;
    }
  }

  // Batch operations
  async batchOperation(operations: Array<{
    type: 'create' | 'update' | 'delete';
    collection: string;
    docId?: string;
    data?: any;
  }>): Promise<void> {
    try {
      const batch = writeBatch(db);

      for (const operation of operations) {
        const { type, collection: collectionName, docId, data } = operation;

        switch (type) {
          case 'create':
            if (docId) {
              batch.set(doc(db, collectionName, docId), {
                ...data,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            } else {
              batch.set(doc(db, collectionName), {
                ...data,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }
            break;

          case 'update':
            if (docId) {
              batch.update(doc(db, collectionName, docId), {
                ...data,
                updatedAt: new Date(),
              });
            }
            break;

          case 'delete':
            if (docId) {
              batch.delete(doc(db, collectionName, docId));
            }
            break;
        }
      }

      await batch.commit();
    } catch (error) {
      console.error('Error in batch operation:', error);
      throw error;
    }
  }

  // Real-time subscription
  subscribe<T>(
    collectionName: string,
    callback: (data: T[]) => void,
    options: QueryOptions = {}
  ): () => void {
    try {
      let q: Query<DocumentData> = collection(db, collectionName);

      // Apply where clauses
      if (options.where) {
        for (const whereClause of options.where) {
          q = query(q, where(whereClause.field, whereClause.operator, whereClause.value));
        }
      }

      // Apply order by
      if (options.orderBy) {
        for (const orderClause of options.orderBy) {
          q = query(q, orderBy(orderClause.field, orderClause.direction));
        }
      }

      // Apply limit
      if (options.limit) {
        q = query(q, limit(options.limit));
      }

      return onSnapshot(q, (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => this.convertFirestoreData(doc.data()) as T);
        callback(data);
      });
    } catch (error) {
      console.error(`Error setting up subscription for ${collectionName}:`, error);
      return () => {}; // Return empty unsubscribe function
    }
  }

  // Convert Firestore data to JavaScript objects
  private convertFirestoreData(data: any): any {
    if (!data) return data;

    const converted = { ...data };

    // Convert Timestamps to Dates
    Object.keys(converted).forEach(key => {
      if (converted[key] instanceof Timestamp) {
        converted[key] = converted[key].toDate();
      } else if (converted[key] && typeof converted[key] === 'object' && converted[key].seconds) {
        // Handle nested Timestamps
        converted[key] = new Date(converted[key].seconds * 1000);
      }
    });

    return converted;
  }

  // Get collection stats
  async getCollectionStats(collectionName: string): Promise<{
    total: number;
    lastUpdated?: Date;
  }> {
    try {
      const q = query(collection(db, collectionName), orderBy('updatedAt', 'desc'), limit(1));
      const querySnapshot = await getDocs(q);
      
      return {
        total: querySnapshot.size,
        lastUpdated: querySnapshot.docs[0]?.data()?.updatedAt?.toDate(),
      };
    } catch (error) {
      console.error(`Error getting stats for ${collectionName}:`, error);
      return { total: 0 };
    }
  }

  // Check if document exists
  async exists(collectionName: string, docId: string): Promise<boolean> {
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (error) {
      console.error(`Error checking existence of ${docId} in ${collectionName}:`, error);
      return false;
    }
  }

  // Detect conflicts between local and remote data
  detectConflicts(localData: any, remoteData: any): ConflictData[] {
    return conflictResolutionService.detectConflicts(localData, remoteData);
  }

  // Resolve conflicts with custom resolutions
  resolveConflicts(conflicts: ConflictData[], resolutions: any[]): any {
    return conflictResolutionService.applyResolutions({}, resolutions);
  }

  // Auto-resolve conflicts using predefined strategies
  autoResolveConflicts(localData: any, remoteData: any): { resolvedData: any; conflicts: ConflictData[] } {
    const conflicts = this.detectConflicts(localData, remoteData);
    const autoResolutions = conflictResolutionService.resolveConflicts(conflicts);
    const resolvedData = conflictResolutionService.applyResolutions(remoteData, autoResolutions);
    
    return {
      resolvedData,
      conflicts: conflicts.filter(c => 
        autoResolutions.find(r => r.id === c.id)?.resolution === 'manual'
      ),
    };
  }
}

// Create default instance
export const dataService = new DataService();

// Create specialized instances for different use cases
export const teamDataService = new DataService({
  enableOfflineQueue: true,
  enableRealTime: true,
  retryOnFailure: true,
});

export const practiceDataService = new DataService({
  enableOfflineQueue: true,
  enableRealTime: true,
  retryOnFailure: true,
});

export const gameDataService = new DataService({
  enableOfflineQueue: true,
  enableRealTime: true,
  retryOnFailure: true,
});

export const playerDataService = new DataService({
  enableOfflineQueue: true,
  enableRealTime: true,
  retryOnFailure: true,
});
