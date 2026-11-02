// The play editor: a pure reducer with multi-step undo/redo (spec §5.0). History holds play snapshots only;
// UI state (selection) never enters it, and nothing here is persisted (useAutosave stores the play alone).
import { mirrorFormation, validateFormation } from '../../../football-core';
import type { Assignment, Formation, OffenseRole, ReadStep, Slot, Yards } from '../../../football-core';
import type { PlayV2 } from '../playModel';

export const MAX_HISTORY = 100;

export type EditorState = {
  play: PlayV2;
  past: PlayV2[];
  future: PlayV2[];
  dirty: boolean;
  problems: string[];
  selectedRole?: OffenseRole;
};

export type EditorAction =
  /** dirty: true when the loaded play is an unsaved draft (restored from autosave). */
  | { type: 'load'; play: PlayV2; dirty?: boolean }
  | { type: 'movePlayer'; role: OffenseRole; at: Yards }
  | { type: 'setOnLine'; role: OffenseRole; onLine: boolean }
  | { type: 'setAssignment'; assignment: Assignment }
  | { type: 'removeAssignment'; slot: Slot }
  | { type: 'rename'; name: string }
  | { type: 'flip' }
  | { type: 'setRead'; read: ReadStep[] }
  /** Swap the formation under the play (from the Formation dropdown); assignments stay, by slot. */
  | { type: 'setFormation'; formation: Formation }
  | { type: 'select'; role?: OffenseRole }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'saved'; id: string };

/** Half-yard grid for dragging and nudging. */
export const snap = (v: number) => Math.round(v * 2) / 2 || 0;

export function initEditor(play: PlayV2): EditorState {
  return { play, past: [], future: [], dirty: false, problems: validateFormation(play.formation) };
}

function edit(s: EditorState, play: PlayV2): EditorState {
  return {
    ...s,
    play,
    past: [...s.past, s.play].slice(-MAX_HISTORY),
    future: [],
    dirty: true,
    problems: validateFormation(play.formation),
  };
}

const withPlayers = (play: PlayV2, map: (p: Formation['players'][number]) => Formation['players'][number]): PlayV2 => ({
  ...play,
  formation: { ...play.formation, players: play.formation.players.map(map) },
});

export function editorReducer(s: EditorState, a: EditorAction): EditorState {
  switch (a.type) {
    case 'load':
      return { ...initEditor(a.play), dirty: a.dirty ?? false };
    case 'movePlayer':
      return edit(
        s,
        withPlayers(s.play, p => (p.role === a.role ? { ...p, at: { x: snap(a.at.x), y: snap(a.at.y) } } : p)),
      );
    case 'setOnLine':
      return edit(s, withPlayers(s.play, p => (p.role === a.role ? { ...p, onLine: a.onLine } : p)));
    case 'setAssignment': {
      const exists = s.play.assignments.some(x => x.slot === a.assignment.slot);
      const assignments = exists
        ? s.play.assignments.map(x => (x.slot === a.assignment.slot ? a.assignment : x))
        : [...s.play.assignments, a.assignment];
      return edit(s, { ...s.play, assignments });
    }
    case 'removeAssignment':
      return edit(s, { ...s.play, assignments: s.play.assignments.filter(x => x.slot !== a.slot) });
    case 'rename':
      return edit(s, { ...s.play, name: a.name });
    case 'flip':
      return edit(s, { ...s.play, formation: mirrorFormation(s.play.formation, s.play.formation.id, s.play.formation.name) });
    case 'setRead':
      return edit(s, { ...s.play, read: a.read });
    case 'setFormation':
      return edit(s, { ...s.play, formation: structuredClone(a.formation) });
    case 'select':
      return { ...s, selectedRole: a.role };
    case 'undo': {
      const previous = s.past[s.past.length - 1];
      if (!previous) return s;
      return {
        ...s,
        play: previous,
        past: s.past.slice(0, -1),
        future: [s.play, ...s.future],
        dirty: true,
        problems: validateFormation(previous.formation),
      };
    }
    case 'redo': {
      const [next, ...rest] = s.future;
      if (!next) return s;
      return {
        ...s,
        play: next,
        past: [...s.past, s.play].slice(-MAX_HISTORY),
        future: rest,
        dirty: true,
        problems: validateFormation(next.formation),
      };
    }
    case 'saved':
      return { ...s, play: { ...s.play, id: a.id }, dirty: false };
  }
}
