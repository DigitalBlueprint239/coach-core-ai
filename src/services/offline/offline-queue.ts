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
  private readonly MAX_QUEUE_SIZE = 100; // Maximum number of queued actions
  private readonly MAX_QUEUE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  private isProcessing = false;

  async addToQueue(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const queue = await this.getQueue();
    
    // Clean up old and excess items before adding new one
    await this.cleanupQueue(queue);
    
    // Check if queue is at capacity
    if (queue.length >= this.MAX_QUEUE_SIZE) {
      console.warn(`Queue is at capacity (${this.MAX_QUEUE_SIZE}). Removing oldest low-priority items.`);
      this.removeOldestLowPriorityItems(queue);
    }
    
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
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 } as const;
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

  /**
   * Clean up old and excess queue items
   */
  private async cleanupQueue(queue: QueuedAction[]): Promise<void> {
    const now = Date.now();
    const initialLength = queue.length;
    
    // Remove items older than MAX_QUEUE_AGE
    const filteredQueue = queue.filter(action => {
      const age = now - action.timestamp;
      return age < this.MAX_QUEUE_AGE;
    });
    
    // Remove excess items if still over limit
    if (filteredQueue.length > this.MAX_QUEUE_SIZE) {
      this.removeOldestLowPriorityItems(filteredQueue);
    }
    
    const removedCount = initialLength - filteredQueue.length;
    if (removedCount > 0) {
      console.log(`Cleaned up ${removedCount} old/excess queue items`);
      // Update the queue array in place
      queue.splice(0, queue.length, ...filteredQueue);
    }
  }

  /**
   * Remove oldest low-priority items to make room
   */
  private removeOldestLowPriorityItems(queue: QueuedAction[]): void {
    // Sort by priority (high first) then by timestamp (oldest first)
    queue.sort((a, b) => {
      const priorityOrder: Record<string, number> = {
        critical: 4,
        high: 3,
        medium: 2,
        low: 1,
      };
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      return a.timestamp - b.timestamp; // Older first
    });
    
    // Remove items from the end (lowest priority, oldest)
    const toRemove = queue.length - this.MAX_QUEUE_SIZE + 1; // +1 to make room for new item
    const removed = queue.splice(-toRemove, toRemove);
    
    console.log(`Removed ${removed.length} low-priority items from queue`);
  }

  /**
   * Get detailed queue statistics
   */
  async getDetailedQueueStats(): Promise<{
    total: number;
    byPriority: { [key: string]: number };
    oldest: number;
    newest: number;
  }> {
    const queue = await this.getQueue();
    const now = Date.now();
    
    const byPriority = queue.reduce((acc, action) => {
      acc[action.priority] = (acc[action.priority] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    const timestamps = queue.map(action => action.timestamp);
    const oldest = timestamps.length > 0 ? Math.min(...timestamps) : 0;
    const newest = timestamps.length > 0 ? Math.max(...timestamps) : 0;
    
    return {
      total: queue.length,
      byPriority,
      oldest: oldest > 0 ? now - oldest : 0,
      newest: newest > 0 ? now - newest : 0,
    };
  }
}

export const offlineQueue = new OfflineQueue();

// Initialize when module loads
offlineQueue.initialize();
