// src/utils/backup-automation.ts
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';

// ============================================
// BACKUP TYPES
// ============================================

export interface BackupConfig {
  collections: string[];
  schedule: BackupSchedule;
  retention: BackupRetention;
  compression: boolean;
  encryption: boolean;
  storage: BackupStorage;
  notifications: BackupNotifications;
}

export interface BackupSchedule {
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // HH:mm format
  timezone: string;
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  enabled: boolean;
}

export interface BackupRetention {
  maxBackups: number;
  maxAge: number; // days
  deleteExpired: boolean;
}

export interface BackupStorage {
  type: 'firestore' | 'cloud_storage' | 'external';
  bucket?: string;
  path?: string;
  credentials?: any;
}

export interface BackupNotifications {
  onSuccess: boolean;
  onFailure: boolean;
  onExpiry: boolean;
  recipients: string[];
}

export interface BackupJob {
  id: string;
  config: BackupConfig;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  progress: {
    current: number;
    total: number;
    collection: string;
  };
  error?: string;
  backupId?: string;
  size?: number;
  checksum?: string;
}

export interface BackupMetadata {
  id: string;
  timestamp: Timestamp;
  collections: string[];
  documentCount: number;
  size: number;
  checksum: string;
  config: BackupConfig;
  status: 'valid' | 'corrupted' | 'expired';
}

// ============================================
// BACKUP AUTOMATION MANAGER
// ============================================

export class BackupAutomationManager {
  private config: BackupConfig;
  private jobs: Map<string, BackupJob> = new Map();
  private scheduler: NodeJS.Timeout | null = null;

  constructor(config: BackupConfig) {
    this.config = config;
    this.initializeScheduler();
  }

  // ============================================
  // SCHEDULER MANAGEMENT
  // ============================================

  private initializeScheduler(): void {
    if (!this.config.schedule.enabled) return;

    const interval = this.getScheduleInterval();
    this.scheduler = setInterval(() => {
      this.checkAndRunScheduledBackup();
    }, interval);

    console.log(
      `Backup scheduler initialized with ${this.config.schedule.frequency} frequency`
    );
  }

  private getScheduleInterval(): number {
    switch (this.config.schedule.frequency) {
      case 'daily':
        return 24 * 60 * 60 * 1000; // 24 hours
      case 'weekly':
        return 7 * 24 * 60 * 60 * 1000; // 7 days
      case 'monthly':
        return 30 * 24 * 60 * 60 * 1000; // 30 days
      default:
        return 24 * 60 * 60 * 1000; // Default to daily
    }
  }

  private async checkAndRunScheduledBackup(): Promise<void> {
    const now = new Date();
    const scheduleTime = this.parseScheduleTime(this.config.schedule.time);

    // Check if it's time to run the backup
    if (this.shouldRunBackup(now, scheduleTime)) {
      await this.createBackupJob();
    }
  }

  private parseScheduleTime(timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const now = new Date();
    const scheduleTime = new Date(now);
    scheduleTime.setHours(hours, minutes, 0, 0);
    return scheduleTime;
  }

  private shouldRunBackup(now: Date, scheduleTime: Date): boolean {
    const timeDiff = Math.abs(now.getTime() - scheduleTime.getTime());
    const tolerance = 5 * 60 * 1000; // 5 minutes tolerance

    if (timeDiff > tolerance) return false;

    switch (this.config.schedule.frequency) {
      case 'daily':
        return true;
      case 'weekly':
        return now.getDay() === this.config.schedule.dayOfWeek;
      case 'monthly':
        return now.getDate() === this.config.schedule.dayOfMonth;
      default:
        return false;
    }
  }

  // ============================================
  // BACKUP JOB MANAGEMENT
  // ============================================

  async createBackupJob(): Promise<string> {
    const jobId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const job: BackupJob = {
      id: jobId,
      config: this.config,
      status: 'pending',
      progress: { current: 0, total: 0, collection: '' },
    };

    this.jobs.set(jobId, job);

    // Store job in Firestore
    await setDoc(doc(db, '_backupJobs', jobId), {
      ...job,
      createdAt: serverTimestamp(),
    });

    // Start the backup job
    this.runBackupJob(jobId);

    return jobId;
  }

