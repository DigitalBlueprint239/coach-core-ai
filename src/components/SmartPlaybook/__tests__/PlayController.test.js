/**
 * PlayController Tests
 * Tests all exported pure functions from PlayController.js
 */

import {
  PLAYER_POSITIONS,
  ROUTE_TYPES,
  ROUTE_COLORS,
  hasDuplicateNumber,
  hasDuplicatePosition,
  createPlayer,
  createRoute,
  addPlayer,
  removePlayer,
  selectPlayer,
  deselectAll,
  updatePlayerPosition,
  addRoute,
  removeRoute,
  undo,
  redo,
  shotgunFormation,
  fourThreeFormation,
  calculateDistance,
  findPlayerAtPosition,
} from '../PlayController';

// ============================================
// CONSTANTS
// ============================================

describe('Constants', () => {
  it('PLAYER_POSITIONS has OFFENSE and DEFENSE arrays', () => {
    expect(PLAYER_POSITIONS.OFFENSE).toContain('QB');
    expect(PLAYER_POSITIONS.OFFENSE).toContain('WR');
    expect(PLAYER_POSITIONS.DEFENSE).toContain('CB');
    expect(PLAYER_POSITIONS.DEFENSE).toContain('MLB');
  });

  it('ROUTE_TYPES includes required route names', () => {
    expect(ROUTE_TYPES).toContain('slant');
    expect(ROUTE_TYPES).toContain('go');
    expect(ROUTE_TYPES).toContain('hitch');
    expect(ROUTE_TYPES).toContain('custom');
  });
});

// ============================================
// hasDuplicateNumber
// ============================================

describe('hasDuplicateNumber', () => {
  const players = [
    { id: 'p1', number: 80 },
    { id: 'p2', number: 12 },
  ];

  it('returns true when number already exists', () => {
    expect(hasDuplicateNumber(players, 80)).toBe(true);
  });

  it('returns false when number does not exist', () => {
    expect(hasDuplicateNumber(players, 99)).toBe(false);
  });

  it('excludes specified player id from check', () => {
    // Player p1 has number 80, excluding p1 should return false
    expect(hasDuplicateNumber(players, 80, 'p1')).toBe(false);
  });
});

// ============================================
// hasDuplicatePosition
// ============================================

describe('hasDuplicatePosition', () => {
  const players = [
    { id: 'p1', position: 'WR' },
    { id: 'p2', position: 'QB' },
  ];

  it('returns true when position already exists', () => {
    expect(hasDuplicatePosition(players, 'QB')).toBe(true);
  });

  it('returns false when position does not exist', () => {
    expect(hasDuplicatePosition(players, 'TE')).toBe(false);
  });

  it('excludes specified player id from check', () => {
    expect(hasDuplicatePosition(players, 'QB', 'p2')).toBe(false);
  });
});

// ============================================
// createPlayer
// ============================================

describe('createPlayer', () => {
  it('creates a player with correct properties', () => {
    const player = createPlayer(100, 200, 'WR', 80);
    expect(player.x).toBe(100);
    expect(player.y).toBe(200);
    expect(player.position).toBe('WR');
    expect(player.number).toBe(80);
  });

  it('generates a unique id', () => {
    const p1 = createPlayer(0, 0, 'QB');
    const p2 = createPlayer(0, 0, 'QB');
    expect(p1.id).not.toBe(p2.id);
  });

  it('works without a player number', () => {
    const player = createPlayer(50, 50, 'TE');
    expect(player.position).toBe('TE');
    expect(player.id).toBeTruthy();
  });

  it('throws on non-numeric coordinates', () => {
    expect(() => createPlayer('x', 0, 'WR')).toThrow();
    expect(() => createPlayer(0, 'y', 'WR')).toThrow();
  });

  it('throws when position is missing', () => {
    expect(() => createPlayer(0, 0, '')).toThrow();
    expect(() => createPlayer(0, 0, null)).toThrow();
  });
});

// ============================================
// createRoute
// ============================================

describe('createRoute', () => {
  const points = [{ x: 0, y: 0 }, { x: 100, y: 100 }];

  it('creates a route with correct properties', () => {
    const route = createRoute('player1', points, 'slant');
    expect(route.playerId).toBe('player1');
    expect(route.points).toEqual(points);
    expect(route.type).toBe('slant');
  });

  it('defaults to custom type', () => {
    const route = createRoute('player1', points);
    expect(route.type).toBe('custom');
  });

  it('generates a unique id', () => {
    const r1 = createRoute('p1', points);
    const r2 = createRoute('p1', points);
    expect(r1.id).not.toBe(r2.id);
  });

  it('throws on missing playerId', () => {
    expect(() => createRoute('', points)).toThrow();
    expect(() => createRoute(null, points)).toThrow();
  });

  it('throws with fewer than 2 points', () => {
    expect(() => createRoute('p1', [{ x: 0, y: 0 }])).toThrow();
    expect(() => createRoute('p1', [])).toThrow();
  });

  it('throws on invalid route type', () => {
    expect(() => createRoute('p1', points, 'invalid_type')).toThrow();
  });

  it('throws on invalid point coordinates', () => {
    expect(() => createRoute('p1', [{ x: 'bad', y: 0 }, { x: 10, y: 10 }])).toThrow();
  });
});

