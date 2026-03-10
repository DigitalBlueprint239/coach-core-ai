import { useEffect } from 'react';
import type { PlaybookState, Play } from '../contexts/PlaybookDataContext';

const STORAGE_KEY = 'coachcore:playbook';

interface PersistedPlaybook {
  activePlayId: string;
  plays: Play[];
}

export function loadInitialPlaybook(defaultState: PlaybookState): PlaybookState {
  if (typeof window === 'undefined') return defaultState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed: PersistedPlaybook = JSON.parse(raw);
    return {
      ...defaultState,
      activePlayId: parsed.activePlayId ?? defaultState.activePlayId,
      plays: parsed.plays ?? defaultState.plays,
      history: [],
      future: [],
    };
  } catch {
    return defaultState;
  }
}

export function usePersistPlaybook(state: PlaybookState): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const toSave: PersistedPlaybook = {
        activePlayId: state.activePlayId,
        plays: state.plays,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      // Storage full or unavailable — fail silently
    }
  }, [state.activePlayId, state.plays]);
}
