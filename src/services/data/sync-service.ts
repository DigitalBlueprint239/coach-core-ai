import { dataService } from './data-service';
import { offlineQueue } from '../offline/offline-queue';
import { conflictResolutionService, ConflictData } from './conflict-resolution';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync?: Date;
  pendingChanges: number;
  failedChanges: number;
  conflicts: number;
}

export interface SyncOptions {
  enableRealTime?: boolean;
  enableConflictResolution?: boolean;
  syncInterval?: number; // in milliseconds
  retryAttempts?: number;
}

export class SyncService {
  private isOnline = navigator.onLine;
  private isSyncing = false;
  private lastSync?: Date;
  private syncInterval?: NodeJS.Timeout;
  private options: SyncOptions;
  private conflictCallbacks: Array<(conflicts: ConflictData[]) => void> = [];
  private statusCallbacks: Array<(status: SyncStatus) => void> = [];

  constructor(options: SyncOptions = {}) {
    this.options = {
      enableRealTime: true,
      enableConflictResolution: true,
      syncInterval: 30000, // 30 seconds
      retryAttempts: 3,
      ...options,
    };

    this.initialize();
  }

  private initialize(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.sync();
      this.notifyStatusChange();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyStatusChange();
    });

    // Start periodic sync if enabled
    if (this.options.syncInterval && this.options.syncInterval > 0) {
      this.syncInterval = setInterval(() => {
        if (this.isOnline && !this.isSyncing) {
          this.sync();
        }
      }, this.options.syncInterval);
    }

    // Initial sync if online
    if (this.isOnline) {
      this.sync();
    }
  }

  async sync(): Promise<{ success: number; failed: number; conflicts: number }> {
    if (this.isSyncing || !this.isOnline) {
      return { success: 0, failed: 0, conflicts: 0 };
    }

    this.isSyncing = true;
    this.notifyStatusChange();

    try {
      // Process offline queue
      const queueResults = await offlineQueue.processQueue();
      
      // Update last sync time
      this.lastSync = new Date();
      
      // Notify status change
      this.notifyStatusChange();

      return {
        success: queueResults.success,
        failed: queueResults.failed,
        conflicts: 0, // Conflicts are handled separately
      };
    } catch (error) {
      console.error('Sync failed:', error);
      return { success: 0, failed: 1, conflicts: 0 };
    } finally {
      this.isSyncing = false;
      this.notifyStatusChange();
    }
  }

  // Force sync (useful for manual sync button)
  async forceSync(): Promise<{ success: number; failed: number; conflicts: number }> {
    return this.sync();
  }

  // Get current sync status
  getStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSync: this.lastSync,
      pendingChanges: 0, // This would be calculated from offline queue
      failedChanges: 0, // This would be calculated from offline queue
      conflicts: 0, // This would be calculated from conflict resolution
    };
  }

  // Subscribe to sync status changes
  onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  // Subscribe to conflict notifications
  onConflicts(callback: (conflicts: ConflictData[]) => void): () => void {
    this.conflictCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.conflictCallbacks.indexOf(callback);
      if (index > -1) {
        this.conflictCallbacks.splice(index, 1);
      }
    };
  }

  // Handle data conflicts
  async handleConflicts(localData: any, remoteData: any): Promise<any> {
    if (!this.options.enableConflictResolution) {
      return remoteData; // Default to remote data
    }

    const conflicts = conflictResolutionService.detectConflicts(localData, remoteData);
    
    if (conflicts.length === 0) {
      return remoteData; // No conflicts
    }

    // Notify about conflicts
    this.conflictCallbacks.forEach(callback => callback(conflicts));

    // Resolve conflicts automatically
    const resolutions = conflictResolutionService.resolveConflicts(conflicts);
    const resolvedData = conflictResolutionService.applyResolutions(remoteData, resolutions);

    // Check if manual resolution is required
    const manualResolutions = conflictResolutionService.getManualResolutionRequired(resolutions);
    
    if (manualResolutions.length > 0) {
      console.warn('Manual conflict resolution required:', manualResolutions);
      // In a real app, you'd show a UI for manual resolution
    }

    return resolvedData;
  }

  // Clean up resources
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.conflictCallbacks = [];
    this.statusCallbacks = [];
  }

  private notifyStatusChange(): void {
    const status = this.getStatus();
    this.statusCallbacks.forEach(callback => callback(status));
  }

  // Get sync statistics
  async getSyncStats(): Promise<{
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageSyncTime: number;
    lastSyncTime?: Date;
  }> {
    const queueStats = await offlineQueue.getQueueStats();
    
    return {
      totalOperations: queueStats.total,
      successfulOperations: queueStats.total - queueStats.failed,
      failedOperations: queueStats.failed,
      averageSyncTime: 0, // This would be calculated from actual sync times
      lastSyncTime: this.lastSync,
    };
  }

  // Check if data is in sync
  async isDataInSync(): Promise<boolean> {
    const queueStats = await offlineQueue.getQueueStats();
    return queueStats.pending === 0 && queueStats.failed === 0;
  }

  // Get pending changes count
  async getPendingChangesCount(): Promise<number> {
    const queueStats = await offlineQueue.getQueueStats();
    return queueStats.pending;
  }

  // Get failed changes count
  async getFailedChangesCount(): Promise<number> {
    const queueStats = await offlineQueue.getQueueStats();
    return queueStats.failed;
  }
}

// Create default sync service instance
export const syncService = new SyncService();

// Create specialized sync services for different data types
export const teamSyncService = new SyncService({
  enableRealTime: true,
  enableConflictResolution: true,
  syncInterval: 15000, // 15 seconds for team data
});

export const practiceSyncService = new SyncService({
  enableRealTime: true,
  enableConflictResolution: true,
  syncInterval: 30000, // 30 seconds for practice data
});

export const gameSyncService = new SyncService({
  enableRealTime: true,
  enableConflictResolution: true,
  syncInterval: 10000, // 10 seconds for game data (more frequent for live updates)
});
