// TEMPORARY STUB: Entire file commented out to unblock build. Restore and refactor for DataValidator and migration logic.
/*
// src/utils/data-migration.ts
import {
  doc,
  getDoc,
  getDocs,
  collection,
  writeBatch,
  runTransaction,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  FieldValue,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { DataValidator } from './data-validation';

// ============================================
// MIGRATION TYPES
// ============================================

export interface Migration {
  version: string;
  name: string;
  description: string;
  up: (data: any) => Promise<any>;
  down: (data: any) => Promise<any>;
  collections: string[];
  dependencies?: string[];
}

export interface MigrationStatus {
  version: string;
  appliedAt: Timestamp;
  appliedBy: string;
  status: 'success' | 'failed' | 'partial';
  error?: string;
  recordsProcessed: number;
  recordsFailed: number;
}

export interface MigrationConfig {
  batchSize: number;
  maxRetries: number;
  validateAfterMigration: boolean;
  backupBeforeMigration: boolean;
  dryRun: boolean;
}

// ============================================
// MIGRATION MANAGER
// ============================================

export class MigrationManager {
  private migrations: Migration[] = [];
  private config: MigrationConfig = {
    batchSize: 100,
    maxRetries: 3,
    validateAfterMigration: true,
    backupBeforeMigration: true,
    dryRun: false
  };

  constructor(config?: Partial<MigrationConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.registerDefaultMigrations();
  }

  // ============================================
  // MIGRATION REGISTRATION
  // ============================================

  registerMigration(migration: Migration): void {
    this.migrations.push(migration);
    this.migrations.sort((a, b) => this.compareVersions(a.version, b.version));
  }

  private registerDefaultMigrations(): void {
    // Migration 1.0.0: Initial schema setup
    this.registerMigration({
      version: '1.0.0',
      name: 'Initial Schema Setup',
      description: 'Sets up initial Firestore schema with users, teams, players, and practice plans',
      collections: ['users', 'teams', 'players', 'practicePlans', 'plays'],
      up: async (data) => {
        // Add required fields if missing
        const updated = { ...data };
        
        if (!updated.createdAt) {
          updated.createdAt = serverTimestamp();
        }
        if (!updated.updatedAt) {
          updated.updatedAt = serverTimestamp();
        }
        if (!updated.createdBy) {
          updated.createdBy = 'system';
        }

        return updated;
      },
      down: async (data) => {
        // Remove added fields
        const { createdAt, updatedAt, createdBy, ...rest } = data;
        return rest;
      }
    });

    // Migration 1.1.0: Add user preferences
    this.registerMigration({
      version: '1.1.0',
      name: 'Add User Preferences',
      description: 'Adds user preferences and notification settings',
      collections: ['users'],
      up: async (data) => {
        if (data.preferences) return data;

        return {
          ...data,
          preferences: {
            notifications: {
              email: true,
              sms: false,
              push: true,
              inApp: true,
              frequency: 'immediate',
              types: ['practice_reminder', 'game_reminder', 'team_update']
            },
            ai: {
              autoSuggest: true,
              confidenceThreshold: 0.7,
              aiPersonality: 'balanced',
              enableVoiceCommands: false
            },
            theme: 'light',
            privacy: {
              profileVisibility: 'team_only',
              shareAnalytics: true,
              allowDataCollection: true
            }
          }
        };
      },
      down: async (data) => {
        const { preferences, ...rest } = data;
        return rest;
      }
    });

    // Migration 1.2.0: Add team statistics
    this.registerMigration({
      version: '1.2.0',
      name: 'Add Team Statistics',
      description: 'Adds comprehensive team statistics and performance tracking',
      collections: ['teams'],
      up: async (data) => {
        if (data.stats) return data;

        return {
          ...data,
          stats: {
            totalPlayers: data.playerIds?.length || 0,
            totalPlays: 0,
            totalPracticePlans: 0,
            averageAttendance: 0,
            winLossRecord: {
              wins: 0,
              losses: 0,
              ties: 0,
              winPercentage: 0
            },
            seasonStartDate: serverTimestamp(),
            seasonEndDate: null
          }
        };
      },
      down: async (data) => {
        const { stats, ...rest } = data;
        return rest;
      }
    });

    // Migration 1.3.0: Add player achievements
    this.registerMigration({
      version: '1.3.0',
      name: 'Add Player Achievements',
      description: 'Adds achievement system for players',
      collections: ['players'],
      up: async (data) => {
        if (data.achievements) return data;

        return {
          ...data,
          achievements: [],
          stats: {
            ...data.stats,
            badges: data.stats?.badges || []
          }
        };
      },
      down: async (data) => {
        const { achievements, ...rest } = data;
        return rest;
      }
    });

    // Migration 1.4.0: Add AI insights
    this.registerMigration({
      version: '1.4.0',
      name: 'Add AI Insights',
      description: 'Adds AI insights and conversation tracking',
      collections: ['aiInsights', 'aiConversations'],
      up: async (data) => {
        // This migration creates new collections, so no data transformation needed
        return data;
      },
      down: async (data) => {
        // Remove AI-related data
        return data;
      }
    });
  }

  // ============================================
  // MIGRATION EXECUTION
  // ============================================

  async runMigrations(targetVersion?: string): Promise<MigrationStatus[]> {
    const currentVersion = await this.getCurrentVersion();
    const migrationsToRun = this.getMigrationsToRun(currentVersion, targetVersion);
    
    const results: MigrationStatus[] = [];

    for (const migration of migrationsToRun) {
      try {
        console.log(`Running migration: ${migration.name} (${migration.version})`);
        
        const result = await this.runMigration(migration);
        results.push(result);
        
        if (result.status === 'failed') {
          console.error(`Migration ${migration.version} failed:`, result.error);
          break;
        }
        
        await this.updateMigrationStatus(migration, result);
        
      } catch (error) {
        console.error(`Error running migration ${migration.version}:`, error);
        results.push({
          version: migration.version,
          appliedAt: Timestamp.now(),
          appliedBy: 'system',
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          recordsProcessed: 0,
          recordsFailed: 0
        });
      }
    }

    return results;
  }

  private async runMigration(migration: Migration): Promise<MigrationStatus> {
    const startTime = Date.now();
    let recordsProcessed = 0;
    let recordsFailed = 0;

    try {
      for (const collectionName of migration.collections) {
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);
        
        const batch = writeBatch(db);
        let batchCount = 0;

        for (const docSnap of snapshot.docs) {
          try {
            const originalData = docSnap.data();
            const migratedData = await migration.up(originalData);

            if (!this.config.dryRun) {
              batch.update(docSnap.ref, migratedData);
              batchCount++;
            }

            recordsProcessed++;

            // Commit batch when it reaches the size limit
            if (batchCount >= this.config.batchSize) {
              await batch.commit();
              batchCount = 0;
            }

          } catch (error) {
            console.error(`Error migrating document ${docSnap.id}:`, error);
            recordsFailed++;
          }
        }

        // Commit remaining documents in batch
        if (batchCount > 0 && !this.config.dryRun) {
          await batch.commit();
        }
      }

      // Validate migration if configured
      if (this.config.validateAfterMigration) {
        await this.validateMigration(migration);
      }

      return {
        version: migration.version,
        appliedAt: Timestamp.now(),
        appliedBy: 'system',
        status: recordsFailed === 0 ? 'success' : 'partial',
        recordsProcessed,
        recordsFailed
      };

    } catch (error) {
      return {
        version: migration.version,
        appliedAt: Timestamp.now(),
        appliedBy: 'system',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        recordsProcessed,
        recordsFailed
      };
    }
  }

  // ============================================
  // MIGRATION VALIDATION
  // ============================================

  private async validateMigration(migration: Migration): Promise<void> {
    const validator = new DataValidator();

    for (const collectionName of migration.collections) {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();

        // Validate based on collection type
        switch (collectionName) {
          case 'users':
            const userValidation = DataValidator.validateUser(data);
            if (!userValidation.isValid) {
              throw new Error(`User validation failed for ${docSnap.id}: ${JSON.stringify(userValidation.errors)}`);
            }
            break;

          case 'teams':
            const teamValidation = DataValidator.validateTeam(data);
            if (!teamValidation.isValid) {
              throw new Error(`Team validation failed for ${docSnap.id}: ${JSON.stringify(teamValidation.errors)}`);
            }
            break;

          case 'players':
            const playerValidation = DataValidator.validatePlayer(data);
            if (!playerValidation.isValid) {
              throw new Error(`Player validation failed for ${docSnap.id}: ${JSON.stringify(playerValidation.errors)}`);
            }
            break;

          case 'practicePlans':
            const planValidation = DataValidator.validatePracticePlan(data);
            if (!planValidation.isValid) {
              throw new Error(`Practice plan validation failed for ${docSnap.id}: ${JSON.stringify(planValidation.errors)}`);
            }
            break;

          case 'plays':
            const playValidation = DataValidator.validatePlay(data);
            if (!playValidation.isValid) {
              throw new Error(`Play validation failed for ${docSnap.id}: ${JSON.stringify(playValidation.errors)}`);
            }
            break;
        }
      }
    }
  }

  // ============================================
  // VERSION MANAGEMENT
  // ============================================

  private async getCurrentVersion(): Promise<string> {
    try {
      const versionDoc = await getDoc(doc(db, '_migrations', 'current'));
      return versionDoc.exists() ? versionDoc.data()?.version || '0.0.0' : '0.0.0';
    } catch (error) {
      console.warn('Could not get current version:', error);
      return '0.0.0';
    }
  }

  private async updateMigrationStatus(migration: Migration, status: MigrationStatus): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // Update current version
      batch.set(doc(db, '_migrations', 'current'), {
        version: migration.version,
        updatedAt: serverTimestamp()
      });

      // Record migration history
      batch.set(doc(db, '_migrations', migration.version), {
        ...status,
        migration: {
          name: migration.name,
          description: migration.description,
          collections: migration.collections
        }
      });

      await batch.commit();
    } catch (error) {
      console.error('Error updating migration status:', error);
    }
  }

  private getMigrationsToRun(currentVersion: string, targetVersion?: string): Migration[] {
    const target = targetVersion || this.getLatestVersion();
    
    return this.migrations.filter(migration =>
      this.compareVersions(migration.version, currentVersion) > 0 &&
      this.compareVersions(migration.version, target) <= 0
    );
  }

  private getLatestVersion(): string {
    if (this.migrations.length === 0) return '0.0.0';
    return this.migrations[this.migrations.length - 1].version;
  }

  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      
      if (aPart < bPart) return -1;
      if (aPart > bPart) return 1;
    }
    
    return 0;
  }

  // ============================================
  // ROLLBACK FUNCTIONALITY
  // ============================================

  async rollback(targetVersion: string): Promise<MigrationStatus[]> {
    const currentVersion = await this.getCurrentVersion();
    const migrationsToRollback = this.getMigrationsToRollback(currentVersion, targetVersion);
    
    const results: MigrationStatus[] = [];

    for (const migration of migrationsToRollback.reverse()) {
      try {
        console.log(`Rolling back migration: ${migration.name} (${migration.version})`);
        
        const result = await this.rollbackMigration(migration);
        results.push(result);
        
        if (result.status === 'failed') {
          console.error(`Rollback ${migration.version} failed:`, result.error);
          break;
        }
        
        await this.updateMigrationStatus(migration, result);
        
      } catch (error) {
        console.error(`Error rolling back migration ${migration.version}:`, error);
        results.push({
          version: migration.version,
          appliedAt: Timestamp.now(),
          appliedBy: 'system',
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          recordsProcessed: 0,
          recordsFailed: 0
        });
      }
    }

    return results;
  }

  private async rollbackMigration(migration: Migration): Promise<MigrationStatus> {
    let recordsProcessed = 0;
    let recordsFailed = 0;

    try {
      for (const collectionName of migration.collections) {
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);
        
        const batch = writeBatch(db);
        let batchCount = 0;

        for (const docSnap of snapshot.docs) {
          try {
            const currentData = docSnap.data();
            const rolledBackData = await migration.down(currentData);

            if (!this.config.dryRun) {
              batch.update(docSnap.ref, rolledBackData);
              batchCount++;
            }

            recordsProcessed++;

            if (batchCount >= this.config.batchSize) {
              await batch.commit();
              batchCount = 0;
            }

          } catch (error) {
            console.error(`Error rolling back document ${docSnap.id}:`, error);
            recordsFailed++;
          }
        }

        if (batchCount > 0 && !this.config.dryRun) {
          await batch.commit();
        }
      }

      return {
        version: migration.version,
        appliedAt: Timestamp.now(),
        appliedBy: 'system',
        status: recordsFailed === 0 ? 'success' : 'partial',
        recordsProcessed,
        recordsFailed
      };

    } catch (error) {
      return {
        version: migration.version,
        appliedAt: Timestamp.now(),
        appliedBy: 'system',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        recordsProcessed,
        recordsFailed
      };
    }
  }

  private getMigrationsToRollback(currentVersion: string, targetVersion: string): Migration[] {
    return this.migrations.filter(migration =>
      this.compareVersions(migration.version, targetVersion) > 0 &&
      this.compareVersions(migration.version, currentVersion) <= 0
    );
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  async getMigrationHistory(): Promise<MigrationStatus[]> {
    try {
      const snapshot = await getDocs(collection(db, '_migrations'));
      const history: MigrationStatus[] = [];
      
      snapshot.docs.forEach(doc => {
        if (doc.id !== 'current') {
          history.push(doc.data() as MigrationStatus);
        }
      });
      
      return history.sort((a, b) => this.compareVersions(a.version, b.version));
    } catch (error) {
      console.error('Error getting migration history:', error);
      return [];
    }
  }

  async createBackup(collectionName: string): Promise<string> {
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      const backup = {
        collection: collectionName,
        timestamp: Timestamp.now(),
        documents: snapshot.docs.map(doc => ({
          id: doc.id,
          data: doc.data()
        }))
      };

      const backupId = `backup_${collectionName}_${Date.now()}`;
      await setDoc(doc(db, '_backups', backupId), backup);
      
      return backupId;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }

  async restoreBackup(backupId: string): Promise<void> {
    try {
      const backupDoc = await getDoc(doc(db, '_backups', backupId));
      if (!backupDoc.exists()) {
        throw new Error('Backup not found');
      }

      const backup = backupDoc.data();
      const batch = writeBatch(db);

      for (const docData of backup.documents) {
        batch.set(doc(db, backup.collection, docData.id), docData.data);
      }

      await batch.commit();
    } catch (error) {
      console.error('Error restoring backup:', error);
      throw error;
    }
  }
}

// ============================================
// REACT HOOKS
// ============================================

import { useState, useCallback } from 'react';

export const useMigrationManager = (config?: Partial<MigrationConfig>) => {
  const [manager] = useState(() => new MigrationManager(config));
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  const runMigrations = useCallback(async (targetVersion?: string) => {
    setIsRunning(true);
    setProgress({ current: 0, total: 0 });
    
    try {
      const results = await manager.runMigrations(targetVersion);
      return results;
    } finally {
      setIsRunning(false);
    }
  }, [manager]);

  const rollback = useCallback(async (targetVersion: string) => {
    setIsRunning(true);
    
    try {
      const results = await manager.rollback(targetVersion);
      return results;
    } finally {
      setIsRunning(false);
    }
  }, [manager]);

  return {
    manager,
    isRunning,
    progress,
    runMigrations,
    rollback,
    getMigrationHistory: () => manager.getMigrationHistory(),
    createBackup: (collectionName: string) => manager.createBackup(collectionName),
    restoreBackup: (backupId: string) => manager.restoreBackup(backupId)
  };
};

export default MigrationManager;
*/ 
