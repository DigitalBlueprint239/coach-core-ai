/**
 * spacingEngine.ts - Validates route spacing and detects convergence issues
 * Checks both vertical and horizontal spacing between route endpoints.
 */

import { PositionedRoutePoint, SpacingWarning, SpacingRule } from './schema';

/**
 * Checks vertical spacing between route endpoints.
 * Routes that converge too closely at similar depths create coverage windows
 * that defenders can bracket.
 *
 * @param points - Array of positioned route endpoints (in yards)
 * @param rules - Spacing rules to validate against
 * @returns Array of spacing warnings
 */
export function checkVerticalSpacing(
  points: PositionedRoutePoint[],
  rules: SpacingRule[],
): SpacingWarning[] {
  const rule = rules.find(r => r.parameter === 'vertical_separation_yards');
  if (!rule) return [];

  const warnings: SpacingWarning[] = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = Math.abs(points[i].x - points[j].x);
      const dy = Math.abs(points[i].y - points[j].y);

      // Only flag vertical convergence when routes are also horizontally close (within 8 yards)
      if (dx < 8 && dy < rule.min_value) {
        warnings.push({
          type: 'vertical_convergence',
          message: `Routes are too close vertically (${dy.toFixed(1)} yds apart, ${dx.toFixed(1)} yds lateral). Target: ${rule.min_value}+ yds vertical separation.`,
          involvedRouteIds: [points[i].routeId, points[j].routeId],
        });
      }
    }
  }
  return warnings;
}

/**
 * Checks horizontal spacing between route endpoints at similar depths.
 * Routes at similar depths that are too close horizontally create
 * stacked coverage problems.
 *
 * @param points - Array of positioned route endpoints (in yards)
 * @param rules - Spacing rules to validate against
 * @returns Array of spacing warnings
 */
export function checkHorizontalSpacing(
  points: PositionedRoutePoint[],
  rules: SpacingRule[],
): SpacingWarning[] {
  const rule = rules.find(r => r.parameter === 'horizontal_separation_yards');
  if (!rule) return [];

  const warnings: SpacingWarning[] = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dy = Math.abs(points[i].y - points[j].y);
      const dx = Math.abs(points[i].x - points[j].x);

      // Only check horizontal spacing if they are at similar depths (within 3 yards)
      if (dy < 3 && dx < rule.min_value) {
        warnings.push({
          type: 'horizontal_overlap',
          message: `Routes are too close horizontally (${dx.toFixed(1)} yds apart at similar depth). Target: ${rule.min_value}+ yds.`,
          involvedRouteIds: [points[i].routeId, points[j].routeId],
        });
      }
    }
  }
  return warnings;
}

/**
 * Runs all spacing checks and returns combined warnings.
 */
export function checkAllSpacing(
  points: PositionedRoutePoint[],
  rules: SpacingRule[],
): SpacingWarning[] {
  if (points.length < 2) return [];

  return [
    ...checkVerticalSpacing(points, rules),
    ...checkHorizontalSpacing(points, rules),
  ];
}
