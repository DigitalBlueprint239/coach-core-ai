import React, { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react';
import { useHistory } from '../hooks/useHistory';
import { EnginePlay, EnginePlayer, FootballRouteId } from '../types/playbook';
import { FIELD_WIDTH_YARDS } from '../config/fieldConfig';
import { mirrorPlay } from '../utils/mirrorPlay';

// ---------------------------------------------------------------------------
// State Shape
// ---------------------------------------------------------------------------

export interface PlaybookState {
  plays: EnginePlay[];
  currentPlayId: string | null;
}

const INITIAL_STATE: PlaybookState = {
  plays: [],
  currentPlayId: null,
};

// ---------------------------------------------------------------------------
// Context Value
// ---------------------------------------------------------------------------

export interface PlaybookContextValue {
  /** All plays in the playbook */
  plays: EnginePlay[];
  /** Currently selected play (or null) */
  currentPlay: EnginePlay | null;
  /** Select a play by ID */
  selectPlay: (playId: string | null) => void;
  /** Add a new play */
  addPlay: (play: EnginePlay) => void;
  /** Update an existing play */
  updatePlay: (playId: string, updates: Partial<EnginePlay>) => void;
  /** Remove a play */
  removePlay: (playId: string) => void;
  /** Assign a football route to a player in the current play */
  assignRoute: (playerId: string, routeId: FootballRouteId) => void;
  /** Clear route assignment from a player */
  clearRoute: (playerId: string) => void;
  /** Flip/mirror the current play horizontally */
  flipCurrentPlay: () => void;
  /** Import plays (e.g., from localStorage or Firestore) */
  importPlays: (plays: EnginePlay[]) => void;
  /** Undo / Redo */
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const PlaybookContext = createContext<PlaybookContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const PlaybookProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, setState, undo, redo, canUndo, canRedo } = useHistory<PlaybookState>(INITIAL_STATE);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('coachcore_engine_plays');
      if (saved) {
        const plays: EnginePlay[] = JSON.parse(saved);
        setState({ plays, currentPlayId: null });
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('coachcore_engine_plays', JSON.stringify(state.plays));
    } catch {
      // ignore
    }
  }, [state.plays]);

  const currentPlay = useMemo(
    () => state.plays.find((p) => p.id === state.currentPlayId) ?? null,
    [state.plays, state.currentPlayId],
  );

  const selectPlay = useCallback(
    (playId: string | null) => {
      setState((prev) => ({ ...prev, currentPlayId: playId }), { commit: false });
    },
    [setState],
  );

  const addPlay = useCallback(
    (play: EnginePlay) => {
      setState((prev) => ({
        ...prev,
        plays: [...prev.plays, play],
        currentPlayId: play.id,
      }));
    },
    [setState],
  );

  const updatePlay = useCallback(
    (playId: string, updates: Partial<EnginePlay>) => {
      setState((prev) => ({
        ...prev,
        plays: prev.plays.map((p) => (p.id === playId ? { ...p, ...updates } : p)),
      }));
    },
    [setState],
  );

  const removePlay = useCallback(
    (playId: string) => {
      setState((prev) => ({
        ...prev,
        plays: prev.plays.filter((p) => p.id !== playId),
        currentPlayId: prev.currentPlayId === playId ? null : prev.currentPlayId,
      }));
    },
    [setState],
  );

  const assignRoute = useCallback(
    (playerId: string, routeId: FootballRouteId) => {
      if (!state.currentPlayId) return;
      setState((prev) => ({
        ...prev,
        plays: prev.plays.map((play) =>
          play.id === prev.currentPlayId
            ? {
                ...play,
                players: play.players.map((pl) =>
                  pl.id === playerId ? { ...pl, assignedRoute: routeId } : pl,
                ),
              }
            : play,
        ),
      }));
    },
    [state.currentPlayId, setState],
  );

  const clearRoute = useCallback(
    (playerId: string) => {
      if (!state.currentPlayId) return;
      setState((prev) => ({
        ...prev,
        plays: prev.plays.map((play) =>
          play.id === prev.currentPlayId
            ? {
                ...play,
                players: play.players.map((pl) =>
                  pl.id === playerId ? { ...pl, assignedRoute: undefined, routeWaypoints: undefined } : pl,
                ),
              }
            : play,
        ),
      }));
    },
    [state.currentPlayId, setState],
  );

  const flipCurrentPlay = useCallback(() => {
    if (!currentPlay) return;
    const flipped = mirrorPlay(currentPlay, FIELD_WIDTH_YARDS);
    setState((prev) => ({
      ...prev,
      plays: prev.plays.map((p) => (p.id === currentPlay.id ? flipped : p)),
    }));
  }, [currentPlay, setState]);

  const importPlays = useCallback(
    (plays: EnginePlay[]) => {
      setState((prev) => ({ ...prev, plays }));
    },
    [setState],
  );

  const value = useMemo<PlaybookContextValue>(
    () => ({
      plays: state.plays,
      currentPlay,
      selectPlay,
      addPlay,
      updatePlay,
      removePlay,
      assignRoute,
      clearRoute,
      flipCurrentPlay,
      importPlays,
      undo,
      redo,
      canUndo,
      canRedo,
    }),
    [
      state.plays,
      currentPlay,
      selectPlay,
      addPlay,
      updatePlay,
      removePlay,
      assignRoute,
      clearRoute,
      flipCurrentPlay,
      importPlays,
      undo,
      redo,
      canUndo,
      canRedo,
    ],
  );

  return <PlaybookContext.Provider value={value}>{children}</PlaybookContext.Provider>;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePlaybookContext(): PlaybookContextValue {
  const ctx = useContext(PlaybookContext);
  if (!ctx) {
    throw new Error('usePlaybookContext must be used within a PlaybookProvider');
  }
  return ctx;
}
