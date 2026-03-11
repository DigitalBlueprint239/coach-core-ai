/**
 * conceptAssignment.test.js – Tests for concept-to-route batch assignment
 */

import {
  isEligibleReceiver,
  assignConcept,
  buildConceptRoutes,
  generateRoutePoints,
  CONCEPTS,
  CONCEPT_LIST,
} from '../utils/conceptAssignment';
import { createPlayer } from '../PlayController';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePlayer(position, x, y, number = 80) {
  return createPlayer(x, y, position, number);
}

// Standard 11-player shotgun formation centered at x=400, y=300
function makeShotgunPlayers(centerX = 400) {
  const s = 48;
  return [
    makePlayer('LT', centerX - s * 2, 300, 76),
    makePlayer('LG', centerX - s,     300, 66),
    makePlayer('C',  centerX,         300, 55),
    makePlayer('RG', centerX + s,     300, 67),
    makePlayer('RT', centerX + s * 2, 300, 77),
    makePlayer('QB', centerX,         356, 12),
    makePlayer('RB', centerX - s,     372, 21),
    makePlayer('WR', centerX - s * 4, 300, 80), // far left
    makePlayer('WR', centerX + s * 4, 300, 81), // far right
    makePlayer('WR', centerX - s * 2.5, 268, 11), // slot left
    makePlayer('TE', centerX + s * 2.5, 332, 88), // slot right / TE
  ];
}

// ── isEligibleReceiver ────────────────────────────────────────────────────────

describe('isEligibleReceiver', () => {
  it('WR is eligible', () => {
    expect(isEligibleReceiver({ position: 'WR' })).toBe(true);
  });

  it('TE is eligible', () => {
    expect(isEligibleReceiver({ position: 'TE' })).toBe(true);
  });

  it('RB is eligible', () => {
    expect(isEligibleReceiver({ position: 'RB' })).toBe(true);
  });

  it('QB is eligible', () => {
    expect(isEligibleReceiver({ position: 'QB' })).toBe(true);
  });

  it('OL (LT, LG, C, RG, RT) are not eligible', () => {
    ['LT', 'LG', 'C', 'RG', 'RT'].forEach(pos => {
      expect(isEligibleReceiver({ position: pos })).toBe(false);
    });
  });

  it('defensive positions are not eligible', () => {
    ['DE', 'DT', 'MLB', 'CB', 'FS', 'SS'].forEach(pos => {
      expect(isEligibleReceiver({ position: pos })).toBe(false);
    });
  });
});

// ── generateRoutePoints ───────────────────────────────────────────────────────

describe('generateRoutePoints', () => {
  it('returns at least 2 points for all route types', () => {
    const player = { x: 200, y: 300 };
    const routeTypes = ['hitch', 'slant', 'post', 'corner', 'out', 'in', 'go', 'custom', 'screen', 'cross', 'wheel', 'drive'];
    routeTypes.forEach(type => {
      const pts = generateRoutePoints(type, player);
      expect(pts.length).toBeGreaterThanOrEqual(2);
      pts.forEach(pt => {
        expect(typeof pt.x).toBe('number');
        expect(typeof pt.y).toBe('number');
      });
    });
  });

  it('first point matches player position', () => {
    const player = { x: 150, y: 250 };
    const pts = generateRoutePoints('hitch', player);
    expect(pts[0]).toEqual({ x: 150, y: 250 });
  });

  it('mirrors correctly for left-side players (isLeft = true)', () => {
    const player = { x: 100, y: 200 };
    const ptsLeft = generateRoutePoints('slant', player, true);
    const ptsRight = generateRoutePoints('slant', player, false);
    // The break direction should differ
    const breakLeft = ptsLeft[ptsLeft.length - 1].x;
    const breakRight = ptsRight[ptsRight.length - 1].x;
    expect(breakLeft).not.toBe(breakRight);
  });

  it('go route goes straight upfield (y decreases)', () => {
    const player = { x: 200, y: 300 };
    const pts = generateRoutePoints('go', player);
    expect(pts[pts.length - 1].y).toBeLessThan(player.y);
  });

  it('unknown route type falls back to custom', () => {
    const player = { x: 200, y: 200 };
    const pts = generateRoutePoints('unknown_type', player);
    expect(pts.length).toBeGreaterThanOrEqual(2);
  });
});

// ── assignConcept ─────────────────────────────────────────────────────────────

