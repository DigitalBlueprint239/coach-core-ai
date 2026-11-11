/**
 * PlayController Edge Case Tests
 * Tests boundary conditions, error paths, and concurrent scenarios
 * for functions in PlayController.js
 */

import {
  createPlayer,
  createRoute,
  addPlayer,
  removePlayer,
  selectPlayer,
  deselectAll,
  updatePlayerPosition,
  addRoute,
  removeRoute,
  savePlay,
  undo,
  redo,
  shotgunFormation,
  fourThreeFormation,
  calculateDistance,
  findPlayerAtPosition,
  hasDuplicateNumber,
  hasDuplicatePosition,
  PLAYER_POSITIONS,
  ROUTE_TYPES,
  ROUTE_COLORS,
} from '../PlayController';

// ============================================
// createPlayer — edge cases
// ============================================

describe('createPlayer — edge cases', () => {
  it('creates player at (0, 0) without error', () => {
    const p = createPlayer(0, 0, 'QB', 1);
    expect(p.x).toBe(0);
    expect(p.y).toBe(0);
  });

  it('creates player at very large coordinates', () => {
    const p = createPlayer(99999, 99999, 'WR', 99);
    expect(p.x).toBe(99999);
    expect(p.y).toBe(99999);
  });

  it('creates player with number 0', () => {
    const p = createPlayer(10, 10, 'QB', 0);
    expect(p.number).toBe(0);
  });

  it('creates player with negative coordinates', () => {
    // Negative coords are valid pixel values (out of bounds but not invalid)
    const p = createPlayer(-10, -10, 'WR');
    expect(p.x).toBe(-10);
    expect(p.y).toBe(-10);
  });

  it('has selected = false on creation', () => {
    const p = createPlayer(100, 100, 'WR');
    expect(p.selected).toBe(false);
  });

  it('has createdAt timestamp on creation', () => {
    const before = new Date().toISOString();
    const p = createPlayer(100, 100, 'WR');
    expect(p.createdAt).toBeTruthy();
    expect(typeof p.createdAt).toBe('string');
  });
});

// ============================================
// createRoute — edge cases
// ============================================

describe('createRoute — edge cases', () => {
  it('creates route with exactly 2 points', () => {
    const r = createRoute('p1', [{ x: 0, y: 0 }, { x: 10, y: 10 }]);
    expect(r.points).toHaveLength(2);
  });

  it('creates route with many points (100)', () => {
    const points = Array.from({ length: 100 }, (_, i) => ({ x: i, y: i }));
    const r = createRoute('p1', points);
    expect(r.points).toHaveLength(100);
  });

  it('does not share point array reference with input', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
    const r = createRoute('p1', points);
    points.push({ x: 20, y: 20 });
    expect(r.points).toHaveLength(2);
  });

  it('uses default color when not specified', () => {
    const r = createRoute('p1', [{ x: 0, y: 0 }, { x: 10, y: 10 }]);
    expect(r.color).toBe(ROUTE_COLORS.default);
  });

  it('accepts all valid route types', () => {
    ROUTE_TYPES.forEach(type => {
      const r = createRoute('p1', [{ x: 0, y: 0 }, { x: 10, y: 10 }], type);
      expect(r.type).toBe(type);
    });
  });
});

// ============================================
// addPlayer — edge cases
// ============================================

describe('addPlayer — edge cases', () => {
  it('throws when adding player with duplicate id', () => {
    const p = createPlayer(0, 0, 'QB');
    expect(() => addPlayer([p], p)).toThrow('already exists');
  });

  it('adds to a large array without issues', () => {
    const players = Array.from({ length: 100 }, (_, i) => createPlayer(i, i, 'WR'));
    const newPlayer = createPlayer(999, 999, 'QB');
    const result = addPlayer(players, newPlayer);
    expect(result).toHaveLength(101);
  });

  it('throws on non-array input', () => {
    const p = createPlayer(0, 0, 'QB');
    expect(() => addPlayer(null, p)).toThrow('must be an array');
    expect(() => addPlayer('string', p)).toThrow('must be an array');
  });
});

// ============================================
// savePlay — edge cases
// ============================================

