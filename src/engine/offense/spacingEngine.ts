import type { PositionedRoutePoint, SpacingRule, SpacingWarning } from './types';

// Field coordinate constants — the SmartPlaybook field is 600×300 px.
// Horizontal: 600px ≈ 53.33 yards → ~11.25 px/yd
// Vertical:   we treat 10 px ≈ 1 yard for route depth calculations
const PX_PER_YARD_HORIZONTAL = 11.25;
const PX_PER_YARD_VERTICAL = 10;

function pxToYardsH(px: number): number {
  return px / PX_PER_YARD_HORIZONTAL;
}

function pxToYardsV(px: number): number {
  return px / PX_PER_YARD_VERTICAL;
}

/**
 * Check whether any two route endpoints are closer than the spacing rules allow.
 *
 * For each pair of route endpoints:
 *   - If they are close horizontally (< sp1 threshold) → horizontal-separation warning
 *   - If they are close vertically with similar x (< sp2 threshold) → vertical-stack warning
 *
 * Returns an array of SpacingWarning objects (may be empty).
 */
export function checkVerticalSpacing(
  points: PositionedRoutePoint[],
  rules: SpacingRule[]
): SpacingWarning[] {
  const warnings: SpacingWarning[] = [];
  if (points.length < 2) return warnings;

  const horizRule = rules.find(r => r.context === 'horizontal-separation');
  const vertRule = rules.find(r => r.context === 'vertical-stack');

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const a = points[i];
      const b = points[j];

      const dxYards = Math.abs(pxToYardsH(a.x - b.x));
      const dyYards = Math.abs(pxToYardsV(a.y - b.y));

      // Horizontal convergence check
      if (horizRule && dxYards < horizRule.min_yards_apart) {
        warnings.push({
          routeId1: a.routeId,
          routeId2: b.routeId,
          message: horizRule.message,
          severity: 'warning',
        });
        continue; // don't double-report the same pair
      }

      // Vertical stack check (only when routes are in similar x zones)
      if (vertRule && dxYards < 8 && dyYards < vertRule.min_yards_apart) {
        warnings.push({
          routeId1: a.routeId,
          routeId2: b.routeId,
          message: vertRule.message,
          severity: 'warning',
        });
      }
    }
  }

  return warnings;
}

/**
 * Convert pixel coordinates to yards for external use / testing.
 */
export { pxToYardsH, pxToYardsV };