describe('assignConcept', () => {
  const players = makeShotgunPlayers(400);

  it('returns empty array for unknown concept', () => {
    const result = assignConcept('no_such_concept', players, 400);
    expect(result).toEqual([]);
  });

  it('Smash assigns corner to outermost receiver', () => {
    const result = assignConcept('smash', players, 400);
    const cornerAssignment = result.find(a => a.routeType === 'corner');
    expect(cornerAssignment).toBeTruthy();
    // outside_right should be the rightmost WR (x = 400 + 48*4 = 592)
    expect(cornerAssignment.player.x).toBeGreaterThan(400);
  });

  it('Smash assigns hitch to inside receiver', () => {
    const result = assignConcept('smash', players, 400);
    const hitchAssignment = result.find(a => a.routeType === 'hitch');
    expect(hitchAssignment).toBeTruthy();
  });

  it('Smash returns 2 assignments', () => {
    const result = assignConcept('smash', players, 400);
    expect(result.length).toBe(2);
  });

  it('Mesh assigns cross routes to two receivers', () => {
    const result = assignConcept('mesh', players, 400);
    const crossRoutes = result.filter(a => a.routeType === 'cross');
    expect(crossRoutes.length).toBe(2);
  });

  it('Four Verts assigns go routes to 4 receivers', () => {
    const result = assignConcept('four_verts', players, 400);
    expect(result.length).toBe(4);
    result.forEach(a => {
      expect(a.routeType).toBe('go');
    });
  });

  it('Four Verts does not assign duplicate players', () => {
    const result = assignConcept('four_verts', players, 400);
    const ids = result.map(a => a.player.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('Flood assigns routes on right side', () => {
    const result = assignConcept('flood', players, 400);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it('Spacing assigns hitch to multiple receivers', () => {
    const result = assignConcept('spacing', players, 400);
    result.forEach(a => {
      expect(a.routeType).toBe('hitch');
    });
    expect(result.length).toBeGreaterThan(0);
  });

  it('concept assignment respects player X positions', () => {
    const leftWR = makePlayer('WR', 100, 300, 80);
    const rightWR = makePlayer('WR', 700, 300, 81);
    const simplePlayers = [leftWR, rightWR];
    const result = assignConcept('smash', simplePlayers, 400);
    // outside_right (corner) should be assigned to rightWR
    const cornerAssignment = result.find(a => a.routeType === 'corner');
    expect(cornerAssignment?.player.id).toBe(rightWR.id);
  });

  it('returns empty array when no eligible receivers', () => {
    const olPlayers = [
      makePlayer('LT', 200, 300, 76),
      makePlayer('C',  400, 300, 55),
      makePlayer('RT', 600, 300, 77),
    ];
    const result = assignConcept('smash', olPlayers, 400);
    expect(result).toEqual([]);
  });
});

// ── buildConceptRoutes ────────────────────────────────────────────────────────

describe('buildConceptRoutes', () => {
  const players = makeShotgunPlayers(400);

  it('returns route objects with correct structure', () => {
    const routes = buildConceptRoutes('smash', players, 400);
    routes.forEach(route => {
      expect(route).toHaveProperty('id');
      expect(route).toHaveProperty('playerId');
      expect(route).toHaveProperty('points');
      expect(Array.isArray(route.points)).toBe(true);
      expect(route.points.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('each route has at least 2 waypoints', () => {
    const routes = buildConceptRoutes('four_verts', players, 400);
    routes.forEach(route => {
      expect(route.points.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('returns empty array for empty players', () => {
    const routes = buildConceptRoutes('smash', [], 400);
    expect(routes).toEqual([]);
  });

  it('Four Verts creates 4 routes', () => {
    const routes = buildConceptRoutes('four_verts', players, 400);
    expect(routes.length).toBe(4);
  });
});

// ── CONCEPTS data ─────────────────────────────────────────────────────────────

describe('CONCEPTS data', () => {
  it('has at least 5 concepts defined', () => {
    expect(Object.keys(CONCEPTS).length).toBeGreaterThanOrEqual(5);
  });

  it('each concept has id, name, description, and routes array', () => {
    Object.values(CONCEPTS).forEach(concept => {
      expect(concept).toHaveProperty('id');
      expect(concept).toHaveProperty('name');
      expect(concept).toHaveProperty('description');
      expect(Array.isArray(concept.routes)).toBe(true);
      expect(concept.routes.length).toBeGreaterThan(0);
    });
  });

  it('CONCEPT_LIST is an array with the same entries', () => {
    expect(Array.isArray(CONCEPT_LIST)).toBe(true);
    expect(CONCEPT_LIST.length).toBe(Object.keys(CONCEPTS).length);
  });

  it('smash concept targets corner and hitch routes', () => {
    const smash = CONCEPTS['smash'];
    const routeTypes = smash.routes.map(r => r.routeType);
    expect(routeTypes).toContain('corner');
    expect(routeTypes).toContain('hitch');
  });

  it('four_verts concept uses only go routes', () => {
    const fourVerts = CONCEPTS['four_verts'];
    fourVerts.routes.forEach(r => {
      expect(r.routeType).toBe('go');
    });
  });
});
