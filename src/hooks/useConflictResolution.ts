import { useState, useCallback } from 'react';
import { conflictResolutionService, ConflictData, ConflictResolution } from '../services/data/conflict-resolution';

export const useConflictResolution = () => {
  const [conflicts, setConflicts] = useState<ConflictData[]>([]);
  const [isResolving, setIsResolving] = useState(false);

  const detectConflicts = useCallback((localData: any, remoteData: any) => {
    const detectedConflicts = conflictResolutionService.detectConflicts(localData, remoteData);
    setConflicts(detectedConflicts);
    return detectedConflicts;
  }, []);

  const resolveConflicts = useCallback((resolutions: ConflictResolution[]) => {
    setIsResolving(true);
    try {
      const resolvedData = conflictResolutionService.applyResolutions({}, resolutions);
      setConflicts([]);
      return resolvedData;
    } finally {
      setIsResolving(false);
    }
  }, []);

  const autoResolveConflicts = useCallback((localData: any, remoteData: any) => {
    const detectedConflicts = detectConflicts(localData, remoteData);
    if (detectedConflicts.length === 0) {
      return remoteData; // No conflicts
    }

    const resolutions = conflictResolutionService.resolveConflicts(detectedConflicts);
    const manualResolutions = conflictResolutionService.getManualResolutionRequired(resolutions);
    
    if (manualResolutions.length > 0) {
      // Return conflicts for manual resolution
      return null;
    }

    // Auto-resolve all conflicts
    const resolvedData = conflictResolutionService.applyResolutions(remoteData, resolutions);
    setConflicts([]);
    return resolvedData;
  }, [detectConflicts]);

  const clearConflicts = useCallback(() => {
    setConflicts([]);
  }, []);

  const getConflictSummary = useCallback(() => {
    return conflictResolutionService.getConflictSummary(conflicts);
  }, [conflicts]);

  return {
    conflicts,
    isResolving,
    detectConflicts,
    resolveConflicts,
    autoResolveConflicts,
    clearConflicts,
    getConflictSummary,
  };
};
