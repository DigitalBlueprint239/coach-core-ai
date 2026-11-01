import { describe, expect, it } from 'vitest';
import { fullLibrary } from '../../../football-core';
import { editorReducer, initEditor, type EditorAction, type EditorState } from '../editor/editorReducer';
import { playFromConcept } from '../playModel';

const lib = fullLibrary();
const doubles = lib.formations.find(f => f.id === 'doubles')!;
const smash = lib.concepts.find(c => c.id === 'smash')!;
const start = () => initEditor(playFromConcept('t1', smash, doubles));
const run = (s: EditorState, ...actions: EditorAction[]) => actions.reduce(editorReducer, s);
const at = (s: EditorState, role: string) => s.play.formation.players.find(p => p.role === role)!.at;

describe('editorReducer', () => {
  it('starts clean and legal', () => {
    const s = start();
    expect(s).toMatchObject({ past: [], future: [], dirty: false, problems: [] });
  });

  it('move then undo restores the position and redo reapplies it', () => {
    const moved = run(start(), { type: 'movePlayer', role: 'H', at: { x: -10.2, y: -3.3 } });
    expect(at(moved, 'H')).toEqual({ x: -10, y: -3.5 });
    expect(moved.dirty).toBe(true);
    const undone = editorReducer(moved, { type: 'undo' });
    expect(at(undone, 'H')).toEqual({ x: -13.5, y: -1.6 });
    const redone = editorReducer(undone, { type: 'redo' });
    expect(at(redone, 'H')).toEqual({ x: -10, y: -3.5 });
  });

  it('a new edit clears redo', () => {
    const s = run(start(), { type: 'movePlayer', role: 'H', at: { x: -10, y: -2 } }, { type: 'undo' });
    expect(s.future).toHaveLength(1);
    const edited = editorReducer(s, { type: 'rename', name: 'Smash Left' });
    expect(edited.future).toEqual([]);
  });

  it('undo and redo with nothing to do change nothing', () => {
    const s = start();
    expect(editorReducer(s, { type: 'undo' })).toBe(s);
    expect(editorReducer(s, { type: 'redo' })).toBe(s);
  });

  it('history is capped at 100', () => {
    let s = start();
    for (let i = 0; i < 130; i++) s = editorReducer(s, { type: 'rename', name: `Play ${i}` });
    expect(s.past).toHaveLength(100);
    expect(s.past[0].name).toBe('Play 29');
  });

  it('select and saved do not push history', () => {
    const s = run(start(), { type: 'select', role: 'H' });
    expect(s.selectedRole).toBe('H');
    expect(s.past).toEqual([]);
    const edited = run(s, { type: 'rename', name: 'x' }, { type: 'saved', id: 'p1' });
    expect(edited.past).toHaveLength(1);
    expect(edited.play.id).toBe('p1');
    expect(edited.dirty).toBe(false);
  });

  it('taking a receiver off the line reports "Needs at least 7 players on the line (has 6)."', () => {
    const s = editorReducer(start(), { type: 'setOnLine', role: 'X', onLine: false });
    expect(s.problems).toEqual(['Needs at least 7 players on the line (has 6).']);
    expect(editorReducer(s, { type: 'undo' }).problems).toEqual([]);
  });

  it('flip mirrors every player', () => {
    const s = editorReducer(start(), { type: 'flip' });
    s.play.formation.players.forEach((p, i) => {
      const before = doubles.players[i].at;
      expect(p.at).toEqual({ x: before.x === 0 ? 0 : -before.x, y: before.y });
    });
    expect(s.play.formation.strength).toBe('left');
  });

  it('sets and removes assignments by slot', () => {
    let s = editorReducer(start(), { type: 'setAssignment', assignment: { slot: 'strong-1', kind: 'route', route: 'go' } });
    expect(s.play.assignments.find(a => a.slot === 'strong-1')).toEqual({ slot: 'strong-1', kind: 'route', route: 'go' });
    expect(s.play.assignments).toHaveLength(smash.assignments.length);
    s = editorReducer(s, { type: 'removeAssignment', slot: 'strong-1' });
    expect(s.play.assignments.some(a => a.slot === 'strong-1')).toBe(false);
  });

  it('editing a play loaded from a template leaves the template untouched', () => {
    const before = JSON.stringify({ doubles, smash });
    run(
      start(),
      { type: 'movePlayer', role: 'H', at: { x: 0, y: -8 } },
      { type: 'setOnLine', role: 'Z', onLine: false },
      { type: 'setAssignment', assignment: { slot: 'weak-1', kind: 'route', route: 'go' } },
      { type: 'setRead', read: [{ focus: 'FS', text: 'x' }] },
      { type: 'flip' },
      { type: 'rename', name: 'Mine' },
    );
    expect(JSON.stringify({ doubles, smash })).toBe(before);
  });

  it('load replaces the play and clears history', () => {
    const s = run(start(), { type: 'rename', name: 'x' });
    const loaded = editorReducer(s, { type: 'load', play: playFromConcept('t1', smash, doubles) });
    expect(loaded).toMatchObject({ past: [], future: [], dirty: false });
  });
});