// ============================================
// addPlayer
// ============================================

describe('addPlayer', () => {
  it('adds a player to the array', () => {
    const players = [];
    const player = createPlayer(0, 0, 'QB');
    const result = addPlayer(players, player);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(player);
  });

  it('does not mutate the original array', () => {
    const players = [createPlayer(0, 0, 'QB')];
    const player = createPlayer(10, 10, 'WR');
    addPlayer(players, player);
    expect(players).toHaveLength(1);
  });

  it('throws if player is invalid', () => {
    expect(() => addPlayer([], null)).toThrow();
    expect(() => addPlayer([], {})).toThrow();
  });
});

// ============================================
// removePlayer
// ============================================

describe('removePlayer', () => {
  it('removes a player by id', () => {
    const player = createPlayer(0, 0, 'QB');
    const players = [player];
    const result = removePlayer(players, player.id);
    expect(result).toHaveLength(0);
  });

  it('does not affect other players', () => {
    const p1 = createPlayer(0, 0, 'QB');
    const p2 = createPlayer(10, 10, 'WR');
    const result = removePlayer([p1, p2], p1.id);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(p2.id);
  });

  it('returns unchanged array if player not found', () => {
    const player = createPlayer(0, 0, 'QB');
    const result = removePlayer([player], 'non-existent-id');
    expect(result).toHaveLength(1);
  });
});

// ============================================
// selectPlayer / deselectAll
// ============================================

describe('selectPlayer', () => {
  it('marks specified player as selected', () => {
    const p1 = createPlayer(0, 0, 'QB');
    const p2 = createPlayer(10, 10, 'WR');
    const result = selectPlayer([p1, p2], p1.id);
    const selected = result.find(p => p.id === p1.id);
    expect(selected.selected).toBe(true);
  });

  it('deselects other players', () => {
    const p1 = { ...createPlayer(0, 0, 'QB'), selected: true };
    const p2 = createPlayer(10, 10, 'WR');
    const result = selectPlayer([p1, p2], p2.id);
    const notSelected = result.find(p => p.id === p1.id);
    expect(notSelected.selected).toBe(false);
  });
});

describe('deselectAll', () => {
  it('deselects all players', () => {
    const players = [
      { ...createPlayer(0, 0, 'QB'), selected: true },
      { ...createPlayer(10, 10, 'WR'), selected: true },
    ];
    const result = deselectAll(players);
    expect(result.every(p => !p.selected)).toBe(true);
  });
});

// ============================================
// updatePlayerPosition
// ============================================

describe('updatePlayerPosition', () => {
  it('updates player x and y coordinates', () => {
    const player = createPlayer(0, 0, 'QB');
    const result = updatePlayerPosition([player], player.id, 50, 75);
    const updated = result.find(p => p.id === player.id);
    expect(updated.x).toBe(50);
    expect(updated.y).toBe(75);
  });

  it('does not affect other players', () => {
    const p1 = createPlayer(0, 0, 'QB');
    const p2 = createPlayer(100, 100, 'WR');
    const result = updatePlayerPosition([p1, p2], p1.id, 50, 50);
    const unchanged = result.find(p => p.id === p2.id);
    expect(unchanged.x).toBe(100);
    expect(unchanged.y).toBe(100);
  });
});

// ============================================
// addRoute / removeRoute
// ============================================

describe('addRoute', () => {
  it('adds route to array', () => {
    const route = createRoute('p1', [{ x: 0, y: 0 }, { x: 50, y: 50 }]);
    const result = addRoute([], route);
    expect(result).toHaveLength(1);
  });

  it('does not mutate original array', () => {
    const routes = [];
    const route = createRoute('p1', [{ x: 0, y: 0 }, { x: 50, y: 50 }]);
    addRoute(routes, route);
    expect(routes).toHaveLength(0);
  });

  it('throws on invalid route', () => {
    expect(() => addRoute([], null)).toThrow();
    expect(() => addRoute([], { playerId: 'p1' })).toThrow();
  });
});

describe('removeRoute', () => {
  it('removes route by id', () => {
    const route = createRoute('p1', [{ x: 0, y: 0 }, { x: 50, y: 50 }]);
    const result = removeRoute([route], route.id);
    expect(result).toHaveLength(0);
  });

  it('returns unchanged array if route not found', () => {
    const route = createRoute('p1', [{ x: 0, y: 0 }, { x: 50, y: 50 }]);
    const result = removeRoute([route], 'non-existent');
    expect(result).toHaveLength(1);
  });
});

// ============================================
// UNDO / REDO
// ============================================

