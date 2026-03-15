/**
 * playbookBridge Tests — Property-based correctness tests
 * Ensures pixel↔yard conversions are accurate and no data is silently dropped.
 */

import {
  pixelToYard,
  yardToPixel,
  toEnginePlay,
  fromEnginePlay,
  pixelDistanceInYards,
  FIELD_WIDTH_YARDS,
  FIELD_LENGTH_YARDS,
  FIELD_WIDTH_PX,
  FIELD_HEIGHT_PX,
  PX_PER_YARD_X,
  PX_PER_YARD_Y,
} from '../playbookBridge';
import type { Play, Player, Route, Point } from '../../services/firestore';

// ============================================
// HELPERS
// ============================================

function createFullyPopulatedPlay(): Play {
  return {
    id: 'play-1',
    teamId: 'team-1',
    name: 'Test Play',
    formation: 'Shotgun',
    description: 'A test play with all fields populated',
    players: [
      { id: 'p1', number: 12, position: 'QB', x: 300, y: 150 },
      { id: 'p2', number: 80, position: 'WR', x: 50, y: 150 },
      { id: 'p3', number: 88, position: 'TE', x: 400, y: 150 },
    ],
    routes: [
      {
        id: 'r1',
        playerId: 'p2',
        path: [{ x: 50, y: 150 }, { x: 50, y: 50 }, { x: 150, y: 20 }],
        type: 'pass',
        timing: 2.5,
      },
      {
        id: 'r2',
        playerId: 'p3',
        path: [{ x: 400, y: 150 }, { x: 400, y: 80 }],
        type: 'pass',
        timing: 1.5,
      },
    ],
    tags: ['passing', 'shotgun'],
    difficulty: 'intermediate',
    sport: 'football',
    createdBy: 'coach-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
  };
}

// ============================================
// CONSTANTS VERIFICATION
// ============================================

describe('Field constants', () => {
  it('PX_PER_YARD_X equals FIELD_WIDTH_PX / FIELD_WIDTH_YARDS', () => {
    expect(PX_PER_YARD_X).toBeCloseTo(FIELD_WIDTH_PX / FIELD_WIDTH_YARDS, 5);
  });

  it('PX_PER_YARD_Y equals FIELD_HEIGHT_PX / FIELD_LENGTH_YARDS', () => {
    expect(PX_PER_YARD_Y).toBeCloseTo(FIELD_HEIGHT_PX / FIELD_LENGTH_YARDS, 5);
  });
});

// ============================================
// pixelToYard / yardToPixel
// ============================================

