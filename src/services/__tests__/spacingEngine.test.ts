import {
  pixelToYard,
  yardToPixel,
  checkSpacing,
  FIELD_WIDTH_PX,
  FIELD_HEIGHT_PX,
  FIELD_WIDTH_YARDS,
  FIELD_LENGTH_YARDS,
  PX_PER_YARD_X,
  PX_PER_YARD_Y,
  SpacingViolation,
} from '../spacingEngine';
import { Play, Player, Route, Point } from '../firestore';

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

// ---- pixelToYard / yardToPixel ----

describe('pixelToYard', () => {
  it('should convert origin correctly', () => {
    const result = pixelToYard({ x: 0, y: 0 });
    expect(result.x).toBeCloseTo(0, 1);
    expect(result.y).toBeCloseTo(0, 1);
  });

  it('should convert max pixel values to field dimensions', () => {
    const result = pixelToYard({ x: FIELD_WIDTH_PX, y: FIELD_HEIGHT_PX });
    expect(result.x).toBeCloseTo(FIELD_WIDTH_YARDS, 1);
    expect(result.y).toBeCloseTo(FIELD_LENGTH_YARDS, 1);
  });

  it('should convert center of field correctly', () => {
    const result = pixelToYard({ x: FIELD_WIDTH_PX / 2, y: FIELD_HEIGHT_PX / 2 });
    expect(result.x).toBeCloseTo(FIELD_WIDTH_YARDS / 2, 1);
    expect(result.y).toBeCloseTo(FIELD_LENGTH_YARDS / 2, 1);
  });

  it('should handle fractional pixel values', () => {
    const result = pixelToYard({ x: 11.25, y: 3.0 });
    expect(result.x).toBeCloseTo(1, 0);
    expect(result.y).toBeCloseTo(1, 0);
  });
});

describe('yardToPixel', () => {
  it('should convert origin correctly', () => {
    const result = yardToPixel({ x: 0, y: 0 });
    expect(result.x).toBeCloseTo(0, 1);
    expect(result.y).toBeCloseTo(0, 1);
  });

  it('should convert full field yards to max pixels', () => {
    const result = yardToPixel({ x: FIELD_WIDTH_YARDS, y: FIELD_LENGTH_YARDS });
    expect(result.x).toBeCloseTo(FIELD_WIDTH_PX, 1);
    expect(result.y).toBeCloseTo(FIELD_HEIGHT_PX, 1);
  });
});

describe('pixelToYard and yardToPixel round-trip', () => {
  it('should round-trip from pixels to yards and back within 0.1px tolerance', () => {
    const original: Point = { x: 123.4, y: 78.9 };
    const yards = pixelToYard(original);
    const backToPixel = yardToPixel(yards);
    expect(backToPixel.x).toBeCloseTo(original.x, 1);
    expect(backToPixel.y).toBeCloseTo(original.y, 1);
  });

  it('should round-trip from yards to pixels and back within 0.1 yard tolerance', () => {
    const original: Point = { x: 26.5, y: 50.0 };
    const pixels = yardToPixel(original);
    const backToYard = pixelToYard(pixels);
    expect(backToYard.x).toBeCloseTo(original.x, 1);
    expect(backToYard.y).toBeCloseTo(original.y, 1);
  });

  it('should round-trip field boundaries', () => {
    const corners: Point[] = [
      { x: 0, y: 0 },
      { x: FIELD_WIDTH_PX, y: 0 },
      { x: 0, y: FIELD_HEIGHT_PX },
      { x: FIELD_WIDTH_PX, y: FIELD_HEIGHT_PX },
    ];
    for (const corner of corners) {
      const roundTrip = yardToPixel(pixelToYard(corner));
      expect(roundTrip.x).toBeCloseTo(corner.x, 1);
      expect(roundTrip.y).toBeCloseTo(corner.y, 1);
    }
  });
});

