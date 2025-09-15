export interface ConflictData {
  id: string;
  field: string;
  localValue: any;
  remoteValue: any;
  timestamp: Date;
  userId: string;
}

export interface ConflictResolution {
  id: string;
  field: string;
  resolvedValue: any;
  resolution: 'local' | 'remote' | 'merge' | 'manual';
  timestamp: Date;
  userId: string;
}

export interface ConflictResolutionStrategy {
  field: string;
  strategy: 'last-write-wins' | 'first-write-wins' | 'merge' | 'manual';
  mergeFunction?: (local: any, remote: any) => any;
}

export class ConflictResolutionService {
  private strategies: Map<string, ConflictResolutionStrategy> = new Map();

  constructor() {
    this.setupDefaultStrategies();
  }

  private setupDefaultStrategies(): void {
    // Default strategies for common fields
    this.addStrategy({
      field: 'updatedAt',
      strategy: 'last-write-wins',
    });

    this.addStrategy({
      field: 'createdAt',
      strategy: 'first-write-wins',
    });

    this.addStrategy({
      field: 'name',
      strategy: 'last-write-wins',
    });

    this.addStrategy({
      field: 'email',
      strategy: 'last-write-wins',
    });

    this.addStrategy({
      field: 'phone',
      strategy: 'last-write-wins',
    });

    this.addStrategy({
      field: 'notes',
      strategy: 'merge',
      mergeFunction: (local: string, remote: string) => {
        if (!local) return remote;
        if (!remote) return local;
        return `${local}\n---\n${remote}`;
      },
    });

    this.addStrategy({
      field: 'tags',
      strategy: 'merge',
      mergeFunction: (local: string[], remote: string[]) => {
        const merged = new Set([...(local || []), ...(remote || [])]);
        return Array.from(merged);
      },
    });

    this.addStrategy({
      field: 'preferences',
      strategy: 'merge',
      mergeFunction: (local: any, remote: any) => {
        return { ...local, ...remote };
      },
    });

    this.addStrategy({
      field: 'medicalNotes',
      strategy: 'manual', // Require manual resolution for medical data
    });

    this.addStrategy({
      field: 'emergencyContact',
      strategy: 'manual', // Require manual resolution for emergency data
    });
  }

  addStrategy(strategy: ConflictResolutionStrategy): void {
    this.strategies.set(strategy.field, strategy);
  }

  detectConflicts(localData: any, remoteData: any): ConflictData[] {
    const conflicts: ConflictData[] = [];
    const allKeys = new Set([...Object.keys(localData), ...Object.keys(remoteData)]);

    for (const key of allKeys) {
      const localValue = localData[key];
      const remoteValue = remoteData[key];

      // Skip if values are the same
      if (this.isEqual(localValue, remoteValue)) {
        continue;
      }

      // Skip if one value is undefined/null and the other is not
      if ((localValue == null) !== (remoteValue == null)) {
        continue;
      }

      // Check if values are different
      if (!this.isEqual(localValue, remoteValue)) {
        conflicts.push({
          id: `${key}_${Date.now()}`,
          field: key,
          localValue,
          remoteValue,
          timestamp: new Date(),
          userId: localData.userId || 'unknown',
        });
      }
    }

    return conflicts;
  }

  resolveConflicts(conflicts: ConflictData[]): ConflictResolution[] {
    const resolutions: ConflictResolution[] = [];

    for (const conflict of conflicts) {
      const strategy = this.strategies.get(conflict.field);
      
      if (!strategy) {
        // Default to last-write-wins
        resolutions.push({
          id: conflict.id,
          field: conflict.field,
          resolvedValue: conflict.remoteValue,
          resolution: 'remote',
          timestamp: new Date(),
          userId: conflict.userId,
        });
        continue;
      }

      let resolvedValue: any;
      let resolution: 'local' | 'remote' | 'merge' | 'manual';

      switch (strategy.strategy) {
        case 'last-write-wins':
          resolvedValue = conflict.remoteValue;
          resolution = 'remote';
          break;

        case 'first-write-wins':
          resolvedValue = conflict.localValue;
          resolution = 'local';
          break;

        case 'merge':
          if (strategy.mergeFunction) {
            resolvedValue = strategy.mergeFunction(conflict.localValue, conflict.remoteValue);
            resolution = 'merge';
          } else {
            resolvedValue = conflict.remoteValue;
            resolution = 'remote';
          }
          break;

        case 'manual':
          // Mark for manual resolution
          resolvedValue = null;
          resolution = 'manual';
          break;

        default:
          resolvedValue = conflict.remoteValue;
          resolution = 'remote';
      }

      resolutions.push({
        id: conflict.id,
        field: conflict.field,
        resolvedValue,
        resolution,
        timestamp: new Date(),
        userId: conflict.userId,
      });
    }

    return resolutions;
  }

  applyResolutions(data: any, resolutions: ConflictResolution[]): any {
    const resolvedData = { ...data };

    for (const resolution of resolutions) {
      if (resolution.resolution !== 'manual' && resolution.resolvedValue !== null) {
        resolvedData[resolution.field] = resolution.resolvedValue;
      }
    }

    return resolvedData;
  }

  getManualResolutionRequired(resolutions: ConflictResolution[]): ConflictResolution[] {
    return resolutions.filter(r => r.resolution === 'manual');
  }

  private isEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== typeof b) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, index) => this.isEqual(val, b[index]));
    }

    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      
      if (keysA.length !== keysB.length) return false;
      
      return keysA.every(key => this.isEqual(a[key], b[key]));
    }

    return false;
  }

  // Get conflict summary for UI
  getConflictSummary(conflicts: ConflictData[]): {
    total: number;
    byField: Record<string, number>;
    byStrategy: Record<string, number>;
  } {
    const byField: Record<string, number> = {};
    const byStrategy: Record<string, number> = {};

    for (const conflict of conflicts) {
      byField[conflict.field] = (byField[conflict.field] || 0) + 1;
      
      const strategy = this.strategies.get(conflict.field);
      const strategyName = strategy?.strategy || 'last-write-wins';
      byStrategy[strategyName] = (byStrategy[strategyName] || 0) + 1;
    }

    return {
      total: conflicts.length,
      byField,
      byStrategy,
    };
  }
}

export const conflictResolutionService = new ConflictResolutionService();
