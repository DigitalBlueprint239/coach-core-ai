/**
 * Tests for PlayController – Core utilities for managing football plays
 */
import {
  PLAYER_POSITIONS,
  ROUTE_TYPES,
  ROUTE_COLORS,
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
} from './PlayController';

// ── Constants ──────────────────────────────────────────

describe('Constants', () => {
  test('PLAYER_POSITIONS contains offense and defense', () => {
    expect(PLAYER_POSITIONS.OFFENSE).toContain('QB');
    expect(PLAYER_POSITIONS.OFFENSE).toContain('WR');
    expect(PLAYER_POSITIONS.OFFENSE).toContain('C');
    expect(PLAYER_POSITIONS.DEFENSE).toContain('MLB');
    expect(PLAYER_POSITIONS.DEFENSE).toContain('CB');
    expect(PLAYER_POSITIONS.OFFENSE.length).toBe(10);
    expect(PLAYER_POSITIONS.DEFENSE.length).toBe(10);
  });

  test('ROUTE_TYPES has 8 types', () => {
    expect(ROUTE_TYPES).toHaveLength(8);
    expect(ROUTE_TYPES).toContain('custom');
    expect(ROUTE_TYPES).toContain('slant');
    expect(ROUTE_TYPES).toContain('go');
  });

  test('ROUTE_COLORS has default color', () => {
    expect(ROUTE_COLORS.default).toBe('#ef4444');
  });
});

// ── createPlayer ───────────────────────────────────────

describe('createPlayer', () => {
  test('creates a valid player', () => {
    const player = createPlayer(100, 200, 'QB', 12);
    expect(player.x).toBe(100);
    expect(player.y).toBe(200);
    expect(player.position).toBe('QB');
    expect(player.number).toBe(12);
    expect(player.selected).toBe(false);
    expect(player.id).toBeDefined();
    expect(player.createdAt).toBeDefined();
  });

  test('throws on non-numeric coordinates', () => {
    expect(() => createPlayer('a', 200, 'QB')).toThrow('coordinates must be numbers');
  });

  test('throws on missing position', () => {
    expect(() => createPlayer(100, 200, '')).toThrow('position is required');
  });

  test('throws on negative player number', () => {
    expect(() => createPlayer(100, 200, 'QB', -1)).toThrow('non-negative number');
  });

  test('warns on unknown position but does not throw', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const player = createPlayer(100, 200, 'XYZ', 1);
    expect(player.position).toBe('XYZ');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown position'));
    warnSpy.mockRestore();
  });
});

// ── createRoute ────────────────────────────────────────

describe('createRoute', () => {
  test('creates a valid route', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 20 }];
    const route = createRoute('player-1', points, 'slant');
    expect(route.playerId).toBe('player-1');
    expect(route.points).toHaveLength(2);
    expect(route.type).toBe('slant');
    expect(route.color).toBe(ROUTE_COLORS.default);
    expect(route.id).toBeDefined();
  });

  test('throws on missing player ID', () => {
    expect(() => createRoute('', [{ x: 0, y: 0 }, { x: 1, y: 1 }])).toThrow();
  });

  test('throws on fewer than 2 points', () => {
    expect(() => createRoute('p1', [{ x: 0, y: 0 }])).toThrow('at least 2 points');
  });

  test('throws on invalid route type', () => {
    expect(() => createRoute('p1', [{ x: 0, y: 0 }, { x: 1, y: 1 }], 'invalid')).toThrow('Invalid route type');
  });

  test('creates a copy of points to prevent mutation', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 20 }];
    const route = createRoute('p1', points);
    points[0].x = 999;
    expect(route.points[0].x).toBe(0);
  });
});

// ── addPlayer / removePlayer ───────────────────────────