describe('yard values within legal field bounds', () => {
  it('should produce yard values within field dimensions for any valid pixel', () => {
    const testPoints: Point[] = [
      { x: 0, y: 0 },
      { x: FIELD_WIDTH_PX, y: FIELD_HEIGHT_PX },
      { x: 300, y: 150 },
    ];
    for (const pt of testPoints) {
      const yards = pixelToYard(pt);
      expect(yards.x).toBeGreaterThanOrEqual(0);
      expect(yards.x).toBeLessThanOrEqual(FIELD_WIDTH_YARDS + 0.01);
      expect(yards.y).toBeGreaterThanOrEqual(0);
      expect(yards.y).toBeLessThanOrEqual(FIELD_LENGTH_YARDS + 0.01);
    }
  });
});

// ---- checkSpacing: horizontal crowding ----

describe('checkSpacing - horizontal crowding', () => {
  it('should detect receivers within 3 yards laterally', () => {
    // Place two WRs about 2 yards apart horizontally (2 * PX_PER_YARD_X pixels)
    const twoYardsPx = 2 * PX_PER_YARD_X;
    const play = makePlay({
      players: [
        makePlayer({ id: 'wr1', position: 'WR', number: 1, x: 300, y: 100 }),
        makePlayer({ id: 'wr2', position: 'WR', number: 2, x: 300 + twoYardsPx, y: 100 }),
      ],
    });
    const violations = checkSpacing(play);
    const hc = violations.filter((v) => v.type === 'horizontal_crowding');
    expect(hc.length).toBe(1);
    expect(hc[0].playerIds).toContain('wr1');
    expect(hc[0].playerIds).toContain('wr2');
  });

  it('should not flag receivers more than 3 yards apart', () => {
    const fourYardsPx = 4 * PX_PER_YARD_X;
    const play = makePlay({
      players: [
        makePlayer({ id: 'wr1', position: 'WR', number: 1, x: 100, y: 100 }),
        makePlayer({ id: 'wr2', position: 'WR', number: 2, x: 100 + fourYardsPx, y: 100 }),
      ],
    });
    const violations = checkSpacing(play);
    const hc = violations.filter((v) => v.type === 'horizontal_crowding');
    expect(hc.length).toBe(0);
  });

  it('should skip OL players', () => {
    // Two OL right next to each other should not trigger horizontal crowding
    const play = makePlay({
      players: [
        makePlayer({ id: 'ol1', position: 'OL', number: 71, x: 300, y: 150 }),
        makePlayer({ id: 'ol2', position: 'OL', number: 72, x: 301, y: 150 }),
      ],
    });
    const violations = checkSpacing(play);
    const hc = violations.filter((v) => v.type === 'horizontal_crowding');
    expect(hc.length).toBe(0);
  });
});

// ---- checkSpacing: vertical crowding ----

describe('checkSpacing - vertical crowding', () => {
  it('should detect route endpoints at same depth within 2 yards laterally', () => {
    const play = makePlay({
      players: [
        makePlayer({ id: 'wr1', position: 'WR', number: 1, x: 200, y: 150 }),
        makePlayer({ id: 'wr2', position: 'WR', number: 2, x: 400, y: 150 }),
      ],
      routes: [
        makeRoute({
          id: 'r1',
          playerId: 'wr1',
          path: [{ x: 200, y: 100 }, { x: 300, y: 50 }],
        }),
        makeRoute({
          id: 'r2',
          playerId: 'wr2',
          path: [{ x: 400, y: 100 }, { x: 305, y: 52 }],
        }),
      ],
    });
    const violations = checkSpacing(play);
    const vc = violations.filter((v) => v.type === 'vertical_crowding');
    expect(vc.length).toBe(1);
  });

  it('should not flag route endpoints that are far apart', () => {
    const tenYardsPx = 10 * PX_PER_YARD_X;
    const play = makePlay({
      players: [
        makePlayer({ id: 'wr1', position: 'WR', number: 1, x: 100, y: 150 }),
        makePlayer({ id: 'wr2', position: 'WR', number: 2, x: 500, y: 150 }),
      ],
      routes: [
        makeRoute({
          id: 'r1',
          playerId: 'wr1',
          path: [{ x: 100, y: 50 }],
        }),
        makeRoute({
          id: 'r2',
          playerId: 'wr2',
          path: [{ x: 500, y: 50 }],
        }),
      ],
    });
    const violations = checkSpacing(play);
    const vc = violations.filter((v) => v.type === 'vertical_crowding');
    expect(vc.length).toBe(0);
  });
});

