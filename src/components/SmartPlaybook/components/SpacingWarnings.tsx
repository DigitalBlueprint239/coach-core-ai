import React, { useMemo } from 'react';
import { checkVerticalSpacing } from '../../../engine/offense';
import { loadOffensiveEngineData } from '../../../engine/offense';
import type { PositionedRoutePoint } from '../../../engine/offense';

interface RouteShape {
  id: string;
  points: Array<{ x: number; y: number }>;
}

interface SpacingWarningsProps {
  routes: RouteShape[];
}

const SpacingWarnings: React.FC<SpacingWarningsProps> = ({ routes }) => {
  const warnings = useMemo(() => {
    if (routes.length < 2) return [];

    const { spacingRules } = loadOffensiveEngineData();

    const routePoints: PositionedRoutePoint[] = routes
      .filter(r => r.points.length >= 2)
      .map(r => {
        const last = r.points[r.points.length - 1];
        return { routeId: r.id, x: last.x, y: last.y };
      });

    if (routePoints.length < 2) return [];
    return checkVerticalSpacing(routePoints, spacingRules);
  }, [routes]);

  if (warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {warnings.map((w, idx) => (
        <div
          key={idx}
          className="bg-amber-50 border border-amber-200 rounded-lg p-3"
        >
          <div className="flex items-start gap-2">
            <span className="text-amber-500 text-base leading-none mt-0.5">⚠</span>
            <div>
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-0.5">
                Spacing Warning
              </p>
              <p className="text-xs text-amber-700">{w.message}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SpacingWarnings;
