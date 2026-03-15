import { checkTiming, suggestDrop, QBDrop } from '../timingEngine';
import { PX_PER_YARD_Y } from '../spacingEngine';
import { Play, Player, Route } from '../firestore';

// ---- Helpers ----

function makePlay(overrides: Partial<Play> = {}): Play {
  return {
    teamId: 'team1',
    name: 'Test Play',
    formation: 'Shotgun',
    description: '',
    routes: [],
    players: [],
    tags: [],
    difficulty: 'intermediate',
    sport: 'football',
    createdBy: 'coach1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makePlayer(overrides: Partial<Player> & Pick<Player, 'id' | 'position'>): Player {
  return {
    number: 1,
    x: 300,
    y: 150,
    ...overrides,
  };
}

function makeRoute(overrides: Partial<Route> & Pick<Route, 'id' | 'playerId'>): Route {
  return {
    path: [],
    type: 'pass',
    timing: 1,
    ...overrides,
  };
}

/**
 * Create a pass route that goes depthYards downfield from the player's
 * starting Y position. We use PX_PER_YARD_Y to convert yards to pixels.
 */
function makePassRouteWithDepth(
  id: string,
  playerId: string,
  playerY: number,
  depthYards: number,
): Route {
  const endY = playerY - depthYards * PX_PER_YARD_Y; // going "up" the field
  return makeRoute({
    id,
    playerId,
    type: 'pass',
    path: [
      { x: 300, y: playerY - 1 }, // just off the start
      { x: 300, y: endY },
    ],
  });
}

// ---- suggestDrop ----

describe('suggestDrop', () => {
  it('should suggest 3-step for shallow routes (0-7 yards)', () => {
    expect(suggestDrop(0)).toBe('3-step');
    expect(suggestDrop(5)).toBe('3-step');
    expect(suggestDrop(7)).toBe('3-step');
  });

  it('should suggest 5-step for medium routes (8-15 yards)', () => {
    expect(suggestDrop(8)).toBe('5-step');
    expect(suggestDrop(12)).toBe('5-step');
    expect(suggestDrop(15)).toBe('5-step');
  });

  it('should suggest 7-step for deep routes (16+ yards)', () => {
    expect(suggestDrop(16)).toBe('7-step');
    expect(suggestDrop(25)).toBe('7-step');
    expect(suggestDrop(30)).toBe('7-step');
  });
});

// ---- checkTiming: 3-step drop ----

describe('checkTiming - 3-step drop', () => {
  it('should not flag a route within the 3-step window (0-7 yards)', () => {
    const playerY = 150;
    const play = makePlay({
      players: [makePlayer({ id: 'wr1', position: 'WR', y: playerY })],
      routes: [makePassRouteWithDepth('r1', 'wr1', playerY, 5)],
    });
    const violations = checkTiming(play, '3-step');
    expect(violations.length).toBe(0);
  });

  it('should flag a route too deep for 3-step drop', () => {
    const playerY = 200;
    const play = makePlay({
      players: [makePlayer({ id: 'wr1', position: 'WR', y: playerY })],
      routes: [makePassRouteWithDepth('r1', 'wr1', playerY, 12)],
    });
    const violations = checkTiming(play, '3-step');
    expect(violations.length).toBe(1);
    expect(violations[0].type).toBe('route_too_deep');
    expect(violations[0].suggestedDrop).toBe('5-step');
  });
});

// ---- checkTiming: 5-step drop ----

describe('checkTiming - 5-step drop', () => {
  it('should not flag a route within the 5-step window (8-15 yards)', () => {
    const playerY = 200;
    const play = makePlay({
      players: [makePlayer({ id: 'wr1', position: 'WR', y: playerY })],
      routes: [makePassRouteWithDepth('r1', 'wr1', playerY, 10)],
    });
    const violations = checkTiming(play, '5-step');
    expect(violations.length).toBe(0);
  });

  it('should flag a route too shallow for 5-step drop', () => {
    const playerY = 150;
    const play = makePlay({
      players: [makePlayer({ id: 'wr1', position: 'WR', y: playerY })],
      routes: [makePassRouteWithDepth('r1', 'wr1', playerY, 3)],
    });
    const violations = checkTiming(play, '5-step');
    expect(violations.length).toBe(1);
    expect(violations[0].type).toBe('route_too_shallow');
    expect(violations[0].suggestedDrop).toBe('3-step');
  });

  it('should flag a route too deep for 5-step drop', () => {
    const playerY = 250;
    const play = makePlay({
      players: [makePlayer({ id: 'wr1', position: 'WR', y: playerY })],
      routes: [makePassRouteWithDepth('r1', 'wr1', playerY, 20)],
    });
    const violations = checkTiming(play, '5-step');
    expect(violations.length).toBe(1);
    expect(violations[0].type).toBe('route_too_deep');
    expect(violations[0].suggestedDrop).toBe('7-step');
  });
});

// ---- checkTiming: 7-step drop ----

describe('checkTiming - 7-step drop', () => {
  it('should not flag a route within the 7-step window (15-30 yards)', () => {
    const playerY = 250;
    const play = makePlay({
      players: [makePlayer({ id: 'wr1', position: 'WR', y: playerY })],
      routes: [makePassRouteWithDepth('r1', 'wr1', playerY, 20)],
    });
    const violations = checkTiming(play, '7-step');
    expect(violations.length).toBe(0);
  });

  it('should flag a route too shallow for 7-step drop', () => {
    const playerY = 150;
    const play = makePlay({
      players: [makePlayer({ id: 'wr1', position: 'WR', y: playerY })],
      routes: [makePassRouteWithDepth('r1', 'wr1', playerY, 5)],
    });
    const violations = checkTiming(play, '7-step');
    expect(violations.length).toBe(1);
    expect(violations[0].type).toBe('route_too_shallow');
    expect(violations[0].suggestedDrop).toBe('3-step');
  });
});

// ---- checkTiming: play-action ----

describe('checkTiming - play-action', () => {
  it('should not flag a route within the play-action window (10-30 yards)', () => {
    const playerY = 250;
    const play = makePlay({
      players: [makePlayer({ id: 'wr1', position: 'WR', y: playerY })],
      routes: [makePassRouteWithDepth('r1', 'wr1', playerY, 18)],
    });
    const violations = checkTiming(play, 'play-action');
    expect(violations.length).toBe(0);
  });

  it('should flag a route too shallow for play-action', () => {
    const playerY = 150;
    const play = makePlay({
      players: [makePlayer({ id: 'wr1', position: 'WR', y: playerY })],
      routes: [makePassRouteWithDepth('r1', 'wr1', playerY, 5)],
    });
    const violations = checkTiming(play, 'play-action');
    expect(violations.length).toBe(1);
    expect(violations[0].type).toBe('route_too_shallow');
  });
});

// ---- checkTiming: run/block routes ----

describe('checkTiming - run and block routes', () => {
  it('should not generate violations for run routes', () => {
    const play = makePlay({
      players: [makePlayer({ id: 'rb1', position: 'RB', y: 200 })],
      routes: [
        makeRoute({
          id: 'r1',
          playerId: 'rb1',
          type: 'run',
          path: [{ x: 300, y: 180 }, { x: 350, y: 100 }],
        }),
      ],
    });
    const violations = checkTiming(play, '3-step');
    expect(violations.length).toBe(0);
  });

  it('should not generate violations for block routes', () => {
    const play = makePlay({
      players: [makePlayer({ id: 'ol1', position: 'OL', y: 150 })],
      routes: [
        makeRoute({
          id: 'r1',
          playerId: 'ol1',
          type: 'block',
          path: [{ x: 300, y: 145 }],
        }),
      ],
    });
    const violations = checkTiming(play, '5-step');
    expect(violations.length).toBe(0);
  });
});

// ---- checkTiming: edge cases ----

describe('checkTiming - edge cases', () => {
  it('should return no violations for an empty play', () => {
    const play = makePlay({ players: [], routes: [] });
    expect(checkTiming(play, '3-step')).toEqual([]);
    expect(checkTiming(play, '5-step')).toEqual([]);
    expect(checkTiming(play, '7-step')).toEqual([]);
    expect(checkTiming(play, 'play-action')).toEqual([]);
  });

  it('should return no violations for a pass route with empty path', () => {
    const play = makePlay({
      players: [makePlayer({ id: 'wr1', position: 'WR' })],
      routes: [makeRoute({ id: 'r1', playerId: 'wr1', type: 'pass', path: [] })],
    });
    // Depth of 0 is within 3-step window (0-7)
    const violations = checkTiming(play, '3-step');
    expect(violations.length).toBe(0);
  });

  it('should include routeId and playerId in violations', () => {
    const playerY = 200;
    const play = makePlay({
      players: [makePlayer({ id: 'wr99', position: 'WR', number: 99, y: playerY })],
      routes: [makePassRouteWithDepth('route-abc', 'wr99', playerY, 25)],
    });
    const violations = checkTiming(play, '3-step');
    expect(violations.length).toBe(1);
    expect(violations[0].routeId).toBe('route-abc');
    expect(violations[0].playerId).toBe('wr99');
  });
});