// ---- checkSpacing: route convergence ----

describe('checkSpacing - route convergence', () => {
  it('should detect routes that converge within 2 yards', () => {
    // Two routes that cross at around (300, 100) in pixels
    const play = makePlay({
      players: [
        makePlayer({ id: 'wr1', position: 'WR', number: 1, x: 200, y: 150 }),
        makePlayer({ id: 'wr2', position: 'WR', number: 2, x: 400, y: 150 }),
      ],
      routes: [
        makeRoute({
          id: 'r1',
          playerId: 'wr1',
          path: [{ x: 250, y: 130 }, { x: 300, y: 100 }, { x: 350, y: 70 }],
        }),
        makeRoute({
          id: 'r2',
          playerId: 'wr2',
          path: [{ x: 350, y: 130 }, { x: 302, y: 101 }, { x: 250, y: 70 }],
        }),
      ],
    });
    const violations = checkSpacing(play);
    const rc = violations.filter((v) => v.type === 'route_convergence');
    expect(rc.length).toBe(1);
  });

  it('should not flag routes that stay well apart', () => {
    const play = makePlay({
      players: [
        makePlayer({ id: 'wr1', position: 'WR', number: 1, x: 50, y: 150 }),
        makePlayer({ id: 'wr2', position: 'WR', number: 2, x: 550, y: 150 }),
      ],
      routes: [
        makeRoute({
          id: 'r1',
          playerId: 'wr1',
          path: [{ x: 50, y: 100 }, { x: 50, y: 50 }],
        }),
        makeRoute({
          id: 'r2',
          playerId: 'wr2',
          path: [{ x: 550, y: 100 }, { x: 550, y: 50 }],
        }),
      ],
    });
    const violations = checkSpacing(play);
    const rc = violations.filter((v) => v.type === 'route_convergence');
    expect(rc.length).toBe(0);
  });
});

// ---- checkSpacing: backfield congestion ----

describe('checkSpacing - backfield congestion', () => {
  it('should detect RB route intersecting WR route', () => {
    const play = makePlay({
      players: [
        makePlayer({ id: 'rb1', position: 'RB', number: 22, x: 300, y: 170 }),
        makePlayer({ id: 'wr1', position: 'WR', number: 1, x: 100, y: 150 }),
      ],
      routes: [
        makeRoute({
          id: 'r-rb',
          playerId: 'rb1',
          type: 'pass',
          path: [{ x: 250, y: 160 }, { x: 150, y: 150 }, { x: 100, y: 140 }],
        }),
        makeRoute({
          id: 'r-wr',
          playerId: 'wr1',
          type: 'pass',
          path: [{ x: 120, y: 145 }, { x: 150, y: 148 }, { x: 200, y: 130 }],
        }),
      ],
    });
    const violations = checkSpacing(play);
    const bc = violations.filter((v) => v.type === 'backfield_congestion');
    expect(bc.length).toBe(1);
    expect(bc[0].playerIds).toContain('rb1');
    expect(bc[0].playerIds).toContain('wr1');
  });

  it('should not flag RB block routes', () => {
    const play = makePlay({
      players: [
        makePlayer({ id: 'rb1', position: 'RB', number: 22, x: 300, y: 170 }),
        makePlayer({ id: 'wr1', position: 'WR', number: 1, x: 300, y: 150 }),
      ],
      routes: [
        makeRoute({
          id: 'r-rb',
          playerId: 'rb1',
          type: 'block',
          path: [{ x: 300, y: 155 }],
        }),
        makeRoute({
          id: 'r-wr',
          playerId: 'wr1',
          type: 'pass',
          path: [{ x: 300, y: 140 }, { x: 300, y: 100 }],
        }),
      ],
    });
    const violations = checkSpacing(play);
    const bc = violations.filter((v) => v.type === 'backfield_congestion');
    expect(bc.length).toBe(0);
  });

  it('should not flag when RB and WR routes are far apart', () => {
    const play = makePlay({
      players: [
        makePlayer({ id: 'rb1', position: 'RB', number: 22, x: 300, y: 200 }),
        makePlayer({ id: 'wr1', position: 'WR', number: 1, x: 50, y: 150 }),
      ],
      routes: [
        makeRoute({
          id: 'r-rb',
          playerId: 'rb1',
          type: 'pass',
          path: [{ x: 350, y: 190 }, { x: 450, y: 170 }],
        }),
        makeRoute({
          id: 'r-wr',
          playerId: 'wr1',
          type: 'pass',
          path: [{ x: 50, y: 120 }, { x: 50, y: 80 }],
        }),
      ],
    });
    const violations = checkSpacing(play);
    const bc = violations.filter((v) => v.type === 'backfield_congestion');
    expect(bc.length).toBe(0);
  });
});

