// src/hooks/useFirestore.ts
import { useState, useEffect, useCallback } from 'react';
import {
  savePracticePlan,
  getPracticePlans,
  updatePracticePlan,
  deletePracticePlan,
  savePlay,
  getPlays,
  updatePlay as updatePlayService,
  deletePlay,
  subscribeToPracticePlans,
  subscribeToPlays,
  migrateFromLocalStorage,
  type PracticePlan,
  type Play,
} from '../services/firestore';

// Hook for managing practice plans
export const usePracticePlans = (teamId: string | undefined) => {
  const [plans, setPlans] = useState<PracticePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load plans on mount and when teamId changes
  useEffect(() => {
    if (!teamId) {
      setPlans([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Subscribe to real-time updates
    const unsubscribe = subscribeToPracticePlans(teamId, updatedPlans => {
      setPlans(updatedPlans);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [teamId]);

  const createPlan = useCallback(
    async (
      planData: Omit<
        PracticePlan,
        'id' | 'teamId' | 'createdAt' | 'updatedAt' | 'createdBy'
      >
    ) => {
      if (!teamId) throw new Error('No team selected');

      try {
        setError(null);
        await savePracticePlan(teamId, planData);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create practice plan';
        setError(errorMessage);
        throw err;
      }
    },
    [teamId]
  );

  const updatePlan = useCallback(
    async (planId: string, updates: Partial<PracticePlan>) => {
      if (!teamId) throw new Error('No team selected');

      try {
        setError(null);
        await updatePracticePlan(teamId, planId, updates);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update practice plan';
        setError(errorMessage);
        throw err;
      }
    },
    [teamId]
  );

  const removePlan = useCallback(
    async (planId: string) => {
      if (!teamId) throw new Error('No team selected');

      try {
        setError(null);
        await deletePracticePlan(teamId, planId);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete practice plan';
        setError(errorMessage);
        throw err;
      }
    },
    [teamId]
  );

  return {
    plans,
    loading,
    error,
    createPlan,
    updatePlan,
    removePlan,
  };
};

// Hook for managing plays
export const usePlaybook = (teamId: string | undefined) => {
  const [plays, setPlays] = useState<Play[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load plays on mount and when teamId changes
  useEffect(() => {
    if (!teamId) {
      setPlays([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Subscribe to real-time updates
    const unsubscribe = subscribeToPlays(teamId, updatedPlays => {
      setPlays(updatedPlays);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [teamId]);

  const createPlay = useCallback(
    async (
      playData: Omit<
        Play,
        'id' | 'teamId' | 'createdAt' | 'updatedAt' | 'createdBy'
      >
    ) => {
      if (!teamId) throw new Error('No team selected');

      try {
        setError(null);
        await savePlay(teamId, playData);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create play';
        setError(errorMessage);
        throw err;
      }
    },
    [teamId]
  );

  const updatePlayLocal = useCallback(
    async (playId: string, updates: Partial<Play>) => {
      if (!teamId) throw new Error('No team selected');

      try {
        setError(null);
        await updatePlayService(teamId, playId, updates);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update play';
        setError(errorMessage);
        throw err;
      }
    },
    [teamId]
  );

  const removePlay = useCallback(
    async (playId: string) => {
      if (!teamId) throw new Error('No team selected');
      try {
        setError(null);
        await deletePlay(teamId, playId);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete play';
        setError(errorMessage);
        throw err;
      }
    },
    [teamId]
  );

  return {
    plays,
    loading,
    error,
    createPlay,
    updatePlay: updatePlayLocal,
    removePlay,
  };
};

// Hook for data migration
export const useMigration = (teamId: string | undefined) => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [hasLocalData, setHasLocalData] = useState(false);

  // Check for existing localStorage data
  useEffect(() => {
    const plans = localStorage.getItem('practicePlans');
    const plays = localStorage.getItem('plays');
    setHasLocalData(!!(plans || plays));
  }, []);

  const migrateData = useCallback(async () => {
    if (!teamId) throw new Error('No team selected');

    setIsMigrating(true);
    try {
      await migrateFromLocalStorage(teamId);
      setHasLocalData(false);
    } catch (err) {
      throw err;
    } finally {
      setIsMigrating(false);
    }
  }, [teamId]);

  return {
    isMigrating,
    hasLocalData,
    migrateData,
  };
};
