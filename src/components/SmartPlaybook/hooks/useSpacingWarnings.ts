/**
 * useSpacingWarnings.ts - Hook that runs spacing checks on current play routes
 *
 * Extracts route endpoints from the current play state and runs them through
 * the spacing engine to detect vertical and horizontal convergence issues.
 *
 * Coordinates: The existing system uses pixel coordinates (600x300 field).
 * We convert to approximate yards using PIXELS_PER_YARD before checking spacing.
 * Field is roughly 100 yards long (600px / ~6px per yard).
 */

import { useMemo } from 'react';
import { checkAllSpacing } from '../../../engine/offense/spacingEngine';
import { spacingRules } from '../../../engine/offense/data.moderate';
import type { PositionedRoutePoint, SpacingWarning } from '../../../engine/offense/schema';

// Approximate conversion: 600px = ~100 yards horizontally, 300px = ~53 yards vertically
const PX_TO_YARDS_X = 100 / 600;
const PX_TO_YARDS_Y = 53 / 300;

interface PlayerWithRoute {
  id: string;
  x: number;
  y: number;
  position?: string;
}

interface RouteWithPoints {
  id: string;
  playerId: string;
  points: Array<{ x: number; y: number }>;
  type?: string;
}

/**
 * Extracts the endpoint of each route (last point in the path) and runs spacing checks.
 *
 * @param players - Current players array
 * @param routes - Current routes array
 * @returns Array of spacing warnings
 */
export function useSpacingWarnings(
  players: PlayerWithRoute[],
  routes: RouteWithPoints[],
): SpacingWarning[] {
  return useMemo(() => {
    if (!routes || routes.length < 2) return [];

    const routeEndpoints: PositionedRoutePoint[] = [];

    for (const route of routes) {
      if (!route.points || route.points.length < 2) continue;

      // Use the last point of the route as the endpoint
      const lastPoint = route.points[route.points.length - 1];

      routeEndpoints.push({
        routeId: route.id,
        x: lastPoint.x * PX_TO_YARDS_X,
        y: lastPoint.y * PX_TO_YARDS_Y,
      });
    }

    if (routeEndpoints.length < 2) return [];

    return checkAllSpacing(routeEndpoints, spacingRules);
  }, [routes]);
}
