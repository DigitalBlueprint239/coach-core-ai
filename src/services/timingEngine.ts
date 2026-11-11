import { Play, Route } from './firestore';
import { pixelToYard, PX_PER_YARD_Y } from './spacingEngine';

export type QBDrop = '3-step' | '5-step' | '7-step' | 'play-action';

export interface TimingViolation {
  type: 'route_too_deep' | 'route_too_shallow' | 'concept_mismatch';
  severity: 'warning';
  routeId: string;
  playerId: string;
  message: string;
  suggestedDrop: QBDrop;
}

/** Timing windows keyed by QB drop type. */
const TIMING_WINDOWS: Record<QBDrop, { minDepth: number; maxDepth: number; timeSeconds: [number, number] }> = {
  '3-step': { minDepth: 0, maxDepth: 7, timeSeconds: [1.5, 2.0] },
  '5-step': { minDepth: 8, maxDepth: 15, timeSeconds: [2.5, 3.0] },
  '7-step': { minDepth: 15, maxDepth: 30, timeSeconds: [3.5, 4.0] },
  'play-action': { minDepth: 10, maxDepth: 30, timeSeconds: [3.0, 4.5] },
};

/**
 * Calculate the depth of a route in yards. Depth is the maximum Y displacement
 * from the player's starting position across all points in the route path.
 * The starting position is the first point in the path (or the player's snap
 * position if provided via the play).
 */
function getRouteDepthYards(route: Route, play: Play): number {
  if (route.path.length === 0) return 0;

  // Find the player's starting Y position in yards
  const player = play.players.find((p) => p.id === route.playerId);
  const startYPx = player ? player.y : route.path[0].y;
  const startYYards = startYPx / PX_PER_YARD_Y;

  let maxDepth = 0;
  for (const pt of route.path) {
    const ptYards = pixelToYard(pt);
    const depth = Math.abs(ptYards.y - startYYards);
    if (depth > maxDepth) {
      maxDepth = depth;
    }
  }

  return maxDepth;
}

/**
 * Suggest the best QB drop type for a given route depth in yards.
 * Returns the drop whose window best fits the depth.
 */
export function suggestDrop(routeDepthYards: number): QBDrop {
  if (routeDepthYards <= 7) return '3-step';
  if (routeDepthYards <= 15) return '5-step';
  return '7-step';
}

/**
 * Check all pass routes in a play against the specified QB drop timing window.
 * Returns violations for routes that are too deep or too shallow for the drop.
 */
export function checkTiming(play: Play, qbDrop: QBDrop): TimingViolation[] {
  const violations: TimingViolation[] = [];
  const window = TIMING_WINDOWS[qbDrop];

  for (const route of play.routes) {
    // Only check pass routes
    if (route.type !== 'pass') continue;

    const depthYards = getRouteDepthYards(route, play);

    if (depthYards > window.maxDepth) {
      const suggested = suggestDrop(depthYards);
      const player = play.players.find((p) => p.id === route.playerId);
      const playerLabel = player ? `#${player.number}` : route.playerId;

      violations.push({
        type: 'route_too_deep',
        severity: 'warning',
        routeId: route.id,
        playerId: route.playerId,
        message: `Route for ${playerLabel} has a depth of ${depthYards.toFixed(1)} yards, which is too deep for a ${qbDrop} drop (max ${window.maxDepth} yards).`,
        suggestedDrop: suggested,
      });
    } else if (depthYards < window.minDepth) {
      const suggested = suggestDrop(depthYards);
      const player = play.players.find((p) => p.id === route.playerId);
      const playerLabel = player ? `#${player.number}` : route.playerId;

      violations.push({
        type: 'route_too_shallow',
        severity: 'warning',
        routeId: route.id,
        playerId: route.playerId,
        message: `Route for ${playerLabel} has a depth of ${depthYards.toFixed(1)} yards, which is too shallow for a ${qbDrop} drop (min ${window.minDepth} yards).`,
        suggestedDrop: suggested,
      });
    }
  }

  return violations;
}