  private async runBackupJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      job.status = 'running';
      job.startedAt = Timestamp.now();
      await this.updateJobInFirestore(job);

      const backupId = await this.performBackup(job);

      job.status = 'completed';
      job.completedAt = Timestamp.now();
      job.backupId = backupId;
      await this.updateJobInFirestore(job);

      // Send success notification
      if (this.config.notifications.onSuccess) {
        await this.sendNotification('success', job);
      }

      // Clean up old backups
      await this.cleanupOldBackups();
    } catch (error) {
      job.status = 'failed';
      job.completedAt = Timestamp.now();
      job.error = error instanceof Error ? error.message : 'Unknown error';
      await this.updateJobInFirestore(job);

      // Send failure notification
      if (this.config.notifications.onFailure) {
        await this.sendNotification('failure', job);
      }
    }
  }

  private async performBackup(job: BackupJob): Promise<string> {
    const backupId = `backup_${Date.now()}`;
    const backup: any = {
      id: backupId,
      timestamp: Timestamp.now(),
      collections: {},
      metadata: {
        totalDocuments: 0,
        totalSize: 0,
        checksum: '',
      },
    };

    let totalDocuments = 0;
    let totalSize = 0;

    for (const collectionName of this.config.collections) {
      job.progress.collection = collectionName;
      await this.updateJobInFirestore(job);

      const collectionData = await this.backupCollection(collectionName);
      backup.collections[collectionName] = collectionData;

      totalDocuments += collectionData.documents.length;
      totalSize += JSON.stringify(collectionData).length;

      job.progress.current++;
      job.progress.total = this.config.collections.length;
      await this.updateJobInFirestore(job);
    }

    backup.metadata.totalDocuments = totalDocuments;
    backup.metadata.totalSize = totalSize;
    backup.metadata.checksum = this.generateChecksum(backup);

    // Compress if enabled
    if (this.config.compression) {
      backup.data = await this.compressData(backup);
    }

    // Encrypt if enabled
    if (this.config.encryption) {
      backup.data = await this.encryptData(backup.data || backup);
    }

    // Store backup
    await this.storeBackup(backupId, backup);

    return backupId;
  }

  private async backupCollection(collectionName: string): Promise<any> {
    const snapshot = await getDocs(collection(db, collectionName));

    return {
      name: collectionName,
      documentCount: snapshot.docs.length,
      documents: snapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data(),
        metadata: {
          hasPendingWrites: doc.metadata.hasPendingWrites,
          fromCache: doc.metadata.fromCache,
          createdAt: doc.data().createdAt ?? null,
          updatedAt: doc.data().updatedAt ?? null,
        },
      })),
    };
  }

  private generateChecksum(data: any): string {
    const jsonString = JSON.stringify(data);
    let hash = 0;

    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return hash.toString(16);
  }

  private async compressData(data: any): Promise<string> {
    // Simple compression using JSON.stringify and base64
    // In production, use a proper compression library like pako
    const jsonString = JSON.stringify(data);
    return btoa(jsonString);
  }

  private async encryptData(data: any): Promise<string> {
    // Simple encryption using base64
    // In production, use a proper encryption library like crypto-js
    const jsonString = JSON.stringify(data);
    return btoa(jsonString);
  }

  private async storeBackup(backupId: string, backup: any): Promise<void> {
    switch (this.config.storage.type) {
      case 'firestore':
        await setDoc(doc(db, '_backups', backupId), {
          ...backup,
          storedAt: serverTimestamp(),
        });
        break;

      case 'cloud_storage':
        await this.storeInCloudStorage(backupId, backup);
        break;

      case 'external':
        await this.storeExternally(backupId, backup);
        break;
    }
  }

  private async storeInCloudStorage(
    backupId: string,
    backup: any
  ): Promise<void> {
    // Implementation for Google Cloud Storage
    // This would use the Firebase Storage SDK
    console.log('Storing backup in cloud storage:', backupId);
  }

  private async storeExternally(backupId: string, backup: any): Promise<void> {
    // Implementation for external storage (AWS S3, etc.)
    console.log('Storing backup externally:', backupId);
  }

  // ============================================
  // BACKUP RESTORATION
  // ============================================

  async restoreBackup(backupId: string, collections?: string[]): Promise<void> {
    try {
      const backup = await this.loadBackup(backupId);

      if (!backup) {
        throw new Error('Backup not found');
      }

      // Validate backup integrity
      const isValid = this.validateBackup(backup);
      if (!isValid) {
        throw new Error('Backup is corrupted or invalid');
      }

      const collectionsToRestore =
        collections || Object.keys(backup.collections);
      const batch = writeBatch(db);

      for (const collectionName of collectionsToRestore) {
        const collectionData = backup.collections[collectionName];
        if (!collectionData) continue;

        for (const docData of collectionData.documents) {
          const docRef = doc(db, collectionName, docData.id);
          batch.set(docRef, docData.data);
        }
      }

      await batch.commit();
      console.log(`Backup ${backupId} restored successfully`);
    } catch (error) {
      console.error('Error restoring backup:', error);
      throw error;
    }
  }

  private async loadBackup(backupId: string): Promise<any> {
    switch (this.config.storage.type) {
      case 'firestore':
        const backupDoc = await getDoc(doc(db, '_backups', backupId));
        return backupDoc.exists() ? backupDoc.data() : null;

      case 'cloud_storage':
        return await this.loadFromCloudStorage(backupId);

      case 'external':
        return await this.loadFromExternal(backupId);

      default:
        throw new Error('Unknown storage type');
    }
  }

  private async loadFromCloudStorage(backupId: string): Promise<any> {
    // Implementation for loading from Google Cloud Storage
    console.log('Loading backup from cloud storage:', backupId);
    return null;
  }

  private async loadFromExternal(backupId: string): Promise<any> {
    // Implementation for loading from external storage
    console.log('Loading backup from external storage:', backupId);
    return null;
  }

  private validateBackup(backup: any): boolean {
    if (!backup.metadata || !backup.collections) {
      return false;
    }

    const currentChecksum = this.generateChecksum(backup);
    return currentChecksum === backup.metadata.checksum;
  }

  // ============================================
  // CLEANUP AND RETENTION
  // ============================================

  private async cleanupOldBackups(): Promise<void> {
    if (!this.config.retention.deleteExpired) return;

    try {
      const backups = await this.listBackups();
      const now = Date.now();
      const maxAge = this.config.retention.maxAge * 24 * 60 * 60 * 1000; // Convert days to milliseconds

      // Sort backups by timestamp (oldest first)
      backups.sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());

      // Delete expired backups
      for (const backup of backups) {
        const age = now - backup.timestamp.toMillis();
        if (age > maxAge) {
          await this.deleteBackup(backup.id);
        }
      }

      // Delete excess backups if over limit
      if (backups.length > this.config.retention.maxBackups) {
        const excessCount = backups.length - this.config.retention.maxBackups;
        for (let i = 0; i < excessCount; i++) {
          await this.deleteBackup(backups[i].id);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }

  private async listBackups(): Promise<BackupMetadata[]> {
    const snapshot = await getDocs(collection(db, '_backups'));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      timestamp: doc.data().timestamp,
      collections: doc.data().collections
        ? Object.keys(doc.data().collections)
        : [],
      documentCount: doc.data().metadata?.totalDocuments || 0,
      size: doc.data().metadata?.totalSize || 0,
      checksum: doc.data().metadata?.checksum || '',
      config: doc.data().config,
      status: 'valid', // This would be validated
    }));
  }

  private async deleteBackup(backupId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, '_backups', backupId));
      console.log(`Backup ${backupId} deleted`);
    } catch (error) {
      console.error(`Error deleting backup ${backupId}:`, error);
    }
  }

  // ============================================
  // NOTIFICATIONS
  // ============================================

  private async sendNotification(
    type: 'success' | 'failure',
    job: BackupJob
  ): Promise<void> {
    const message = this.createNotificationMessage(type, job);

    // Send to configured recipients
    for (const recipient of this.config.notifications.recipients) {
      await this.sendToRecipient(recipient, message);
    }
  }

  private createNotificationMessage(
    type: 'success' | 'failure',
    job: BackupJob
  ): string {
    const baseMessage = `Backup job ${job.id} ${type === 'success' ? 'completed successfully' : 'failed'}`;

    if (type === 'success') {
      return `${baseMessage}\nBackup ID: ${job.backupId}\nSize: ${job.size} bytes\nDuration: ${this.calculateDuration(job)}`;
    } else {
      return `${baseMessage}\nError: ${job.error}`;
    }
  }

  private calculateDuration(job: BackupJob): string {
    if (!job.startedAt || !job.completedAt) return 'Unknown';

    const duration = job.completedAt.toMillis() - job.startedAt.toMillis();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);

    return `${minutes}m ${seconds}s`;
  }

  private async sendToRecipient(
    recipient: string,
    message: string
  ): Promise<void> {
    // Implementation for sending notifications
    // This could be email, Slack, webhook, etc.
    console.log(`Sending notification to ${recipient}:`, message);
  }

  // ============================================
  // JOB MANAGEMENT
  // ============================================

  private async updateJobInFirestore(job: BackupJob): Promise<void> {
    await setDoc(doc(db, '_backupJobs', job.id), {
      ...job,
      updatedAt: serverTimestamp(),
    });
  }

  async getJobStatus(jobId: string): Promise<BackupJob | null> {
    return this.jobs.get(jobId) || null;
  }

  async getAllJobs(): Promise<BackupJob[]> {
    return Array.from(this.jobs.values());
  }

  async cancelJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'pending') {
      job.status = 'failed';
      job.error = 'Cancelled by user';
      await this.updateJobInFirestore(job);
    }
  }

  // ============================================
  // CONFIGURATION MANAGEMENT
  // ============================================

  updateConfig(newConfig: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart scheduler if schedule changed
    if (this.scheduler) {
      clearInterval(this.scheduler);
      this.initializeScheduler();
    }
  }

  getConfig(): BackupConfig {
    return { ...this.config };
  }

  // ============================================
  // CLEANUP
  // ============================================

  destroy(): void {
    if (this.scheduler) {
      clearInterval(this.scheduler);
      this.scheduler = null;
    }
    this.jobs.clear();
  }
}

