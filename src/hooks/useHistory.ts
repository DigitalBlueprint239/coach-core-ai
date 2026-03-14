import { useState, useCallback, useRef } from 'react';

export interface UseHistoryOptions {
  /** Maximum number of history entries to keep. Default: 50 */
  maxHistory?: number;
}

export interface UseHistoryReturn<T> {
  state: T;
  setState: (updater: T | ((prev: T) => T), options?: { commit?: boolean }) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  reset: (newState: T) => void;
}

/**
 * Generic undo/redo hook. Every call to setState pushes to the undo stack
 * unless { commit: false } is passed (useful for high-frequency drag updates).
 */
export function useHistory<T>(initialState: T, options?: UseHistoryOptions): UseHistoryReturn<T> {
  const maxHistory = options?.maxHistory ?? 50;

  const [state, setStateInternal] = useState<T>(initialState);
  const undoStackRef = useRef<T[]>([]);
  const redoStackRef = useRef<T[]>([]);
  const [, forceRender] = useState(0);

  const setState = useCallback(
    (updater: T | ((prev: T) => T), opts?: { commit?: boolean }) => {
      const shouldCommit = opts?.commit !== false;

      setStateInternal((prev) => {
        const next = typeof updater === 'function' ? (updater as (prev: T) => T)(prev) : updater;

        if (shouldCommit) {
          undoStackRef.current = [...undoStackRef.current.slice(-(maxHistory - 1)), prev];
          redoStackRef.current = [];
          forceRender((n) => n + 1);
        }

        return next;
      });
    },
    [maxHistory],
  );

  const undo = useCallback(() => {
    setStateInternal((prev) => {
      const stack = undoStackRef.current;
      if (stack.length === 0) return prev;

      const last = stack[stack.length - 1];
      undoStackRef.current = stack.slice(0, -1);
      redoStackRef.current = [...redoStackRef.current, prev];
      forceRender((n) => n + 1);
      return last;
    });
  }, []);

  const redo = useCallback(() => {
    setStateInternal((prev) => {
      const stack = redoStackRef.current;
      if (stack.length === 0) return prev;

      const last = stack[stack.length - 1];
      redoStackRef.current = stack.slice(0, -1);
      undoStackRef.current = [...undoStackRef.current, prev];
      forceRender((n) => n + 1);
      return last;
    });
  }, []);

  const reset = useCallback((newState: T) => {
    setStateInternal(newState);
    undoStackRef.current = [];
    redoStackRef.current = [];
    forceRender((n) => n + 1);
  }, []);

  return {
    state,
    setState,
    undo,
    redo,
    canUndo: undoStackRef.current.length > 0,
    canRedo: redoStackRef.current.length > 0,
    reset,
  };
}