describe('undo', () => {
  it('returns previous state from undo stack', () => {
    const prevState = { players: [{ id: 'old' }] };
    const currentState = { players: [{ id: 'current' }] };
    const [newState] = undo([prevState], [], currentState);
    expect(newState).toEqual(prevState);
  });

  it('returns current state if undo stack is empty', () => {
    const currentState = { players: [] };
    const [newState] = undo([], [], currentState);
    expect(newState).toEqual(currentState);
  });

  it('pushes current state to redo stack', () => {
    const prevState = { players: [] };
    const currentState = { players: [{ id: '1' }] };
    const [, , newRedoStack] = undo([prevState], [], currentState);
    expect(newRedoStack[0]).toEqual(currentState);
  });

  it('removes top of undo stack', () => {
    const s1 = { id: 1 };
    const s2 = { id: 2 };
    const current = { id: 3 };
    const [, newUndoStack] = undo([s1, s2], [], current);
    expect(newUndoStack).toHaveLength(1);
    expect(newUndoStack[0]).toEqual(s1);
  });

  it('throws if stacks are not arrays', () => {
    expect(() => undo(null, [], {})).toThrow();
    expect(() => undo([], null, {})).toThrow();
  });
});

describe('redo', () => {
  it('returns next state from redo stack', () => {
    const nextState = { players: [{ id: 'future' }] };
    const currentState = { players: [] };
    const [newState] = redo([], [nextState], currentState);
    expect(newState).toEqual(nextState);
  });

  it('returns current state if redo stack is empty', () => {
    const currentState = { players: [] };
    const [newState] = redo([], [], currentState);
    expect(newState).toEqual(currentState);
  });

  it('pushes current state to undo stack', () => {
    const nextState = { players: [{ id: '1' }] };
    const currentState = { players: [] };
    const [, newUndoStack] = redo([], [nextState], currentState);
    expect(newUndoStack[0]).toEqual(currentState);
  });

  it('clears used redo entry from redo stack', () => {
    const s1 = { id: 1 };
    const s2 = { id: 2 };
    const current = { id: 0 };
    const [, , newRedoStack] = redo([], [s1, s2], current);
    expect(newRedoStack).toHaveLength(1);
    expect(newRedoStack[0]).toEqual(s2);
  });
});

// ============================================
// Formations
// ============================================

describe('shotgunFormation', () => {
  it('returns an array of players', () => {
    const players = shotgunFormation(300, 150);
    expect(Array.isArray(players)).toBe(true);
    expect(players.length).toBeGreaterThan(0);
  });

  it('includes QB in the formation', () => {
    const players = shotgunFormation(300, 150);
    expect(players.some(p => p.position === 'QB')).toBe(true);
  });

  it('throws on non-numeric center coordinates', () => {
    expect(() => shotgunFormation('x', 150)).toThrow();
    expect(() => shotgunFormation(300, 'y')).toThrow();
  });

  it('throws on non-positive spacing', () => {
    expect(() => shotgunFormation(300, 150, -10)).toThrow();
    expect(() => shotgunFormation(300, 150, 0)).toThrow();
  });
});

describe('fourThreeFormation', () => {
  it('returns an array of players', () => {
    const players = fourThreeFormation(300, 150);
    expect(Array.isArray(players)).toBe(true);
    expect(players.length).toBeGreaterThan(0);
  });
});

// ============================================
// Utility Functions
// ============================================

describe('calculateDistance', () => {
  it('calculates correct distance between two points', () => {
    const dist = calculateDistance({ x: 0, y: 0 }, { x: 3, y: 4 });
    expect(dist).toBe(5); // 3-4-5 triangle
  });

  it('returns 0 for same points', () => {
    expect(calculateDistance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
  });

  it('throws if points are missing', () => {
    expect(() => calculateDistance(null, { x: 0, y: 0 })).toThrow();
    expect(() => calculateDistance({ x: 0, y: 0 }, null)).toThrow();
  });

  it('throws if coordinates are non-numeric', () => {
    expect(() => calculateDistance({ x: 'a', y: 0 }, { x: 0, y: 0 })).toThrow();
  });
});

describe('findPlayerAtPosition', () => {
  it('finds a player within threshold distance', () => {
    const player = createPlayer(100, 100, 'WR');
    const found = findPlayerAtPosition([player], 105, 105, 20);
    expect(found).toBeTruthy();
    expect(found.id).toBe(player.id);
  });

  it('returns null if no player within threshold', () => {
    const player = createPlayer(100, 100, 'WR');
    const found = findPlayerAtPosition([player], 200, 200, 20);
    expect(found).toBeNull();
  });

  it('returns null for empty players array', () => {
    const found = findPlayerAtPosition([], 100, 100);
    expect(found).toBeNull();
  });

  it('throws if players is not an array', () => {
    expect(() => findPlayerAtPosition(null, 100, 100)).toThrow();
  });

  it('throws if threshold is not positive', () => {
    expect(() => findPlayerAtPosition([], 100, 100, -5)).toThrow();
  });
});
