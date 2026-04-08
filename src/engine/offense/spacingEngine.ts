import { SpacingRule } from './schema';

export interface PositionedRoutePoint {
  routeId: string;
  x: number;
  y: number;
}

export interface SpacingWarning {
  type: 'route_convergence' | 'horizontal_overlap';
  message: string;
  involvedRouteIds: string[];
}

export function checkVerticalSpacing(
  points: PositionedRoutePoint[],
  rules: SpacingRule[],
): SpacingWarning[] {
  const rule = rules.find(
    (r) => r.parameter === 'vertical_separation_yards',
  );
  if (!rule) return [];

  const warnings: SpacingWarning[] = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dy = Math.abs(points[i].y - points[j].y);
      const dx = Math.abs(points[i].x - points[j].x);

      if (dx < 5 && dy < rule.min_value) {
        warnings.push({
          type: 'route_convergence',
          message: `Routes are too close vertically (${dy.toFixed(1)} yds). Target: ${rule.min_value}-${rule.max_value} yds.`,
          involvedRouteIds: [points[i].routeId, points[j].routeId],
        });
      }
    }
  }
  return warnings;
}