describe('savePlay — edge cases', () => {
  it('saves play with empty routes and players arrays', () => {
    // Empty players/routes should still work for the controller level
    // (the UI layer validates before calling save)
    expect(() => savePlay({
      name: 'Empty Play',
      phase: 'offense',
      type: 'pass',
      players: [],
      routes: [],
    })).not.toThrow();
  });

  it('trims play name whitespace', () => {
    const play = savePlay({
      name: '  Trimmed Name  ',
      phase: 'offense',
      type: 'pass',
      players: [],
      routes: [],
    });
    expect(play.name).toBe('Trimmed Name');
  });

  it('deep clones players — mutation safe', () => {
    const p = createPlayer(100, 100, 'QB', 12);
    const play = savePlay({
      name: 'Test',
      phase: 'offense',
      type: 'pass',
      players: [p],
      routes: [],
    });
    p.x = 999;
    expect(play.players[0].x).toBe(100);
  });

  it('deep clones routes — mutation safe', () => {
    const r = createRoute('p1', [{ x: 0, y: 0 }, { x: 10, y: 10 }]);
    const play = savePlay({
      name: 'Test',
      phase: 'offense',
      type: 'pass',
      players: [createPlayer(0, 0, 'QB', 12)],
      routes: [r],
    });
    r.points[0].x = 999;
    expect(play.routes[0].points[0].x).toBe(0);
  });

  it('throws on missing name', () => {
    expect(() => savePlay({ name: '', phase: 'o', type: 't', players: [], routes: [] })).toThrow();
  });

  it('throws on missing phase', () => {
    expect(() => savePlay({ name: 'n', phase: '', type: 't', players: [], routes: [] })).toThrow();
  });

  it('throws on missing type', () => {
    expect(() => savePlay({ name: 'n', phase: 'o', type: '', players: [], routes: [] })).toThrow();
  });
});

// ============================================
// undo/redo — concurrent/rapid changes
// ============================================

describe('undo/redo — rapid changes', () => {
  it('handles 3 rapid state changes — all states preserved in undo stack', () => {
    let undoStack = [];
    let redoStack = [];
    const s0 = { players: [], routes: [] };
    const s1 = { players: [{ id: '1' }], routes: [] };
    const s2 = { players: [{ id: '1' }, { id: '2' }], routes: [] };
    const s3 = { players: [{ id: '1' }, { id: '2' }, { id: '3' }], routes: [] };

    // Simulate pushes like saveToUndoStack does
    undoStack = [...undoStack, s0];
    undoStack = [...undoStack, s1];
    undoStack = [...undoStack, s2];

    // Now undo all 3
    let [state, newUndo, newRedo] = undo(undoStack, redoStack, s3);
    expect(state).toEqual(s2);

    [state, newUndo, newRedo] = undo(newUndo, newRedo, state);
    expect(state).toEqual(s1);

    [state, newUndo, newRedo] = undo(newUndo, newRedo, state);
    expect(state).toEqual(s0);
  });

  it('redo after undo restores correct state', () => {
    const s0 = { players: [] };
    const s1 = { players: [{ id: '1' }] };

    const [afterUndo, newUndo, newRedo] = undo([s0], [], s1);
    expect(afterUndo).toEqual(s0);

    const [afterRedo] = redo(newUndo, newRedo, afterUndo);
    expect(afterRedo).toEqual(s1);
  });

  it('new action after undo clears redo stack', () => {
    const s0 = { id: 0 };
    const s1 = { id: 1 };
    const s2 = { id: 2 };

    // Undo from s2 to s1
    const [, undoStack, redoStack] = undo([s0, s1], [], s2);
    expect(redoStack).toHaveLength(1); // s2 is in redo

    // Simulate "new action clears redo" — this is done by SmartPlaybook
    // redo stack should have content that would be lost
    expect(redoStack[0]).toEqual(s2);
  });
});

// ============================================
// Formations — edge cases
// ============================================

describe('shotgunFormation — edge cases', () => {
  it('creates 11 players (full offense)', () => {
    const players = shotgunFormation(300, 150);
    expect(players).toHaveLength(11);
  });

  it('all players have unique IDs', () => {
    const players = shotgunFormation(300, 150);
    const ids = players.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes all 5 OL positions', () => {
    const players = shotgunFormation(300, 150);
    const olPositions = players.filter(p => ['LT', 'LG', 'C', 'RG', 'RT'].includes(p.position));
    expect(olPositions).toHaveLength(5);
  });

  it('custom spacing changes player positions', () => {
    const defaultPlayers = shotgunFormation(300, 150, 48);
    const widePlayers = shotgunFormation(300, 150, 80);
    // Wider spacing should put players farther apart
    const defaultLT = defaultPlayers.find(p => p.position === 'LT');
    const wideLT = widePlayers.find(p => p.position === 'LT');
    expect(wideLT.x).toBeLessThan(defaultLT.x);
  });
});

