// Keeps the coach's unsaved v4 play in this browser so a closed tab, a failed save or a conflict loses nothing.
// One draft per signed-in coach per team: the key includes the coach's uid, so a different account on the same
// device never sees it. Only the play and where it came from are stored, never the undo history.
import { useCallback, useEffect, useRef, useState } from 'react';
import { validatePlayDocV4, type PlayDocV4 } from '../../../football-core';
import type { EditorSource } from './editorReducerV4';

const DEBOUNCE_MS = 500;
export type DraftV4 = { play: PlayDocV4; source: EditorSource };
export const draftKey = (uid: string, teamId: string) => `pb4:draft:${uid}:${teamId}`;

function isSource(v: unknown): v is EditorSource {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as { kind?: unknown; id?: unknown; revision?: unknown };
  return s.kind === 'new' || (s.kind === 'stored' && typeof s.id === 'string' && Number.isInteger(s.revision));
}

export function readDraft(key: string): DraftV4 | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { play?: unknown; source?: unknown };
    // A damaged or out-of-date draft is ignored rather than loaded into the editor.
    if (!isSource(parsed.source) || validatePlayDocV4(parsed.play).length) return null;
    return { play: parsed.play as PlayDocV4, source: parsed.source };
  } catch {
    return null;
  }
}

function write(key: string, draft: DraftV4) {
  try {
    localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // Quota or blocked storage: the draft is best effort; the play is still in the editor.
  }
}

function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage blocked: nothing to clear.
  }
}

export type DraftControls = {
  /** A draft left by an earlier session, offered back to the coach. */
  restorable: DraftV4 | null;
  /** Forget the offered draft and its stored copy. */
  discard(): void;
  /** Remove the stored draft after a successful save. */
  clear(): void;
  /** Keep a play the coach is leaving with unsaved changes and offer it back right away. */
  offer(draft: DraftV4): void;
};

export function useDraftV4(key: string, current: DraftV4, dirty: boolean): DraftControls {
  const [restorable, setRestorable] = useState<DraftV4 | null>(() => readDraft(key));
  const pending = useRef<DraftV4 | null>(null);
  pending.current = dirty ? current : null;

  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => write(key, current), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [key, current, dirty]);

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
  const clear = useCallback(() => remove(key), [key]);
  const offer = useCallback((draft: DraftV4) => {
    write(key, draft);
    setRestorable(draft);
  }, [key]);

  return { restorable, discard, clear, offer };
}
