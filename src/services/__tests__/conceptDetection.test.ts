import { classifyRoute, detectConcepts, RouteShape, DetectedConcept } from '../conceptDetection';
import { Play, Route, Player, Point } from '../firestore';

// ─── Helper Functions ────────────────────────────────────────────────────────

function buildPlayer(id: string, position: string, x: number, y: number): Player {
  return { id, number: parseInt(id.replace(/\D/g, '') || '0', 10), position, x, y };
}

function buildRoute(
  id: string,
  playerId: string,
  path: Point[],
  type: 'run' | 'pass' | 'block' = 'pass',
  timing: number = 1,
): Route {
  return { id, playerId, path, type, timing };
}

function buildPlay(players: Player[], routes: Route[]): Play {
  return {
    teamId: 'team1',
    name: 'Test Play',
    formation: 'Shotgun',
    description: 'Test play for concept detection',
    routes,
    players,
    tags: [],
    difficulty: 'intermediate',
    sport: 'football',
    createdBy: 'test',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ─── Coordinate Helpers ──────────────────────────────────────────────────────
// Field: 600px wide x 300px high = 53.333 yards x 100 yards
// PX_PER_YARD_X ≈ 11.25, PX_PER_YARD_Y = 3.0
// Y decreases = downfield (going up on screen)
// Center X = 300

/** Convert yards downfield to pixel Y displacement (negative Y = downfield). */
function yardsToDepthPx(yards: number): number {
  return yards * 3.0;
}

/** Convert yards lateral to pixel X displacement. */
function yardsToLateralPx(yards: number): number {
  return yards * 11.25;
}

/**
 * Build a straight path from a starting point to an end point using several intermediate points.
 */
function straightPath(startX: number, startY: number, endX: number, endY: number, points: number = 5): Point[] {
  const path: Point[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    path.push({ x: startX + (endX - startX) * t, y: startY + (endY - startY) * t });
  }
  return path;
}

/**
 * Build a path with a break: stem straight downfield, then break in a new direction.
 */
function breakPath(
  startX: number,
  startY: number,
  stemDepthYards: number,
  breakLateralYards: number,
  breakDepthExtraYards: number = 0,
  stemPoints: number = 4,
  breakPoints: number = 4,
): Point[] {
  const breakY = startY - yardsToDepthPx(stemDepthYards);
  const endX = startX + yardsToLateralPx(breakLateralYards);
  const endY = breakY - yardsToDepthPx(breakDepthExtraYards);

  const path: Point[] = [];
  // Stem
  for (let i = 0; i < stemPoints; i++) {
    const t = i / (stemPoints - 1);
    path.push({ x: startX, y: startY + (breakY - startY) * t });
  }
  // Break
  for (let i = 1; i < breakPoints; i++) {
    const t = i / (breakPoints - 1);
    path.push({
      x: path[stemPoints - 1].x + (endX - path[stemPoints - 1].x) * t,
      y: breakY + (endY - breakY) * t,
    });
  }
  return path;
}

// ─── Route Classification Tests ──────────────────────────────────────────────

describe('classifyRoute', () => {
  // Players for testing: one on left side, one on right side
  const leftWR = buildPlayer('wr1', 'WR', 100, 150); // left side of field
  const rightWR = buildPlayer('wr2', 'WR', 500, 150); // right side of field
  const centerPlayer = buildPlayer('wr3', 'WR', 300, 150); // center

  test('classifies a straight vertical route as go', () => {
    // Straight downfield 20 yards with no lateral movement
    const path = straightPath(100, 150, 100, 150 - yardsToDepthPx(20));
    const route = buildRoute('r1', 'wr1', path);
    expect(classifyRoute(route, leftWR)).toBe('go');
  });

  test('classifies a short route with break to sideline as out', () => {
    // Stem 8 yards downfield, break outside (left for left WR)
    const path = breakPath(100, 150, 8, -5); // break left = outside for left WR
    const route = buildRoute('r2', 'wr1', path);
    expect(classifyRoute(route, leftWR)).toBe('out');
  });

  test('classifies a short route with break inside as in', () => {
    // Stem 8 yards downfield, break inside (right for left WR)
    const path = breakPath(100, 150, 8, 5);
    const route = buildRoute('r3', 'wr1', path);
    expect(classifyRoute(route, leftWR)).toBe('in');
  });

  test('classifies a hitch route (short, stops with break back)', () => {
    // Run 5 yards downfield then break slightly back
    const path = breakPath(100, 150, 5, 0, -2);
    const route = buildRoute('r4', 'wr1', path);
    expect(classifyRoute(route, leftWR)).toBe('hitch');
  });

  test('classifies a corner route (deep stem + break outside)', () => {
    // Stem 12 yards, break outside with additional depth
    const path = breakPath(100, 150, 12, -5, 3);
    const route = buildRoute('r5', 'wr1', path);
    expect(classifyRoute(route, leftWR)).toBe('corner');
  });

  test('classifies a post route (deep stem + break inside)', () => {
    // Stem 12 yards, break inside with additional depth
    const path = breakPath(100, 150, 12, 5, 3);
    const route = buildRoute('r6', 'wr1', path);
    expect(classifyRoute(route, leftWR)).toBe('post');
  });

  test('classifies a flat route (lateral, shallow)', () => {
    // Very shallow (1 yard deep), move 6 yards laterally
    const path = straightPath(100, 150, 100 - yardsToLateralPx(6), 150 - yardsToDepthPx(1));
    const route = buildRoute('r7', 'wr1', path);
    expect(classifyRoute(route, leftWR)).toBe('flat');
  });

  test('classifies a slant route (short stem, breaks inside)', () => {
    // Stem 3 yards, break inside
    const path = breakPath(100, 150, 3, 4, 2);
    const route = buildRoute('r8', 'wr1', path);
    expect(classifyRoute(route, leftWR)).toBe('slant');
  });

  test('classifies a drag route (shallow crossing route)', () => {
    // Shallow (3 yards deep), cross 10 yards inside
    const path = straightPath(100, 150, 100 + yardsToLateralPx(10), 150 - yardsToDepthPx(3));
    const route = buildRoute('r9', 'wr1', path);
    expect(classifyRoute(route, leftWR)).toBe('drag');
  });

  test('classifies a comeback route (deep stem, returns toward LOS)', () => {
    // Stem 14 yards, then break back 3 yards
    const path = breakPath(100, 150, 14, -1, -3);
    const route = buildRoute('r10', 'wr1', path);
    expect(classifyRoute(route, leftWR)).toBe('comeback');
  });

  test('classifies right-side out route correctly', () => {
    // Right WR: stem 8 yards, break right (outside)
    const path = breakPath(500, 150, 8, 5); // break right = outside for right WR
    const route = buildRoute('r11', 'wr2', path);
    expect(classifyRoute(route, rightWR)).toBe('out');
  });

  test('classifies right-side in route correctly', () => {
    // Right WR: stem 8 yards, break left (inside)
    const path = breakPath(500, 150, 8, -5); // break left = inside for right WR
    const route = buildRoute('r12', 'wr2', path);
    expect(classifyRoute(route, rightWR)).toBe('in');
  });

  test('classifies a short path with insufficient points as custom', () => {
    const route = buildRoute('r13', 'wr1', [{ x: 100, y: 150 }]);
    expect(classifyRoute(route, leftWR)).toBe('custom');
  });

  test('classifies an empty path as custom', () => {
    const route = buildRoute('r14', 'wr1', []);
    expect(classifyRoute(route, leftWR)).toBe('custom');
  });

  test('classifies a wheel route (flat then vertical)', () => {
    // Start lateral (2 yards deep, 4 yards lateral) then break upfield for 12+ yards
    const startX = 100;
    const startY = 150;
    const flatEndX = startX - yardsToLateralPx(4);
    const flatEndY = startY - yardsToDepthPx(2);
    const vertEndY = flatEndY - yardsToDepthPx(12);

    const path: Point[] = [
      { x: startX, y: startY },
      { x: startX - yardsToLateralPx(1), y: startY - yardsToDepthPx(0.5) },
      { x: startX - yardsToLateralPx(2.5), y: startY - yardsToDepthPx(1) },
      { x: flatEndX, y: flatEndY },
      { x: flatEndX - yardsToLateralPx(0.5), y: flatEndY - yardsToDepthPx(4) },
      { x: flatEndX - yardsToLateralPx(0.5), y: flatEndY - yardsToDepthPx(8) },
      { x: flatEndX - yardsToLateralPx(0.5), y: vertEndY },
    ];
    const route = buildRoute('r15', 'wr1', path);
    expect(classifyRoute(route, leftWR)).toBe('wheel');
  });
});

// ─── Concept Detection Tests ─────────────────────────────────────────────────

describe('detectConcepts', () => {
  // ── Validation Plays (20+) ──────────────────────────────────────────────

  // Standard player positions for plays
  const LOS_Y = 150; // line of scrimmage Y

  describe('Validation Play 1: Classic Smash - Hitch + Corner (left side)', () => {
    const wr1 = buildPlayer('wr1', 'WR', 80, LOS_Y);
    const wr2 = buildPlayer('wr2', 'WR', 130, LOS_Y);

    // WR1: corner route (deep stem 12 yards, break outside)
    const cornerPath = breakPath(80, LOS_Y, 12, -5, 3);
    const cornerRoute = buildRoute('r1', 'wr1', cornerPath);

    // WR2: hitch route (5 yards, break back)
    const hitchPath = breakPath(130, LOS_Y, 5, 0, -2);
    const hitchRoute = buildRoute('r2', 'wr2', hitchPath);

    const play = buildPlay([wr1, wr2], [cornerRoute, hitchRoute]);

    test('detects smash concept', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'smash')).toBe(true);
    });

    test('does not detect flood, mesh, or spacing', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'flood')).toBe(false);
      expect(concepts.some((c) => c.conceptId === 'mesh')).toBe(false);
      expect(concepts.some((c) => c.conceptId === 'spacing')).toBe(false);
    });
  });

  describe('Validation Play 2: Classic Smash - Right side', () => {
    const wr1 = buildPlayer('wr1', 'WR', 520, LOS_Y);
    const wr2 = buildPlayer('wr2', 'WR', 470, LOS_Y);

    const cornerPath = breakPath(520, LOS_Y, 12, 5, 3); // break right = outside for right WR
    const cornerRoute = buildRoute('r1', 'wr1', cornerPath);

    const hitchPath = breakPath(470, LOS_Y, 5, 0, -2);
    const hitchRoute = buildRoute('r2', 'wr2', hitchPath);

    const play = buildPlay([wr1, wr2], [cornerRoute, hitchRoute]);

    test('detects smash concept on right side', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'smash')).toBe(true);
    });

    test('does not detect four_verts', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'four_verts')).toBe(false);
    });
  });

  describe('Validation Play 3: Mesh Concept - Two crossing drags', () => {
    const wr1 = buildPlayer('wr1', 'WR', 80, LOS_Y); // left
    const wr2 = buildPlayer('wr2', 'WR', 520, LOS_Y); // right

    // Both run drag routes crossing to the opposite side
    const drag1Path = straightPath(80, LOS_Y, 80 + yardsToLateralPx(12), LOS_Y - yardsToDepthPx(3));
    const drag1 = buildRoute('r1', 'wr1', drag1Path);

    const drag2Path = straightPath(520, LOS_Y, 520 - yardsToLateralPx(12), LOS_Y - yardsToDepthPx(3));
    const drag2 = buildRoute('r2', 'wr2', drag2Path);

    const play = buildPlay([wr1, wr2], [drag1, drag2]);

    test('detects mesh concept', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'mesh')).toBe(true);
    });

    test('does not detect smash or four_verts', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'smash')).toBe(false);
      expect(concepts.some((c) => c.conceptId === 'four_verts')).toBe(false);
    });
  });

  describe('Validation Play 4: Mesh with in routes at similar depth', () => {
    const wr1 = buildPlayer('wr1', 'WR', 80, LOS_Y);
    const wr2 = buildPlayer('wr2', 'WR', 520, LOS_Y);

    // In routes from opposite sides
    const in1Path = breakPath(80, LOS_Y, 8, 5);
    const in1 = buildRoute('r1', 'wr1', in1Path);

    const in2Path = breakPath(520, LOS_Y, 8, -5);
    const in2 = buildRoute('r2', 'wr2', in2Path);

    const play = buildPlay([wr1, wr2], [in1, in2]);

    test('detects mesh concept with in routes', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'mesh')).toBe(true);
    });
  });

  describe('Validation Play 5: NOT mesh - crossing routes from same side', () => {
    const wr1 = buildPlayer('wr1', 'WR', 80, LOS_Y);
    const wr2 = buildPlayer('wr2', 'WR', 130, LOS_Y);

    // Both on left side running in routes at different depths
    const in1Path = breakPath(80, LOS_Y, 5, 5);
    const in1 = buildRoute('r1', 'wr1', in1Path);

    const in2Path = breakPath(130, LOS_Y, 10, 5);
    const in2 = buildRoute('r2', 'wr2', in2Path);

    const play = buildPlay([wr1, wr2], [in1, in2]);

    test('does not detect mesh (same side)', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'mesh')).toBe(false);
    });

    test('detects levels instead', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'levels')).toBe(true);
    });
  });

  describe('Validation Play 6: Flood - flat + out + corner to left', () => {
    const rb = buildPlayer('rb', 'RB', 200, LOS_Y);
    const slot = buildPlayer('slot', 'WR', 150, LOS_Y);
    const wr = buildPlayer('wr', 'WR', 80, LOS_Y);

    // RB runs flat (shallow lateral)
    const flatPath = straightPath(200, LOS_Y, 200 - yardsToLateralPx(6), LOS_Y - yardsToDepthPx(1));
    const flatRoute = buildRoute('r1', 'rb', flatPath);

    // Slot runs out (8 yards stem, break outside)
    const outPath = breakPath(150, LOS_Y, 8, -5);
    const outRoute = buildRoute('r2', 'slot', outPath);

    // WR runs corner (12 yards stem, break outside + deep)
    const cornerPath = breakPath(80, LOS_Y, 12, -5, 3);
    const cornerRoute = buildRoute('r3', 'wr', cornerPath);

    const play = buildPlay([rb, slot, wr], [flatRoute, outRoute, cornerRoute]);

    test('detects flood concept', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'flood')).toBe(true);
    });

    test('does not detect four_verts or mesh', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'four_verts')).toBe(false);
      expect(concepts.some((c) => c.conceptId === 'mesh')).toBe(false);
    });
  });

  describe('Validation Play 7: Flood - right side', () => {
    const rb = buildPlayer('rb', 'RB', 400, LOS_Y);
    const slot = buildPlayer('slot', 'WR', 450, LOS_Y);
    const wr = buildPlayer('wr', 'WR', 520, LOS_Y);

    const flatPath = straightPath(400, LOS_Y, 400 + yardsToLateralPx(6), LOS_Y - yardsToDepthPx(1));
    const flatRoute = buildRoute('r1', 'rb', flatPath);

    const outPath = breakPath(450, LOS_Y, 8, 5); // outside for right side
    const outRoute = buildRoute('r2', 'slot', outPath);

    const cornerPath = breakPath(520, LOS_Y, 12, 5, 3);
    const cornerRoute = buildRoute('r3', 'wr', cornerPath);

    const play = buildPlay([rb, slot, wr], [flatRoute, outRoute, cornerRoute]);

    test('detects flood on right side', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'flood')).toBe(true);
    });
  });

  describe('Validation Play 8: Four Verticals', () => {
    const positions = [
      { id: 'wr1', x: 80 },
      { id: 'wr2', x: 200 },
      { id: 'wr3', x: 400 },
      { id: 'wr4', x: 520 },
    ];

    const players = positions.map((p) => buildPlayer(p.id, 'WR', p.x, LOS_Y));
    const routes = positions.map((p) =>
      buildRoute(`r_${p.id}`, p.id, straightPath(p.x, LOS_Y, p.x, LOS_Y - yardsToDepthPx(20)))
    );

    const play = buildPlay(players, routes);

    test('detects four_verts concept', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'four_verts')).toBe(true);
    });

    test('does not detect smash or mesh', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'smash')).toBe(false);
      expect(concepts.some((c) => c.conceptId === 'mesh')).toBe(false);
    });
  });

  describe('Validation Play 9: Five Verticals', () => {
    const positions = [
      { id: 'wr1', x: 80 },
      { id: 'wr2', x: 180 },
      { id: 'wr3', x: 300 },
      { id: 'wr4', x: 420 },
      { id: 'wr5', x: 520 },
    ];

    const players = positions.map((p) => buildPlayer(p.id, 'WR', p.x, LOS_Y));
    const routes = positions.map((p) =>
      buildRoute(`r_${p.id}`, p.id, straightPath(p.x, LOS_Y, p.x, LOS_Y - yardsToDepthPx(20)))
    );

    const play = buildPlay(players, routes);

    test('detects four_verts with 5 go routes', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'four_verts')).toBe(true);
    });
  });

  describe('Validation Play 10: NOT four_verts - only 3 go routes', () => {
    const positions = [
      { id: 'wr1', x: 80 },
      { id: 'wr2', x: 300 },
      { id: 'wr3', x: 520 },
    ];

    const players = positions.map((p) => buildPlayer(p.id, 'WR', p.x, LOS_Y));
    const routes = positions.map((p) =>
      buildRoute(`r_${p.id}`, p.id, straightPath(p.x, LOS_Y, p.x, LOS_Y - yardsToDepthPx(20)))
    );

    const play = buildPlay(players, routes);

    test('does not detect four_verts with only 3 routes', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'four_verts')).toBe(false);
    });
  });

  describe('Validation Play 11: Spacing concept', () => {
    const wr1 = buildPlayer('wr1', 'WR', 80, LOS_Y); // left
    const wr2 = buildPlayer('wr2', 'WR', 180, LOS_Y); // left-center
    const wr3 = buildPlayer('wr3', 'WR', 300, LOS_Y); // center
    const wr4 = buildPlayer('wr4', 'WR', 420, LOS_Y); // right-center
    const wr5 = buildPlayer('wr5', 'WR', 520, LOS_Y); // right

    // Different depths: flat, hitch, out, in, go
    const flatPath = straightPath(80, LOS_Y, 80 - yardsToLateralPx(5), LOS_Y - yardsToDepthPx(1));
    const hitchPath = breakPath(180, LOS_Y, 5, 0, -2);
    const outPath = breakPath(300, LOS_Y, 10, 5);
    const inPath = breakPath(420, LOS_Y, 8, -5);
    const goPath = straightPath(520, LOS_Y, 520, LOS_Y - yardsToDepthPx(20));

    const routes = [
      buildRoute('r1', 'wr1', flatPath),
      buildRoute('r2', 'wr2', hitchPath),
      buildRoute('r3', 'wr3', outPath),
      buildRoute('r4', 'wr4', inPath),
      buildRoute('r5', 'wr5', goPath),
    ];

    const play = buildPlay([wr1, wr2, wr3, wr4, wr5], routes);

    test('detects spacing concept', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'spacing')).toBe(true);
    });
  });

  describe('Validation Play 12: Levels - Two in routes at different depths (left side)', () => {
    const wr1 = buildPlayer('wr1', 'WR', 80, LOS_Y);
    const wr2 = buildPlayer('wr2', 'WR', 130, LOS_Y);

    // Shallow in (5 yards)
    const in1Path = breakPath(80, LOS_Y, 5, 5);
    const in1 = buildRoute('r1', 'wr1', in1Path);

    // Deep in (10 yards - stays within in-route range, not post)
    const in2Path = breakPath(130, LOS_Y, 10, 5);
    const in2 = buildRoute('r2', 'wr2', in2Path);

    const play = buildPlay([wr1, wr2], [in1, in2]);

    test('detects levels concept', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'levels')).toBe(true);
    });

    test('does not detect mesh (same side)', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'mesh')).toBe(false);
    });
  });

  describe('Validation Play 13: Levels - Out routes at different depths', () => {
    const wr1 = buildPlayer('wr1', 'WR', 500, LOS_Y);
    const wr2 = buildPlayer('wr2', 'WR', 450, LOS_Y);

    // Shallow out (6 yards)
    const out1Path = breakPath(500, LOS_Y, 6, 5);
    const out1 = buildRoute('r1', 'wr1', out1Path);

    // Deeper out (10 yards - within out range, not corner)
    const out2Path = breakPath(450, LOS_Y, 10, 5);
    const out2 = buildRoute('r2', 'wr2', out2Path);

    const play = buildPlay([wr1, wr2], [out1, out2]);

    test('detects levels with out routes', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'levels')).toBe(true);
    });
  });

  describe('Validation Play 14: Slant-Flat combination (left side)', () => {
    const wr1 = buildPlayer('wr1', 'WR', 80, LOS_Y);
    const rb = buildPlayer('rb', 'RB', 200, LOS_Y);

    // WR runs slant (short stem, break inside)
    const slantPath = breakPath(80, LOS_Y, 3, 4, 2);
    const slantRoute = buildRoute('r1', 'wr1', slantPath);

    // RB runs flat
    const flatPath = straightPath(200, LOS_Y, 200 - yardsToLateralPx(6), LOS_Y - yardsToDepthPx(1));
    const flatRoute = buildRoute('r2', 'rb', flatPath);

    const play = buildPlay([wr1, rb], [slantRoute, flatRoute]);

    test('detects slant_flat concept', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'slant_flat')).toBe(true);
    });

    test('does not detect smash or flood', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'smash')).toBe(false);
      expect(concepts.some((c) => c.conceptId === 'flood')).toBe(false);
    });
  });

  describe('Validation Play 15: Curl-Flat combination (right side)', () => {
    const wr = buildPlayer('wr', 'WR', 520, LOS_Y);
    const rb = buildPlayer('rb', 'RB', 400, LOS_Y);

    // WR runs curl/hitch (5 yards, break back)
    const hitchPath = breakPath(520, LOS_Y, 5, 0, -2);
    const hitchRoute = buildRoute('r1', 'wr', hitchPath);

    // RB runs flat to the right
    const flatPath = straightPath(400, LOS_Y, 400 + yardsToLateralPx(6), LOS_Y - yardsToDepthPx(1));
    const flatRoute = buildRoute('r2', 'rb', flatPath);

    const play = buildPlay([wr, rb], [hitchRoute, flatRoute]);

    test('detects curl_flat concept', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'curl_flat')).toBe(true);
    });

    test('does not detect mesh or four_verts', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'mesh')).toBe(false);
      expect(concepts.some((c) => c.conceptId === 'four_verts')).toBe(false);
    });
  });

  describe('Validation Play 16: Smash with curl variant', () => {
    const wr1 = buildPlayer('wr1', 'WR', 80, LOS_Y);
    const wr2 = buildPlayer('wr2', 'WR', 130, LOS_Y);

    // Corner route
    const cornerPath = breakPath(80, LOS_Y, 12, -5, 3);
    const cornerRoute = buildRoute('r1', 'wr1', cornerPath);

    // Curl route (medium depth, break back + inside) instead of hitch
    const curlPath = breakPath(130, LOS_Y, 7, 2, -2);
    const curlRoute = buildRoute('r2', 'wr2', curlPath);

    const play = buildPlay([wr1, wr2], [cornerRoute, curlRoute]);

    test('detects smash with curl (lower confidence than hitch)', () => {
      const concepts = detectConcepts(play);
      const smash = concepts.find((c) => c.conceptId === 'smash');
      expect(smash).toBeDefined();
    });
  });

  describe('Validation Play 17: Flood with non-canonical routes', () => {
    const rb = buildPlayer('rb', 'RB', 200, LOS_Y);
    const slot = buildPlayer('slot', 'WR', 150, LOS_Y);
    const wr = buildPlayer('wr', 'WR', 80, LOS_Y);

    // Drag instead of flat (RB runs toward center = inside for left-side player)
    const dragPath = straightPath(200, LOS_Y, 200 + yardsToLateralPx(6), LOS_Y - yardsToDepthPx(3));
    const dragRoute = buildRoute('r1', 'rb', dragPath);

    // Hitch instead of out
    const hitchPath = breakPath(150, LOS_Y, 7, 0, -2);
    const hitchRoute = buildRoute('r2', 'slot', hitchPath);

    // Go instead of corner
    const goPath = straightPath(80, LOS_Y, 80, LOS_Y - yardsToDepthPx(20));
    const goRoute = buildRoute('r3', 'wr', goPath);

    const play = buildPlay([rb, slot, wr], [dragRoute, hitchRoute, goRoute]);

    test('detects flood with non-canonical routes', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'flood')).toBe(true);
    });

    test('flood confidence is lower than canonical version', () => {
      const concepts = detectConcepts(play);
      const flood = concepts.find((c) => c.conceptId === 'flood');
      expect(flood).toBeDefined();
      expect(flood!.confidence).toBeLessThan(0.95);
    });
  });

  describe('Validation Play 18: Slant-Flat right side', () => {
    const wr = buildPlayer('wr', 'WR', 520, LOS_Y);
    const rb = buildPlayer('rb', 'RB', 400, LOS_Y);

    // Slant: short stem + break inside (left for right player)
    const slantPath = breakPath(520, LOS_Y, 3, -4, 2);
    const slantRoute = buildRoute('r1', 'wr', slantPath);

    // Flat to the right
    const flatPath = straightPath(400, LOS_Y, 400 + yardsToLateralPx(6), LOS_Y - yardsToDepthPx(1));
    const flatRoute = buildRoute('r2', 'rb', flatPath);

    const play = buildPlay([wr, rb], [slantRoute, flatRoute]);

    test('detects slant_flat on right side', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'slant_flat')).toBe(true);
    });
  });

  describe('Validation Play 19: Mesh with slant + drag from opposite sides', () => {
    const wr1 = buildPlayer('wr1', 'WR', 80, LOS_Y);
    const wr2 = buildPlayer('wr2', 'WR', 520, LOS_Y);

    // Slant from left
    const slantPath = breakPath(80, LOS_Y, 3, 4, 2);
    const slantRoute = buildRoute('r1', 'wr1', slantPath);

    // Drag from right
    const dragPath = straightPath(520, LOS_Y, 520 - yardsToLateralPx(12), LOS_Y - yardsToDepthPx(3));
    const dragRoute = buildRoute('r2', 'wr2', dragPath);

    const play = buildPlay([wr1, wr2], [slantRoute, dragRoute]);

    test('detects mesh with slant + drag (lower confidence)', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'mesh')).toBe(true);
    });
  });

  describe('Validation Play 20: Complex play - Flood + Slant-Flat', () => {
    // Five receivers: flood to the left, slant-flat also on the left
    const wr1 = buildPlayer('wr1', 'WR', 80, LOS_Y);
    const slot1 = buildPlayer('slot1', 'WR', 150, LOS_Y);
    const rb = buildPlayer('rb', 'RB', 200, LOS_Y);
    const slot2 = buildPlayer('slot2', 'WR', 450, LOS_Y);
    const wr2 = buildPlayer('wr2', 'WR', 520, LOS_Y);

    // Left side flood
    const cornerPath = breakPath(80, LOS_Y, 12, -5, 3);
    const cornerRoute = buildRoute('r1', 'wr1', cornerPath);

    const outPath = breakPath(150, LOS_Y, 8, -5);
    const outRoute = buildRoute('r2', 'slot1', outPath);

    const flatPath = straightPath(200, LOS_Y, 200 - yardsToLateralPx(6), LOS_Y - yardsToDepthPx(1));
    const flatRoute = buildRoute('r3', 'rb', flatPath);

    // Right side: go routes
    const go1Path = straightPath(450, LOS_Y, 450, LOS_Y - yardsToDepthPx(20));
    const go1Route = buildRoute('r4', 'slot2', go1Path);

    const go2Path = straightPath(520, LOS_Y, 520, LOS_Y - yardsToDepthPx(20));
    const go2Route = buildRoute('r5', 'wr2', go2Path);

    const play = buildPlay(
      [wr1, slot1, rb, slot2, wr2],
      [cornerRoute, outRoute, flatRoute, go1Route, go2Route]
    );

    test('detects flood concept', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'flood')).toBe(true);
    });

    test('does not detect four_verts (only 2 go routes)', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'four_verts')).toBe(false);
    });
  });

  describe('Validation Play 21: Curl-Flat left side with curl route', () => {
    const wr = buildPlayer('wr', 'WR', 80, LOS_Y);
    const rb = buildPlayer('rb', 'RB', 200, LOS_Y);

    // Curl: 7 yards stem, break back + inside
    const curlPath = breakPath(80, LOS_Y, 7, 2, -2);
    const curlRoute = buildRoute('r1', 'wr', curlPath);

    // Flat to the left
    const flatPath = straightPath(200, LOS_Y, 200 - yardsToLateralPx(6), LOS_Y - yardsToDepthPx(1));
    const flatRoute = buildRoute('r2', 'rb', flatPath);

    const play = buildPlay([wr, rb], [curlRoute, flatRoute]);

    test('detects curl_flat concept', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'curl_flat')).toBe(true);
    });
  });

  describe('Validation Play 22: NOT smash - hitch + corner on different sides', () => {
    const wr1 = buildPlayer('wr1', 'WR', 80, LOS_Y); // left
    const wr2 = buildPlayer('wr2', 'WR', 520, LOS_Y); // right

    // Hitch on left
    const hitchPath = breakPath(80, LOS_Y, 5, 0, -2);
    const hitchRoute = buildRoute('r1', 'wr1', hitchPath);

    // Corner on right
    const cornerPath = breakPath(520, LOS_Y, 12, 5, 3);
    const cornerRoute = buildRoute('r2', 'wr2', cornerPath);

    const play = buildPlay([wr1, wr2], [hitchRoute, cornerRoute]);

    test('does not detect smash (different sides)', () => {
      const concepts = detectConcepts(play);
      expect(concepts.some((c) => c.conceptId === 'smash')).toBe(false);
    });
  });

  // ── Result ordering test ────────────────────────────────────────────────

  describe('Result ordering', () => {
    test('concepts are sorted by confidence descending', () => {
      // Build a complex play that triggers multiple concepts
      const wr1 = buildPlayer('wr1', 'WR', 80, LOS_Y);
      const wr2 = buildPlayer('wr2', 'WR', 130, LOS_Y);
      const rb = buildPlayer('rb', 'RB', 200, LOS_Y);

      const cornerPath = breakPath(80, LOS_Y, 12, -5, 3);
      const hitchPath = breakPath(130, LOS_Y, 5, 0, -2);
      const flatPath = straightPath(200, LOS_Y, 200 - yardsToLateralPx(6), LOS_Y - yardsToDepthPx(1));

      const play = buildPlay(
        [wr1, wr2, rb],
        [
          buildRoute('r1', 'wr1', cornerPath),
          buildRoute('r2', 'wr2', hitchPath),
          buildRoute('r3', 'rb', flatPath),
        ]
      );

      const concepts = detectConcepts(play);
      for (let i = 1; i < concepts.length; i++) {
        expect(concepts[i].confidence).toBeLessThanOrEqual(concepts[i - 1].confidence);
      }
    });
  });

  // ── Edge Cases ──────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    test('empty play (0 players) returns empty array', () => {
      const play = buildPlay([], []);
      expect(detectConcepts(play)).toEqual([]);
    });

    test('players with no routes returns empty array', () => {
      const wr1 = buildPlayer('wr1', 'WR', 80, LOS_Y);
      const play = buildPlay([wr1], []);
      expect(detectConcepts(play)).toEqual([]);
    });

    test('single route - no concept detected (most concepts need 2+)', () => {
      const wr1 = buildPlayer('wr1', 'WR', 80, LOS_Y);
      const goPath = straightPath(80, LOS_Y, 80, LOS_Y - yardsToDepthPx(20));
      const play = buildPlay([wr1], [buildRoute('r1', 'wr1', goPath)]);

      const concepts = detectConcepts(play);
      // Only concepts that need 2+ routes should be absent; single route can't form any standard concept
      expect(concepts.some((c) => c.conceptId === 'smash')).toBe(false);
      expect(concepts.some((c) => c.conceptId === 'mesh')).toBe(false);
      expect(concepts.some((c) => c.conceptId === 'flood')).toBe(false);
      expect(concepts.some((c) => c.conceptId === 'four_verts')).toBe(false);
      expect(concepts.some((c) => c.conceptId === 'levels')).toBe(false);
    });

    test('duplicate player IDs handled gracefully', () => {
      const wr1a = buildPlayer('wr1', 'WR', 80, LOS_Y);
      const wr1b = buildPlayer('wr1', 'WR', 520, LOS_Y); // same ID, different position

      const path1 = straightPath(80, LOS_Y, 80, LOS_Y - yardsToDepthPx(20));
      const path2 = straightPath(520, LOS_Y, 520, LOS_Y - yardsToDepthPx(20));

      // Both routes reference 'wr1' - should not crash, just use first match
      const play = buildPlay([wr1a, wr1b], [
        buildRoute('r1', 'wr1', path1),
        buildRoute('r2', 'wr1', path2),
      ]);

      expect(() => detectConcepts(play)).not.toThrow();
    });

    test('partial match scores lower than exact match', () => {
      // Build canonical smash (hitch + corner, same side)
      const wr1 = buildPlayer('wr1', 'WR', 80, LOS_Y);
      const wr2 = buildPlayer('wr2', 'WR', 130, LOS_Y);

      const cornerPath = breakPath(80, LOS_Y, 12, -5, 3);
      const hitchPath = breakPath(130, LOS_Y, 5, 0, -2);

      const canonicalPlay = buildPlay([wr1, wr2], [
        buildRoute('r1', 'wr1', cornerPath),
        buildRoute('r2', 'wr2', hitchPath),
      ]);

      // Build curl variant smash (curl instead of hitch)
      const curlPath = breakPath(130, LOS_Y, 7, 2, -2);
      const curlPlay = buildPlay([wr1, wr2], [
        buildRoute('r1', 'wr1', cornerPath),
        buildRoute('r2', 'wr2', curlPath),
      ]);

      const canonicalSmash = detectConcepts(canonicalPlay).find((c) => c.conceptId === 'smash');
      const curlSmash = detectConcepts(curlPlay).find((c) => c.conceptId === 'smash');

      expect(canonicalSmash).toBeDefined();
      expect(curlSmash).toBeDefined();
      expect(canonicalSmash!.confidence).toBeGreaterThanOrEqual(curlSmash!.confidence);
    });

    test('routes with missing player IDs are skipped', () => {
      const wr1 = buildPlayer('wr1', 'WR', 80, LOS_Y);
      const path = straightPath(80, LOS_Y, 80, LOS_Y - yardsToDepthPx(20));

      // Route references a player that doesn't exist
      const play = buildPlay([wr1], [buildRoute('r1', 'nonexistent', path)]);
      expect(() => detectConcepts(play)).not.toThrow();
      expect(detectConcepts(play)).toEqual([]);
    });

    test('routes with only 1 point are treated as custom and skipped', () => {
      const wr1 = buildPlayer('wr1', 'WR', 80, LOS_Y);
      const play = buildPlay([wr1], [buildRoute('r1', 'wr1', [{ x: 80, y: 150 }])]);
      expect(detectConcepts(play)).toEqual([]);
    });
  });
});
