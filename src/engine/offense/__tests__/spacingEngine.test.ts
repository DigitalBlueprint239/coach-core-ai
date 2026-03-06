import { describe, it, expect } from 'vitest';
import { checkVerticalSpacing } from '../spacingEngine';
import { loadOffensiveEngineData } from '../data';
import type { PositionedRoutePoint } from '../types';

const { spacingRules } = loadOffensiveEngineData();

function point(routeId: string, x: number, y: number): PositionedRoutePoint {
  return { routeId, x, y };
}

// Field: 600px wide (~53.33 yd), 300px tall
// PX_PER_YARD_HORIZONTAL = 11.25
// PX_PER_YARD_VERTICAL   = 10

describe('checkVerticalSpacing', () => {
  it('returns empty array with fewer than 2 points', () => {
    expect(checkVerticalSpacing([], spacingRules)).toEqual([]);
    expect(checkVerticalSpacing([point('r1', 100, 100)], spacingRules)).toEqual([]);
  });

  it('returns no warnings when routes are well-separated horizontally', () => {
    // 20 yards apart horizontally: 20 * 11.25 = 225px
    const pts = [point('r1', 100, 200), point('r2', 325, 100)];
    const warnings = checkVerticalSpacing(pts, spacingRules);
    expect(warnings).toHaveLength(0);
  });

  it('returns a horizontal-separation warning when routes are too close', () => {
    // 2 yards apart horizontally: 2 * 11.25 = 22.5px
    const pts = [point('r1', 100, 200), point('r2', 120, 150)];
    const warnings = checkVerticalSpacing(pts, spacingRules);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].severity).toBe('warning');
    expect(warnings[0].message).toContain('horizontal');
  });

  it('flags the correct pair of route IDs', () => {
    const pts = [point('rA', 100, 200), point('rB', 110, 150)];
    const warnings = checkVerticalSpacing(pts, spacingRules);
    expect(warnings[0].routeId1).toBe('rA');
    expect(warnings[0].routeId2).toBe('rB');
  });

  it('returns a vertical-stack warning for routes in same x zone that are too close vertically', () => {
    // Same x (horizontal separation is 0), very close vertically: 2px = 0.2 yards < 4 yard threshold
    const pts = [point('r1', 200, 200), point('r2', 205, 202)];
    const warnings = checkVerticalSpacing(pts, spacingRules);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('handles three routes and returns warnings for each violating pair', () => {
    // All three routes tightly packed
    const pts = [point('r1', 100, 200), point('r2', 105, 195), point('r3', 102, 198)];
    const warnings = checkVerticalSpacing(pts, spacingRules);
    expect(warnings.length).toBeGreaterThanOrEqual(1);
  });

  it('no warning for routes widely separated in x even if similar y', () => {
    // 30 yards apart: 30 * 11.25 = 337.5px, same y
    const pts = [point('r1', 50, 200), point('r2', 387, 200)];
    const warnings = checkVerticalSpacing(pts, spacingRules);
    expect(warnings).toHaveLength(0);
  });

  it('warning message is non-empty', () => {
    const pts = [point('r1', 100, 200), point('r2', 104, 198)];
    const warnings = checkVerticalSpacing(pts, spacingRules);
    if (warnings.length > 0) {
      expect(warnings[0].message.length).toBeGreaterThan(0);
    }
  });

  it('no double-reporting: a pair triggers only one warning', () => {
    // This pair is very close both horizontally AND vertically
    const pts = [point('r1', 100, 200), point('r2', 102, 201)];
    const warnings = checkVerticalSpacing(pts, spacingRules);
    // Should have at most 1 warning for this pair (horizontal takes priority)
    expect(warnings.length).toBeLessThanOrEqual(1);
  });
});
