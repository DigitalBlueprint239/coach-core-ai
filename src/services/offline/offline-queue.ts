import { db } from '../firebase/firebase-config';
import { collection, doc, addDoc, updateDoc, deleteDoc, getDoc, setDoc } from 'firebase/firestore';

export interface QueuedAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  collection: string;
  docId?: string;
  data: any;
  timestamp: number;
  retryCount: number;
  lastAttempt?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface QueueStats {
  total: number;
  pending: number;
  failed: number;
  syncing: boolean;
  lastSync?: Date;
}

class OfflineQueue {
  private readonly QUEUE_KEY = 'coach_core_offline_queue';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second base delay
  private isProcessing = false;

  async addToQueue(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const queue = await this.getQueue();
    const newAction: QueuedAction = {
      ...action,
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      priority: action.priority || 'medium',
    };
    
    queue.push(newAction);
    await this.saveQueue(queue);
    
    // Trigger background sync if online
    if (navigator.onLine) {
      this.processQueue();
    }
    
    return newAction.id;
  }

  async getQueue(): Promise<QueuedAction[]> {
    try {
      const stored = localStorage.getItem(this.QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading offline queue:', error);
      return [];
    }
  }

  async saveQueue(queue: QueuedAction[]): Promise<void> {
    try {
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  }

  async processQueue(): Promise<{ success: number; failed: number }> {
    if (this.isProcessing || !navigator.onLine) {
      return { success: 0, failed: 0 };
    }

    this.isProcessing = true;
    const queue = await this.getQueue();
    const results = { success: 0, failed: 0 };

    try {
      // Sort by priority and timestamp
      const sortedQueue = queue.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.timestamp - b.timestamp;
      });

      const processedActions: QueuedAction[] = [];
      const failedActions: QueuedAction[] = [];

      for (const action of sortedQueue) {
        try {
          await this.processAction(action);
          processedActions.push(action);
          results.success++;
        } catch (error) {
          console.error('Failed to process action:', action, error);
          
          // Check if we should retry
          if (action.retryCount < this.MAX_RETRIES) {
            action.retryCount++;
            action.lastAttempt = Date.now();
            failedActions.push(action);
            results.failed++;
          } else {
            // Max retries reached, log for manual review
            console.error('Action failed after max retries:', action);
            results.failed++;
          }
        }
      }

      // Update queue with remaining failed actions
      await this.saveQueue(failedActions);
      
    } catch (error) {
      console.error('Error processing offline queue:', error);
    } finally {
      this.isProcessing = false;
    }

    return results;
  }

  private async processAction(action: QueuedAction): Promise<void> {
    const { type, collection: collectionName, docId, data } = action;

    switch (type) {
      case 'CREATE':
        if (docId) {
          // Use specific document ID
          await setDoc(doc(db, collectionName, docId), {
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } else {
          // Let Firestore generate ID
          await addDoc(collection(db, collectionName), {
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
        break;

      case 'UPDATE':
        if (!docId) {
          throw new Error('Document ID required for update operation');
        }
        await updateDoc(doc(db, collectionName, docId), {
          ...data,
          updatedAt: new Date(),
        });
        break;

      case 'DELETE':
        if (!docId) {
          throw new Error('Document ID required for delete operation');
        }
        await deleteDoc(doc(db, collectionName, docId));
        break;

      default:
        throw new Error(`Unknown action type: ${type}`);
    }
  }

  async clearQueue(): Promise<void> {
    await this.saveQueue([]);
  }

  async getQueueStats(): Promise<QueueStats> {
    const queue = await this.getQueue();
    const failed = queue.filter(action => action.retryCount >= this.MAX_RETRIES);
    
    return {
      total: queue.length,
      pending: queue.length - failed.length,
      failed: failed.length,
      syncing: this.isProcessing,
      lastSync: queue.length > 0 ? new Date(Math.max(...queue.map(a => a.timestamp))) : undefined,
    };
  }

  async removeAction(actionId: string): Promise<void> {
    const queue = await this.getQueue();
    const filteredQueue = queue.filter(action => action.id !== actionId);
    await this.saveQueue(filteredQueue);
  }

  // Initialize queue processing on app start
  initialize(): void {
    // Process queue when app starts
    if (navigator.onLine) {
      this.processQueue();
    }

    // Process queue when coming back online
    window.addEventListener('online', () => {
      this.processQueue();
    });

    // Process queue periodically (every 30 seconds)
    setInterval(() => {
      if (navigator.onLine && !this.isProcessing) {
        this.processQueue();
      }
    }, 30000);
  }
}

export const offlineQueue = new OfflineQueue();

// Initialize when module loads
offlineQueue.initialize();
