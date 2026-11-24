// The v4 play editor state: a pure reducer with multi-step undo/redo. History holds play snapshots only; the
// selection is UI state and never enters history. Every edit is a pure function from football-core/playEditsV4.
import { formationOf, validateFormation, validatePlayDocV4, type PlayDocV4, type PlayerId } from '../../../football-core';

export const MAX_HISTORY = 100;

/** Where the play in the editor came from, which decides how it is saved. */
export type EditorSource =
  /** Not saved yet (new, duplicated, or converted from a v2/v3 play): saving creates a new v4 play. */
  | { kind: 'new'; convertedFrom?: { id: string; schemaVersion: 2 | 3 } }
  /** A stored v4 play opened at `revision`: saving updates it if nobody else has saved since. */
  | { kind: 'stored'; id: string; revision: number };

export type EditorStateV4 = {
  play: PlayDocV4;
  source: EditorSource;
  past: PlayDocV4[];
  future: PlayDocV4[];
  dirty: boolean;
  /** Football problems with the alignment (illegal formation). Shown, never blocking. */
  problems: string[];
  /** Structural problems that would make the play unsaveable. */
  invalid: string[];
  selected?: PlayerId;
};

export type EditorActionV4 =
  | { type: 'open'; play: PlayDocV4; source: EditorSource; dirty?: boolean }
  /** Any edit: a pure function of the current play. One action is one undo step. */
  | { type: 'edit'; apply: (play: PlayDocV4) => PlayDocV4 }
  | { type: 'select'; id?: PlayerId }
  | { type: 'undo' }
  | { type: 'redo' }
  /** `play` is the exact play object that was sent to the store. */
  | { type: 'saved'; play: PlayDocV4; id: string; revision: number };

const check = (play: PlayDocV4) => ({ problems: validateFormation(formationOf(play)), invalid: validatePlayDocV4(play) });

export function initEditorV4(play: PlayDocV4, source: EditorSource, dirty = false): EditorStateV4 {
  return { play, source, past: [], future: [], dirty, ...check(play) };
}

export function editorReducerV4(s: EditorStateV4, a: EditorActionV4): EditorStateV4 {
  switch (a.type) {
    case 'open':
      return initEditorV4(a.play, a.source, a.dirty ?? false);
    case 'edit': {
      const play = a.apply(s.play);
      if (play === s.play) return s;
      const selected = s.selected && play.players.some(p => p.id === s.selected) ? s.selected : undefined;
      return { ...s, play, past: [...s.past, s.play].slice(-MAX_HISTORY), future: [], dirty: true, selected, ...check(play) };
    }
    case 'select':
      return { ...s, selected: a.id && s.play.players.some(p => p.id === a.id) ? a.id : undefined };
    case 'undo': {
      const previous = s.past[s.past.length - 1];
      if (!previous) return s;
      return { ...s, play: previous, past: s.past.slice(0, -1), future: [s.play, ...s.future], dirty: true, ...check(previous) };
    }
    case 'redo': {
      const [next, ...rest] = s.future;
      if (!next) return s;
      return { ...s, play: next, past: [...s.past, s.play].slice(-MAX_HISTORY), future: rest, dirty: true, ...check(next) };
    }
    case 'saved': {
      const source: EditorSource = { kind: 'stored', id: a.id, revision: a.revision };
      // The stored play carries the new revision; edits made while the save was in flight stay unsaved.
      if (s.play === a.play) return { ...s, source, play: { ...s.play, revision: a.revision }, dirty: false };
      if (s.past.includes(a.play)) return { ...s, source };
      return s; // a different play was opened meanwhile
    }
  }
}
