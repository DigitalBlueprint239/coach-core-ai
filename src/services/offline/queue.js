// TEMPORARY STUB: Entire file commented out to unblock build. Restore and refactor for modular Firestore and ServiceWorker API.
/*
// Original code commented out below:
// import { firebase } from '../firebase/config';

interface QueuedAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  collection: string;
  data: any;
  timestamp: number;
}

class OfflineQueue {
  private readonly QUEUE_KEY = 'coach_core_offline_queue';

  async addToQueue(action: Omit<QueuedAction, 'id' | 'timestamp'>): Promise<void> {
    const queue = await this.getQueue();
    const newAction: QueuedAction = {
      ...action,
      id: `action_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
    };
    queue.push(newAction);
    localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
    // Trigger background sync if available
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-team-updates');
    }
  }

  async getQueue(): Promise<QueuedAction[]> {
    const stored = localStorage.getItem(this.QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  async processQueue(): Promise<void> {
    const queue = await this.getQueue();
    const failed: QueuedAction[] = [];
    for (const action of queue) {
      try {
        await this.processAction(action);
      } catch (error) {
        console.error('Failed to process action:', action, error);
        failed.push(action);
      }
    }
    // Keep only failed actions in queue
    localStorage.setItem(this.QUEUE_KEY, JSON.stringify(failed));
  }

  private async processAction(action: QueuedAction): Promise<void> {
    switch (action.type) {
      case 'CREATE':
        await firebase.db.collection(action.collection).add(action.data);
        break;
      case 'UPDATE':
        await firebase.db.collection(action.collection).doc(action.data.id).update(action.data);
        break;
      case 'DELETE':
        await firebase.db.collection(action.collection).doc(action.data.id).delete();
        break;
    }
  }
}

export const offlineQueue = new OfflineQueue();
*/ 