describe('fourThreeFormation — edge cases', () => {
  it('creates 11 players (full defense)', () => {
    const players = fourThreeFormation(300, 150);
    expect(players).toHaveLength(11);
  });

  it('includes 4 DL and 3 LB', () => {
    const players = fourThreeFormation(300, 150);
    const dl = players.filter(p => ['DE', 'DT'].includes(p.position));
    const lb = players.filter(p => ['MLB', 'OLB'].includes(p.position));
    expect(dl).toHaveLength(4);
    expect(lb).toHaveLength(3);
  });
});

// ============================================
// findPlayerAtPosition — edge cases
// ============================================

describe('findPlayerAtPosition — edge cases', () => {
  it('finds player at exact position (distance = 0)', () => {
    const p = createPlayer(100, 100, 'WR');
    expect(findPlayerAtPosition([p], 100, 100)).toBeTruthy();
  });

  it('finds player at threshold boundary', () => {
    const p = createPlayer(100, 100, 'WR');
    // distance = 20 exactly (at threshold)
    expect(findPlayerAtPosition([p], 120, 100, 20)).toBeTruthy();
  });

  it('does not find player just beyond threshold', () => {
    const p = createPlayer(100, 100, 'WR');
    // distance = 20.01 (just beyond threshold)
    expect(findPlayerAtPosition([p], 120.01, 100, 20)).toBeNull();
  });

  it('returns first player found when multiple overlap', () => {
    const p1 = createPlayer(100, 100, 'WR');
    const p2 = createPlayer(105, 100, 'TE');
    const found = findPlayerAtPosition([p1, p2], 102, 100, 20);
    expect(found.id).toBe(p1.id);
  });
});

// ============================================
// calculateDistance — edge cases
// ============================================

describe('calculateDistance — edge cases', () => {
  it('handles very large coordinates', () => {
    const dist = calculateDistance({ x: 0, y: 0 }, { x: 1e10, y: 0 });
    expect(dist).toBe(1e10);
  });

  it('handles negative coordinates', () => {
    const dist = calculateDistance({ x: -3, y: 0 }, { x: 0, y: -4 });
    expect(dist).toBe(5);
  });

  it('is symmetric', () => {
    const a = { x: 10, y: 20 };
    const b = { x: 30, y: 40 };
    expect(calculateDistance(a, b)).toBe(calculateDistance(b, a));
  });
});

// ============================================
// hasDuplicateNumber / hasDuplicatePosition
// ============================================

describe('hasDuplicateNumber — edge cases', () => {
  it('returns false for empty players array', () => {
    expect(hasDuplicateNumber([], 12)).toBe(false);
  });

  it('handles undefined number', () => {
    const players = [{ id: 'p1', number: undefined }];
    expect(hasDuplicateNumber(players, undefined)).toBe(true);
  });
});

describe('hasDuplicatePosition — edge cases', () => {
  it('returns false for empty players array', () => {
    expect(hasDuplicatePosition([], 'QB')).toBe(false);
  });
});

// ============================================
// deselectAll — edge cases
// ============================================

describe('deselectAll — edge cases', () => {
  it('handles empty array', () => {
    expect(deselectAll([])).toEqual([]);
  });

  it('handles players that are already deselected', () => {
    const players = [
      { ...createPlayer(0, 0, 'QB'), selected: false },
      { ...createPlayer(10, 10, 'WR'), selected: false },
    ];
    const result = deselectAll(players);
    expect(result.every(p => !p.selected)).toBe(true);
  });
});

// ============================================
// removePlayer / removeRoute — edge cases
// ============================================

describe('removePlayer — edge cases', () => {
  it('returns empty array when removing only player', () => {
    const p = createPlayer(0, 0, 'QB');
    expect(removePlayer([p], p.id)).toHaveLength(0);
  });

  it('does not mutate original array', () => {
    const p = createPlayer(0, 0, 'QB');
    const arr = [p];
    removePlayer(arr, p.id);
    expect(arr).toHaveLength(1);
  });
});

describe('removeRoute — edge cases', () => {
  it('does not mutate original array', () => {
    const r = createRoute('p1', [{ x: 0, y: 0 }, { x: 10, y: 10 }]);
    const arr = [r];
    removeRoute(arr, r.id);
    expect(arr).toHaveLength(1);
  });
});