// ============================================
// REACT HOOKS
// ============================================

import { useState, useEffect, useCallback } from 'react';

export const useBackupAutomation = (config: BackupConfig) => {
  const [manager] = useState(() => new BackupAutomationManager(config));
  const [jobs, setJobs] = useState<BackupJob[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const loadJobs = async () => {
      const allJobs = await manager.getAllJobs();
      setJobs(allJobs);
    };

    loadJobs();

    // Poll for job updates
    const interval = setInterval(loadJobs, 5000);

    return () => {
      clearInterval(interval);
      manager.destroy();
    };
  }, [manager]);

  const createBackup = useCallback(async () => {
    setIsRunning(true);
    try {
      const jobId = await manager.createBackupJob();
      return jobId;
    } finally {
      setIsRunning(false);
    }
  }, [manager]);

  const restoreBackup = useCallback(
    async (backupId: string, collections?: string[]) => {
      return manager.restoreBackup(backupId, collections);
    },
    [manager]
  );

  const cancelJob = useCallback(
    async (jobId: string) => {
      return manager.cancelJob(jobId);
    },
    [manager]
  );

  return {
    manager,
    jobs,
    isRunning,
    createBackup,
    restoreBackup,
    cancelJob,
    getJobStatus: (jobId: string) => manager.getJobStatus(jobId),
    updateConfig: (config: Partial<BackupConfig>) =>
      manager.updateConfig(config),
    getConfig: () => manager.getConfig(),
  };
};

export default BackupAutomationManager;