describe('addPlayer / removePlayer', () => {
  test('addPlayer appends to array immutably', () => {
    const players = [];
    const player = createPlayer(10, 20, 'QB', 1);
    const result = addPlayer(players, player);
    expect(result).toHaveLength(1);
    expect(players).toHaveLength(0); // original unchanged
  });

  test('addPlayer throws on duplicate ID', () => {
    const player = createPlayer(10, 20, 'QB', 1);
    const players = [player];
    expect(() => addPlayer(players, player)).toThrow('already exists');
  });

  test('removePlayer removes by ID', () => {
    const player = createPlayer(10, 20, 'QB', 1);
    const players = [player];
    const result = removePlayer(players, player.id);
    expect(result).toHaveLength(0);
    expect(players).toHaveLength(1); // original unchanged
  });

  test('removePlayer warns when ID not found', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const result = removePlayer([], 'nonexistent');
    expect(result).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

// ── selectPlayer / deselectAll ─────────────────────────

describe('selectPlayer / deselectAll', () => {
  test('selectPlayer selects only the target', () => {
    const p1 = createPlayer(0, 0, 'QB', 1);
    const p2 = createPlayer(10, 10, 'WR', 2);
    const players = [p1, p2];
    const result = selectPlayer(players, p1.id);
    expect(result.find(p => p.id === p1.id).selected).toBe(true);
    expect(result.find(p => p.id === p2.id).selected).toBe(false);
  });

  test('deselectAll clears all selections', () => {
    const p1 = createPlayer(0, 0, 'QB', 1);
    p1.selected = true;
    const result = deselectAll([p1]);
    expect(result[0].selected).toBe(false);
  });
});

// ── updatePlayerPosition ───────────────────────────────

describe('updatePlayerPosition', () => {
  test('updates position immutably', () => {
    const player = createPlayer(10, 20, 'QB', 1);
    const players = [player];
    const result = updatePlayerPosition(players, player.id, 50, 60);
    expect(result[0].x).toBe(50);
    expect(result[0].y).toBe(60);
    expect(players[0].x).toBe(10); // original unchanged
  });

  test('throws on invalid coordinates', () => {
    const player = createPlayer(10, 20, 'QB', 1);
    expect(() => updatePlayerPosition([player], player.id, 'a', 'b')).toThrow();
  });
});

// ── addRoute / removeRoute ─────────────────────────────

describe('addRoute / removeRoute', () => {
  test('addRoute appends route immutably', () => {
    const route = createRoute('p1', [{ x: 0, y: 0 }, { x: 10, y: 10 }]);
    const result = addRoute([], route);
    expect(result).toHaveLength(1);
  });

  test('removeRoute removes by ID', () => {
    const route = createRoute('p1', [{ x: 0, y: 0 }, { x: 10, y: 10 }]);
    const routes = [route];
    const result = removeRoute(routes, route.id);
    expect(result).toHaveLength(0);
  });
});

// ── savePlay ───────────────────────────────────────────

describe('savePlay', () => {
  test('saves a valid play with deep cloning', () => {
    const player = createPlayer(10, 20, 'QB', 1);
    const route = createRoute(player.id, [{ x: 0, y: 0 }, { x: 10, y: 10 }]);
    const play = savePlay({
      name: 'Hail Mary',
      phase: 'offense',
      type: 'passing',
      players: [player],
      routes: [route],
    });
    expect(play.name).toBe('Hail Mary');
    expect(play.id).toBeDefined();
    expect(play.players).toHaveLength(1);
    expect(play.routes).toHaveLength(1);
    // Verify deep clone (modify original, saved should be unchanged)
    player.x = 999;
    expect(play.players[0].x).toBe(10);
  });

  test('throws on missing name', () => {
    expect(() => savePlay({ name: '', phase: 'o', type: 't', players: [], routes: [] })).toThrow();
  });
});

// ── undo / redo ────────────────────────────────────────

describe('undo / redo', () => {
  test('undo returns previous state', () => {
    const state1 = { players: ['a'] };
    const state2 = { players: ['a', 'b'] };
    const [result, newUndo, newRedo] = undo([state1], [], state2);
    expect(result).toEqual(state1);
    expect(newUndo).toHaveLength(0);
    expect(newRedo).toHaveLength(1);
    expect(newRedo[0]).toEqual(state2);
  });

  test('undo returns current state when stack is empty', () => {
    const state = { players: ['a'] };
    const [result] = undo([], [], state);
    expect(result).toEqual(state);
  });

  test('redo returns next state', () => {
    const state1 = { players: ['a'] };
    const state2 = { players: ['a', 'b'] };
    const [result, newUndo, newRedo] = redo([], [state2], state1);
    expect(result).toEqual(state2);
    expect(newUndo).toHaveLength(1);
    expect(newRedo).toHaveLength(0);
  });

  test('redo returns current state when stack is empty', () => {
    const state = { players: ['a'] };
    const [result] = redo([], [], state);
    expect(result).toEqual(state);
  });

  test('undo then redo restores original state', () => {
    const s1 = { v: 1 };
    const s2 = { v: 2 };
    const [afterUndo, uStack, rStack] = undo([s1], [], s2);
    expect(afterUndo).toEqual(s1);
    const [afterRedo] = redo(uStack, rStack, afterUndo);
    expect(afterRedo).toEqual(s2);
  });
});

// ── Formations ─────────────────────────────────────────

describe('Formations', () => {
  test('shotgunFormation creates 11 players', () => {
    const players = shotgunFormation(400, 250);
    expect(players).toHaveLength(11);
    const positions = players.map(p => p.position);
    expect(positions).toContain('QB');
    expect(positions).toContain('C');
    expect(positions).toContain('RB');
    expect(positions).toContain('WR');
  });

  test('fourThreeFormation creates 11 players', () => {
    const players = fourThreeFormation(400, 250);
    expect(players).toHaveLength(11);
    const positions = players.map(p => p.position);
    expect(positions).toContain('DE');
    expect(positions).toContain('DT');
    expect(positions).toContain('MLB');
    expect(positions).toContain('CB');
    expect(positions).toContain('FS');
    expect(positions).toContain('SS');
  });

  test('formations throw on non-numeric coordinates', () => {
    expect(() => shotgunFormation('a', 200)).toThrow();
    expect(() => fourThreeFormation('a', 200)).toThrow();
  });

  test('formations throw on invalid spacing', () => {
    expect(() => shotgunFormation(400, 250, -10)).toThrow();
    expect(() => fourThreeFormation(400, 250, 0)).toThrow();
  });

  test('all formation players have unique IDs', () => {
    const players = shotgunFormation(400, 250);
    const ids = players.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── Utility functions ──────────────────────────────────

describe('calculateDistance', () => {
  test('calculates distance correctly', () => {
    expect(calculateDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(calculateDistance({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(0);
  });

  test('throws on invalid points', () => {
    expect(() => calculateDistance(null, { x: 1, y: 1 })).toThrow();
    expect(() => calculateDistance({ x: 'a', y: 0 }, { x: 0, y: 0 })).toThrow();
  });
});

describe('findPlayerAtPosition', () => {
  test('finds player within threshold', () => {
    const player = createPlayer(100, 100, 'QB', 1);
    const found = findPlayerAtPosition([player], 105, 105, 20);
    expect(found).not.toBeNull();
    expect(found.id).toBe(player.id);
  });

  test('returns null when no player within threshold', () => {
    const player = createPlayer(100, 100, 'QB', 1);
    const found = findPlayerAtPosition([player], 200, 200, 20);
    expect(found).toBeNull();
  });

  test('throws on invalid inputs', () => {
    expect(() => findPlayerAtPosition('not array', 0, 0)).toThrow();
    expect(() => findPlayerAtPosition([], 'a', 0)).toThrow();
    expect(() => findPlayerAtPosition([], 0, 0, -1)).toThrow();
  });
});

describe('hasDuplicateNumber / hasDuplicatePosition', () => {
  test('detects duplicate numbers', () => {
    const p1 = createPlayer(0, 0, 'QB', 12);
    const p2 = createPlayer(10, 10, 'WR', 80);
    expect(hasDuplicateNumber([p1, p2], 12)).toBe(true);
    expect(hasDuplicateNumber([p1, p2], 99)).toBe(false);
  });

  test('excludes specified player from check', () => {
    const p1 = createPlayer(0, 0, 'QB', 12);
    expect(hasDuplicateNumber([p1], 12, p1.id)).toBe(false);
  });

  test('detects duplicate positions', () => {
    const p1 = createPlayer(0, 0, 'QB', 12);
    const p2 = createPlayer(10, 10, 'WR', 80);
    expect(hasDuplicatePosition([p1, p2], 'QB')).toBe(true);
    expect(hasDuplicatePosition([p1, p2], 'RB')).toBe(false);
  });
});
