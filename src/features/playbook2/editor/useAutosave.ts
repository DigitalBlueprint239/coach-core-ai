// Keeps an unsaved play in localStorage so closing the tab or switching views loses nothing (Review Focus 2).
// Only the play is stored: never the undo/redo history.
import { useCallback, useEffect, useRef, useState } from 'react';
import { isPlayV2, type PlayV2 } from '../playModel';

const DEBOUNCE_MS = 500;

function read(key: string): PlayV2 | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isPlayV2(parsed)) return null;
    const revive = (v: unknown) => (typeof v === 'string' ? new Date(v) : undefined);
    const p = parsed as PlayV2 & { createdAt?: unknown; updatedAt?: unknown };
    return { ...p, createdAt: revive(p.createdAt), updatedAt: revive(p.updatedAt) };
  } catch {
    return null;
  }
}

function write(key: string, play: PlayV2) {
  try {
    localStorage.setItem(key, JSON.stringify(play));
  } catch {
    // Quota or blocked storage: autosave is best effort; the play is still in the editor.
  }
}

function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage blocked (private mode): nothing to clear.
  }
}

export function useAutosave(key: string, play: PlayV2, dirty: boolean): { restorable: PlayV2 | null; discard(): void } {
  // Read once, before anything is written, so the previous session's draft can be offered back.
  const [restorable, setRestorable] = useState<PlayV2 | null>(() => read(key));
  const wasDirty = useRef(false);
  // The latest unsaved play, written at once when the view unmounts or the tab closes before the debounce fires.
  const pending = useRef<PlayV2 | null>(null);
  pending.current = dirty ? play : null;

  useEffect(() => {
    if (!dirty) {
      // A save (dirty → clean) means the draft is no longer needed.
      if (wasDirty.current) remove(key);
      wasDirty.current = false;
      return;
    }
    wasDirty.current = true;
    const timer = setTimeout(() => write(key, play), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [key, play, dirty]);

  useEffect(() => {
    const flush = () => {
      if (pending.current) write(key, pending.current);
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [key]);

  const discard = useCallback(() => {
    remove(key);
    setRestorable(null);
  }, [key]);

  return { restorable, discard };
}