// ---- Edge cases ----

describe('checkSpacing - edge cases', () => {
  it('should return no violations for an empty play', () => {
    const play = makePlay({ players: [], routes: [] });
    expect(checkSpacing(play)).toEqual([]);
  });

  it('should return no violations for a play with only OL players', () => {
    const play = makePlay({
      players: [
        makePlayer({ id: 'ol1', position: 'OL', number: 71, x: 260, y: 150 }),
        makePlayer({ id: 'ol2', position: 'OL', number: 72, x: 280, y: 150 }),
        makePlayer({ id: 'ol3', position: 'OL', number: 73, x: 300, y: 150 }),
        makePlayer({ id: 'ol4', position: 'OL', number: 74, x: 320, y: 150 }),
        makePlayer({ id: 'ol5', position: 'OL', number: 75, x: 340, y: 150 }),
      ],
    });
    expect(checkSpacing(play)).toEqual([]);
  });

  it('should return no violations for a play with no routes', () => {
    const play = makePlay({
      players: [
        makePlayer({ id: 'wr1', position: 'WR', number: 1, x: 100, y: 150 }),
        makePlayer({ id: 'wr2', position: 'WR', number: 2, x: 500, y: 150 }),
      ],
      routes: [],
    });
    // No routes means no vertical crowding, route convergence, or backfield congestion
    // But players might still trigger horizontal crowding if close - these are far apart
    expect(checkSpacing(play)).toEqual([]);
  });

  it('should detect horizontal crowding when two receivers are at the exact same position', () => {
    const play = makePlay({
      players: [
        makePlayer({ id: 'wr1', position: 'WR', number: 1, x: 300, y: 150 }),
        makePlayer({ id: 'wr2', position: 'WR', number: 2, x: 300, y: 150 }),
      ],
    });
    const violations = checkSpacing(play);
    const hc = violations.filter((v) => v.type === 'horizontal_crowding');
    expect(hc.length).toBe(1);
  });

  it('should handle routes with empty paths gracefully', () => {
    const play = makePlay({
      players: [
        makePlayer({ id: 'wr1', position: 'WR', number: 1, x: 200, y: 150 }),
        makePlayer({ id: 'wr2', position: 'WR', number: 2, x: 400, y: 150 }),
      ],
      routes: [
        makeRoute({ id: 'r1', playerId: 'wr1', path: [] }),
        makeRoute({ id: 'r2', playerId: 'wr2', path: [] }),
      ],
    });
    // Empty path routes should not cause errors
    const violations = checkSpacing(play);
    const vc = violations.filter((v) => v.type === 'vertical_crowding');
    expect(vc.length).toBe(0);
  });

  it('should handle players at field boundaries', () => {
    const play = makePlay({
      players: [
        makePlayer({ id: 'wr1', position: 'WR', number: 1, x: 0, y: 0 }),
        makePlayer({ id: 'wr2', position: 'WR', number: 2, x: FIELD_WIDTH_PX, y: FIELD_HEIGHT_PX }),
      ],
    });
    const violations = checkSpacing(play);
    // These are at opposite corners, no crowding
    const hc = violations.filter((v) => v.type === 'horizontal_crowding');
    expect(hc.length).toBe(0);
  });
});
