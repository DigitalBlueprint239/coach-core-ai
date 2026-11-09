import { describe, expect, it } from 'vitest';
import { projectPlays } from '../../src/model/adapter';
import { canonicalJson, createWorkspace, fingerprint, isDirty, movePlayer, revert } from '../../src/model/workspace';
import { initialViewState, viewReducer, type ViewEvent } from '../../src/view/viewMachine';
import { MODERN_DEFENSE, MODERN_OFFENSE } from '../../src/fixtures/plays';
import type { CanonicalScene } from '../../src/model/types';

const roundTrip: ViewEvent[] = [
  { type: 'REQUEST_3D', canRender3d: true, geometryAvailable: true },
  { type: 'SCENE_READY' }, { type: 'HANDOFF_DONE' }, { type: 'LIFT_DONE' },
  { type: 'SET_PRESET', preset: 'sideline' }, { type: 'SELECT', uid: 'offense/off-QB' },
  { type: 'REQUEST_2D' }, { type: 'LOWER_DONE' }, { type: 'HANDOFF_DONE' },
];

describe('view switching never touches play data', () => {
  it('keeps the play identical across 12 consecutive 2D→3D→2D round trips', () => {
    const ws = createWorkspace([MODERN_OFFENSE, MODERN_DEFENSE]);
    const before = canonicalJson(ws.draft);
    const draftRef = ws.draft;
    let view = initialViewState;
    let writes = 0;
    const persist = () => { writes++; };
    for (let i = 0; i < 12; i++) {
      for (const e of roundTrip) view = viewReducer(view, e);
      // The renderer's only read of the play: project it.
      const scene = projectPlays(ws.draft) as CanonicalScene;
      expect(scene.players).toHaveLength(22);
    }
    expect(view.phase).toBe('2d');
    expect(view.roundTrips).toBe(12);
    expect(ws.draft).toBe(draftRef);
    expect(canonicalJson(ws.draft)).toBe(before);
    expect(isDirty(ws)).toBe(false);
    expect(writes).toBe(0);
    expect(persist).toBeTypeOf('function');
  });

  it('exposes the stored play and scene as deeply frozen', () => {
    const ws = createWorkspace([MODERN_OFFENSE]);
    expect(Object.isFrozen(ws.draft[0].play.players[0])).toBe(true);
    expect(() => { (ws.draft[0].play.players[0] as { x: number }).x = 1; }).toThrow(TypeError);
    const scene = projectPlays(ws.draft) as CanonicalScene;
    expect(Object.isFrozen(scene.players[0])).toBe(true);
    expect(() => { (scene.routes[0].points as unknown as unknown[]).push({}); }).toThrow(TypeError);
  });

  it('does not mutate the source fixture when building a workspace', () => {
    const before = canonicalJson(MODERN_OFFENSE);
    createWorkspace([MODERN_OFFENSE]);
    expect(canonicalJson(MODERN_OFFENSE)).toBe(before);
  });
});

describe('explicit 2D edits', () => {
  it('produce a new draft, preserve unrelated keys and route storage keys, and can be reverted', () => {
    const ws = createWorkspace([MODERN_OFFENSE]);
    const moved = movePlayer(ws, 'offense', 'off-RB', { x: 250, y: 250 });
    expect(isDirty(moved)).toBe(true);
    expect(fingerprint(moved.draft)).not.toBe(fingerprint(ws.draft));
    const rb = moved.draft[0].play.players.find(p => p.id === 'off-RB')!;
    expect(rb).toMatchObject({ x: 250, y: 250, position: 'RB', createdAt: '2026-10-22T00:00:00.000Z', selected: false });
    const swing = moved.draft[0].play.routes.find(r => r.id === 'r-rb-swing')!;
    expect(swing.points).toBeUndefined();
    expect(swing.path![0]).toEqual({ x: 250, y: 250 });
    // Baseline is untouched; revert returns the identical object.
    expect(ws.draft[0].play.players.find(p => p.id === 'off-RB')).toMatchObject({ x: 260, y: 245 });
    expect(revert(moved).draft).toBe(ws.baseline);
  });

  it('is a no-op (same object) when the position does not change', () => {
    const ws = createWorkspace([MODERN_OFFENSE]);
    expect(movePlayer(ws, 'offense', 'off-QB', { x: 300, y: 240 })).toBe(ws);
  });
});