describe('pixelToYard', () => {
  it('converts origin correctly', () => {
    const result = pixelToYard({ x: 0, y: 0 });
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it('converts field max correctly', () => {
    const result = pixelToYard({ x: FIELD_WIDTH_PX, y: FIELD_HEIGHT_PX });
    expect(result.x).toBeCloseTo(FIELD_WIDTH_YARDS, 2);
    expect(result.y).toBeCloseTo(FIELD_LENGTH_YARDS, 2);
  });

  it('converts mid-field correctly', () => {
    const result = pixelToYard({ x: FIELD_WIDTH_PX / 2, y: FIELD_HEIGHT_PX / 2 });
    expect(result.x).toBeCloseTo(FIELD_WIDTH_YARDS / 2, 2);
    expect(result.y).toBeCloseTo(FIELD_LENGTH_YARDS / 2, 2);
  });
});

describe('yardToPixel', () => {
  it('converts origin correctly', () => {
    const result = yardToPixel({ x: 0, y: 0 });
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it('converts field max correctly', () => {
    const result = yardToPixel({ x: FIELD_WIDTH_YARDS, y: FIELD_LENGTH_YARDS });
    expect(result.x).toBeCloseTo(FIELD_WIDTH_PX, 1);
    expect(result.y).toBeCloseTo(FIELD_HEIGHT_PX, 1);
  });
});

describe('pixel↔yard round-trip', () => {
  it('preserves X position within 0.1 pixel tolerance for specific values', () => {
    const testValues = [0, 50, 100, 200, 300, 400, 500, 550, 590, FIELD_WIDTH_PX];
    testValues.forEach(pixelX => {
      const yards = pixelToYard({ x: pixelX, y: 0 });
      const back = yardToPixel(yards);
      expect(back.x).toBeCloseTo(pixelX, 1);
    });
  });

  it('preserves Y position within 0.1 pixel tolerance for specific values', () => {
    const testValues = [0, 25, 50, 100, 150, 200, 250, 275, 295, FIELD_HEIGHT_PX];
    testValues.forEach(pixelY => {
      const yards = pixelToYard({ x: 0, y: pixelY });
      const back = yardToPixel(yards);
      expect(back.y).toBeCloseTo(pixelY, 1);
    });
  });

  it('preserves position within 0.1px for 100 random positions', () => {
    for (let i = 0; i < 100; i++) {
      const pixelX = Math.random() * FIELD_WIDTH_PX;
      const pixelY = Math.random() * FIELD_HEIGHT_PX;
      const yards = pixelToYard({ x: pixelX, y: pixelY });
      const back = yardToPixel(yards);
      expect(back.x).toBeCloseTo(pixelX, 1);
      expect(back.y).toBeCloseTo(pixelY, 1);
    }
  });

  it('round-trips a complete Play with players and routes', () => {
    const original = createFullyPopulatedPlay();
    const enginePlay = toEnginePlay(original);
    const restored = fromEnginePlay(enginePlay);
    // Player positions must round-trip within 0.1px
    original.players.forEach((player, i) => {
      expect(restored.players[i].x).toBeCloseTo(player.x, 1);
      expect(restored.players[i].y).toBeCloseTo(player.y, 1);
    });
    // Route waypoints must round-trip within 0.1px
    original.routes.forEach((route, ri) => {
      route.path.forEach((wp, wi) => {
        expect(restored.routes[ri].path[wi].x).toBeCloseTo(wp.x, 1);
        expect(restored.routes[ri].path[wi].y).toBeCloseTo(wp.y, 1);
      });
    });
  });

  it('yard→pixel→yard round-trip preserves position within 0.01 yards', () => {
    for (let i = 0; i < 50; i++) {
      const yardX = Math.random() * FIELD_WIDTH_YARDS;
      const yardY = Math.random() * FIELD_LENGTH_YARDS;
      const pixels = yardToPixel({ x: yardX, y: yardY });
      const back = pixelToYard(pixels);
      expect(back.x).toBeCloseTo(yardX, 2);
      expect(back.y).toBeCloseTo(yardY, 2);
    }
  });
});

describe('field boundary enforcement', () => {
  it('converted yard X values stay within 0 and FIELD_WIDTH_YARDS', () => {
    [0, 1, FIELD_WIDTH_PX - 1, FIELD_WIDTH_PX].forEach(pixelX => {
      const yards = pixelToYard({ x: pixelX, y: 0 });
      expect(yards.x).toBeGreaterThanOrEqual(0);
      expect(yards.x).toBeLessThanOrEqual(FIELD_WIDTH_YARDS + 0.001);
    });
  });

  it('converted yard Y values stay within 0 and FIELD_LENGTH_YARDS', () => {
    [0, 1, FIELD_HEIGHT_PX - 1, FIELD_HEIGHT_PX].forEach(pixelY => {
      const yards = pixelToYard({ x: 0, y: pixelY });
      expect(yards.y).toBeGreaterThanOrEqual(0);
      expect(yards.y).toBeLessThanOrEqual(FIELD_LENGTH_YARDS + 0.001);
    });
  });

  it('yard values from random pixel positions are within legal field bounds', () => {
    for (let i = 0; i < 50; i++) {
      const px: Point = {
        x: Math.random() * FIELD_WIDTH_PX,
        y: Math.random() * FIELD_HEIGHT_PX,
      };
      const yards = pixelToYard(px);
      expect(yards.x).toBeGreaterThanOrEqual(0);
      expect(yards.x).toBeLessThanOrEqual(FIELD_WIDTH_YARDS + 0.01);
      expect(yards.y).toBeGreaterThanOrEqual(0);
      expect(yards.y).toBeLessThanOrEqual(FIELD_LENGTH_YARDS + 0.01);
    }
  });
});

// ============================================
// toEnginePlay / fromEnginePlay
// ============================================

describe('toEnginePlay', () => {
  it('converts all player positions to yards', () => {
    const play = createFullyPopulatedPlay();
    const engine = toEnginePlay(play);
    const qb = engine.players.find(p => p.id === 'p1')!;
    expect(qb.x).toBeCloseTo(300 / PX_PER_YARD_X, 2);
    expect(qb.y).toBeCloseTo(150 / PX_PER_YARD_Y, 2);
  });

  it('converts all route waypoints to yards', () => {
    const play = createFullyPopulatedPlay();
    const engine = toEnginePlay(play);
    const route = engine.routes.find(r => r.id === 'r1')!;
    expect(route.path[0].x).toBeCloseTo(50 / PX_PER_YARD_X, 2);
    expect(route.path[0].y).toBeCloseTo(150 / PX_PER_YARD_Y, 2);
  });

  it('preserves non-coordinate fields exactly', () => {
    const play = createFullyPopulatedPlay();
    const engine = toEnginePlay(play);
    expect(engine.id).toBe(play.id);
    expect(engine.teamId).toBe(play.teamId);
    expect(engine.name).toBe(play.name);
    expect(engine.formation).toBe(play.formation);
    expect(engine.description).toBe(play.description);
    expect(engine.tags).toEqual(play.tags);
    expect(engine.difficulty).toBe(play.difficulty);
    expect(engine.sport).toBe(play.sport);
    expect(engine.createdBy).toBe(play.createdBy);
    expect(engine.createdAt).toEqual(play.createdAt);
    expect(engine.updatedAt).toEqual(play.updatedAt);
  });

  it('preserves route metadata (type, timing)', () => {
    const play = createFullyPopulatedPlay();
    const engine = toEnginePlay(play);
    const route = engine.routes.find(r => r.id === 'r1')!;
    expect(route.type).toBe('pass');
    expect(route.timing).toBe(2.5);
    expect(route.playerId).toBe('p2');
  });

  it('preserves player count', () => {
    const play = createFullyPopulatedPlay();
    const engine = toEnginePlay(play);
    expect(engine.players.length).toBe(play.players.length);
  });

  it('preserves route count', () => {
    const play = createFullyPopulatedPlay();
    const engine = toEnginePlay(play);
    expect(engine.routes.length).toBe(play.routes.length);
  });
});

describe('fromEnginePlay', () => {
  it('converts yard positions back to pixels', () => {
    const play = createFullyPopulatedPlay();
    const engine = toEnginePlay(play);
    const restored = fromEnginePlay(engine);
    const qb = restored.players.find(p => p.id === 'p1')!;
    expect(qb.x).toBeCloseTo(300, 1);
    expect(qb.y).toBeCloseTo(150, 1);
  });
});

describe('full round-trip: Play → EnginePlay → Play', () => {
  it('preserves all player positions within 0.1px', () => {
    const play = createFullyPopulatedPlay();
    const roundTripped = fromEnginePlay(toEnginePlay(play));
    for (let i = 0; i < play.players.length; i++) {
      expect(roundTripped.players[i].x).toBeCloseTo(play.players[i].x, 1);
      expect(roundTripped.players[i].y).toBeCloseTo(play.players[i].y, 1);
    }
  });

  it('preserves all route waypoints within 0.1px', () => {
    const play = createFullyPopulatedPlay();
    const roundTripped = fromEnginePlay(toEnginePlay(play));
    for (let i = 0; i < play.routes.length; i++) {
      for (let j = 0; j < play.routes[i].path.length; j++) {
        expect(roundTripped.routes[i].path[j].x).toBeCloseTo(play.routes[i].path[j].x, 1);
        expect(roundTripped.routes[i].path[j].y).toBeCloseTo(play.routes[i].path[j].y, 1);
      }
    }
  });

  it('preserves all non-coordinate fields exactly', () => {
    const play = createFullyPopulatedPlay();
    const roundTripped = fromEnginePlay(toEnginePlay(play));
    expect(roundTripped.id).toBe(play.id);
    expect(roundTripped.teamId).toBe(play.teamId);
    expect(roundTripped.name).toBe(play.name);
    expect(roundTripped.formation).toBe(play.formation);
    expect(roundTripped.description).toBe(play.description);
    expect(roundTripped.tags).toEqual(play.tags);
    expect(roundTripped.difficulty).toBe(play.difficulty);
    expect(roundTripped.sport).toBe(play.sport);
    expect(roundTripped.createdBy).toBe(play.createdBy);
  });

  it('bridge preserves all player fields — no silent drops', () => {
    const play = createFullyPopulatedPlay();
    const roundTripped = fromEnginePlay(toEnginePlay(play));
    for (let i = 0; i < play.players.length; i++) {
      expect(Object.keys(roundTripped.players[i]).sort()).toEqual(
        Object.keys(play.players[i]).sort()
      );
    }
  });

  it('bridge preserves all route fields — no silent drops', () => {
    const play = createFullyPopulatedPlay();
    const roundTripped = fromEnginePlay(toEnginePlay(play));
    for (let i = 0; i < play.routes.length; i++) {
      expect(Object.keys(roundTripped.routes[i]).sort()).toEqual(
        Object.keys(play.routes[i]).sort()
      );
    }
  });

  it('route waypoints maintain relative ordering after bridge', () => {
    const play = createFullyPopulatedPlay();
    const roundTripped = fromEnginePlay(toEnginePlay(play));
    // Route r1 waypoints: (50,150) → (50,50) → (150,20)
    // After round-trip, Y values should still be decreasing
    const route = roundTripped.routes.find(r => r.id === 'r1')!;
    expect(route.path[0].y).toBeGreaterThan(route.path[1].y);
    expect(route.path[1].y).toBeGreaterThan(route.path[2].y);
  });
});

describe('no silent field drops', () => {
  it('preserves player ID after bridge translation', () => {
    const play = createFullyPopulatedPlay();
    const result = toEnginePlay(play);
    // Player ID must survive — concept detection uses it for reporting
    expect(result.players[0].id).toBe('p1');
    expect(result.players[1].id).toBe('p2');
    expect(result.players[2].id).toBe('p3');
  });

  it('preserves empty routes array — does not drop it', () => {
    const play = createFullyPopulatedPlay();
    play.routes = [];
    const result = toEnginePlay(play);
    expect(result.routes).toEqual([]);
  });

  it('preserves waypoint ordering after bridge', () => {
    const play = createFullyPopulatedPlay();
    const result = toEnginePlay(play);
    const route = result.routes.find(r => r.id === 'r1')!;
    // Original waypoints: (50,150) → (50,50) → (150,20)
    // After converting to yards, the order must be preserved
    // Verify by round-tripping: ordering should match original
    const restored = fromEnginePlay(result);
    const restoredRoute = restored.routes.find(r => r.id === 'r1')!;
    const originalRoute = play.routes.find(r => r.id === 'r1')!;
    restoredRoute.path.forEach((wp, i) => {
      expect(wp.x).toBeCloseTo(originalRoute.path[i].x, 1);
      expect(wp.y).toBeCloseTo(originalRoute.path[i].y, 1);
    });
  });

  it('preserves player number and position', () => {
    const play = createFullyPopulatedPlay();
    const result = toEnginePlay(play);
    const qb = result.players.find(p => p.id === 'p1')!;
    expect(qb.number).toBe(12);
    expect(qb.position).toBe('QB');
  });

  it('preserves route playerId linkage', () => {
    const play = createFullyPopulatedPlay();
    const engine = toEnginePlay(play);
    const restored = fromEnginePlay(engine);
    expect(restored.routes[0].playerId).toBe('p2');
    expect(restored.routes[1].playerId).toBe('p3');
  });
});

describe('tags are deep-copied (no shared references)', () => {
  it('modifying engine tags does not affect original play', () => {
    const play = createFullyPopulatedPlay();
    const engine = toEnginePlay(play);
    engine.tags.push('modified');
    expect(play.tags).not.toContain('modified');
  });

  it('modifying restored tags does not affect engine play', () => {
    const play = createFullyPopulatedPlay();
    const engine = toEnginePlay(play);
    const restored = fromEnginePlay(engine);
    restored.tags.push('modified');
    expect(engine.tags).not.toContain('modified');
  });
});

// ============================================
// pixelDistanceInYards
// ============================================

describe('pixelDistanceInYards', () => {
  it('returns 0 for same point', () => {
    expect(pixelDistanceInYards({ x: 100, y: 100 }, { x: 100, y: 100 })).toBe(0);
  });

  it('calculates correct horizontal distance', () => {
    // Full field width in pixels → should be FIELD_WIDTH_YARDS
    const dist = pixelDistanceInYards({ x: 0, y: 0 }, { x: FIELD_WIDTH_PX, y: 0 });
    expect(dist).toBeCloseTo(FIELD_WIDTH_YARDS, 1);
  });

  it('calculates correct vertical distance', () => {
    const dist = pixelDistanceInYards({ x: 0, y: 0 }, { x: 0, y: FIELD_HEIGHT_PX });
    expect(dist).toBeCloseTo(FIELD_LENGTH_YARDS, 1);
  });
});

// ============================================
// Bridge uses constants, not magic numbers
// ============================================

describe('bridge source code correctness', () => {
  it('bridge does not use hardcoded 53 (uses FIELD_WIDTH_YARDS constant)', () => {
    const fs = require('fs');
    const source = fs.readFileSync('src/utils/playbookBridge.ts', 'utf8');
    // Check there's no bare "53" that isn't part of "53.333"
    const bareMatches = source.match(/[^0-9.]53[^0-9.]/g) || [];
    // Filter out string '53.333'
    const badMatches = bareMatches.filter((m: string) => !m.includes('53.333'));
    expect(badMatches.length).toBe(0);
  });
});
