import { describe, it, expect } from 'vitest';
import { loadOffensiveEngineData } from '../engine';
import { validateFormation, validateRoute, validateConcept, validateSpacingRule, validateTimingRule } from '../validators';
import { detectConcept, PlayRouteInstance } from '../conceptDetection';
import { checkVerticalSpacing, PositionedRoutePoint } from '../spacingEngine';
import { formations, routes, concepts, spacingRules, timingRules } from '../data.moderate';

describe('Offensive Engine - Data Validation', () => {
  it('all formations pass validation', () => {
    formations.forEach((f) => {
      const errors = validateFormation(f);
      expect(errors).toEqual([]);
    });
  });

  it('all routes pass validation', () => {
    routes.forEach((r) => {
      const errors = validateRoute(r);
      expect(errors).toEqual([]);
    });
  });

  it('all concepts pass validation', () => {
    concepts.forEach((c) => {
      const errors = validateConcept(c);
      expect(errors).toEqual([]);
    });
  });

  it('all spacing rules pass validation', () => {
    spacingRules.forEach((s) => {
      const errors = validateSpacingRule(s);
      expect(errors).toEqual([]);
    });
  });

  it('all timing rules pass validation', () => {
    timingRules.forEach((t) => {
      const errors = validateTimingRule(t);
      expect(errors).toEqual([]);
    });
  });

  it('rejects invalid formation', () => {
    const bad = { formation_id: '', formation_name: '', alignment: { left_side: [], right_side: [], backfield: [] }, spacing: { wr_splits: [], ol_splits: [], rb_depth: 0 }, strength: 'left' as const, coverage_stress_points: [], personnel: '' };
    expect(validateFormation(bad).length).toBeGreaterThan(0);
  });

  it('rejects invalid route', () => {
    const bad = { route_id: '', route_number: -1, route_name: '', depth_yards: 0, break_direction: 'inside' as const, stem: '', timing_second: 0 };
    expect(validateRoute(bad).length).toBeGreaterThan(0);
  });
});

describe('Offensive Engine - Loader', () => {
  it('loadOffensiveEngineData returns all data categories', () => {
    const data = loadOffensiveEngineData();
    expect(data.formations.length).toBeGreaterThan(0);
    expect(data.routes.length).toBeGreaterThan(0);
    expect(data.concepts.length).toBeGreaterThan(0);
    expect(data.spacingRules.length).toBeGreaterThan(0);
    expect(data.timingRules.length).toBeGreaterThan(0);
  });

  it('returns cached data on second call', () => {
    const first = loadOffensiveEngineData();
    const second = loadOffensiveEngineData();
    expect(first).toBe(second); // Same reference = cached
  });
});

describe('Concept Detection', () => {
  const allConcepts = loadOffensiveEngineData().concepts;

  it('detects Mesh when 2+ shallow routes present', () => {
    const playRoutes: PlayRouteInstance[] = [
      { playerId: 'p1', routeName: 'Shallow Cross' },
      { playerId: 'p2', routeName: 'Shallow Cross' },
      { playerId: 'p3', routeName: 'Go' },
    ];
    const result = detectConcept(playRoutes, allConcepts);
    expect(result).not.toBeNull();
    expect(result!.concept_name).toBe('Mesh');
  });

  it('detects Smash when hitch + corner present', () => {
    const playRoutes: PlayRouteInstance[] = [
      { playerId: 'p1', routeName: 'Hitch' },
      { playerId: 'p2', routeName: 'Corner' },
    ];
    const result = detectConcept(playRoutes, allConcepts);
    expect(result).not.toBeNull();
    expect(result!.concept_name).toBe('Smash');
  });

  it('detects Four Verts when 4+ go/vert routes', () => {
    const playRoutes: PlayRouteInstance[] = [
      { playerId: 'p1', routeName: 'Go' },
      { playerId: 'p2', routeName: 'Go' },
      { playerId: 'p3', routeName: 'Vert' },
      { playerId: 'p4', routeName: 'Go' },
    ];
    const result = detectConcept(playRoutes, allConcepts);
    expect(result).not.toBeNull();
    expect(result!.concept_name).toBe('Four Verticals');
  });

  it('returns null for unrecognized combinations', () => {
    const playRoutes: PlayRouteInstance[] = [
      { playerId: 'p1', routeName: 'Slant' },
      { playerId: 'p2', routeName: 'Post' },
    ];
    const result = detectConcept(playRoutes, allConcepts);
    expect(result).toBeNull();
  });

  it('returns null for empty routes', () => {
    expect(detectConcept([], allConcepts)).toBeNull();
  });
});

describe('Spacing Engine', () => {
  const rules = loadOffensiveEngineData().spacingRules;

  it('flags routes that are too close vertically', () => {
    const points: PositionedRoutePoint[] = [
      { routeId: 'r1', x: 5, y: 10 },
      { routeId: 'r2', x: 6, y: 12 }, // Only 2 yards apart vertically, within 5 yards horizontally
    ];
    const warnings = checkVerticalSpacing(points, rules);
    expect(warnings.length).toBe(1);
    expect(warnings[0].type).toBe('route_convergence');
  });

  it('no warnings when routes are properly spaced', () => {
    const points: PositionedRoutePoint[] = [
      { routeId: 'r1', x: 5, y: 5 },
      { routeId: 'r2', x: 6, y: 12 }, // 7 yards apart — outside min_value of 4
    ];
    const warnings = checkVerticalSpacing(points, rules);
    expect(warnings.length).toBe(0);
  });

  it('no warnings when routes are far apart horizontally', () => {
    const points: PositionedRoutePoint[] = [
      { routeId: 'r1', x: 0, y: 10 },
      { routeId: 'r2', x: 20, y: 11 }, // Close vertically but >5 yards apart horizontally
    ];
    const warnings = checkVerticalSpacing(points, rules);
    expect(warnings.length).toBe(0);
  });

  it('handles empty input', () => {
    expect(checkVerticalSpacing([], rules).length).toBe(0);
  });
});
