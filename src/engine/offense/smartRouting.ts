/**
 * smartRouting.ts - Context-aware route recommendations
 *
 * Filters and ranks routes based on the selected player's position and
 * field alignment. RBs see Flat/Screen/Shallow emphasized, boundary WRs
 * see Comeback/Out/Fade emphasized, slot WRs see Slant/Dig/Shallow.
 */

import { RouteDef, PlayerRole, PlayRouteInstance } from './schema';
import { routes } from './data.moderate';

export interface RecommendedRoute extends RouteDef {
  recommended: boolean;
  reason: string;
}

/**
 * Determines player's field side based on x position.
 * fieldCenterX is typically 300 for a 600px-wide field.
 */
function getFieldSide(playerX: number, fieldCenterX: number = 300): 'left' | 'right' | 'center' {
  const threshold = fieldCenterX * 0.15; // ~45px from center = slot territory
  if (playerX < fieldCenterX - threshold) return 'left';
  if (playerX > fieldCenterX + threshold) return 'right';
  return 'center';
}

/**
 * Determines if a player is in the backfield based on y position.
 * In the 600x300 canvas, the line of scrimmage area is roughly y=150.
 * Players with y > 170 are likely backfield (further from LOS).
 */
function isBackfield(playerY: number, fieldCenterY: number = 150): boolean {
  return playerY > fieldCenterY + 20;
}

/**
 * Returns all routes sorted by relevance for a given player context.
 * Recommended routes appear first with a reason string.
 * All routes remain available regardless of recommendation.
 */
export function getSmartRouteRecommendations(
  playerPosition: string,
  playerX: number,
  playerY: number,
  existingPlayRoutes: PlayRouteInstance[] = [],
  fieldCenterX: number = 300,
): RecommendedRoute[] {
  const pos = playerPosition?.toUpperCase() || '';
  const fieldSide = getFieldSide(playerX, fieldCenterX);
  const inBackfield = isBackfield(playerY);
  const isSlot = fieldSide === 'center';

  const recommendations: RecommendedRoute[] = routes.map(route => {
    let recommended = false;
    let reason = '';

    // RB/FB - quick game, flat/screen/shallow
    if (pos === 'RB' || pos === 'FB') {
      if (['flat_1', 'screen_0', 'shallow_cross_5'].includes(route.route_id) ||
          route.tags?.includes('rb_route')) {
        recommended = true;
        reason = 'Common RB route';
      }
    }
    // TE - versatile, intermediate routes + flat
    else if (pos === 'TE') {
      if (['dig_6', 'corner_7', 'flat_1', 'shallow_cross_5', 'curl_4', 'out_5'].includes(route.route_id) ||
          route.tags?.includes('te_route')) {
        recommended = true;
        reason = 'Effective TE route';
      }
    }
    // WR - varies by alignment
    else if (pos === 'WR') {
      if (isSlot) {
        // Slot WR: Slant, Dig, Shallow, Post work well
        if (['slant_2', 'dig_6', 'shallow_cross_5', 'post_8', 'hitch_5'].includes(route.route_id)) {
          recommended = true;
          reason = 'Effective slot route';
        }
      } else {
        // Boundary/Outside WR: Comeback, Out, Curl, Go, Corner
        if (['comeback_3', 'go_9', 'out_5', 'curl_4', 'corner_7'].includes(route.route_id)) {
          recommended = true;
          reason = 'Strong boundary route';
        }
      }
    }
    // QB - shouldn't have routes, but allow scramble/bootleg
    else if (pos === 'QB') {
      if (['screen_0'].includes(route.route_id)) {
        recommended = true;
        reason = 'Bootleg/scramble';
      }
    }
    // OL - blocking, no routes recommended
    else if (['LT', 'LG', 'C', 'RG', 'RT'].includes(pos)) {
      // No routes recommended for linemen
      recommended = false;
      reason = '';
    }
    // Default: any receiver not matched above
    else if (inBackfield) {
      if (['flat_1', 'screen_0', 'shallow_cross_5'].includes(route.route_id)) {
        recommended = true;
        reason = 'Backfield route';
      }
    }

    return { ...route, recommended, reason };
  });

  // Sort: recommended first, then by route number
  return recommendations.sort((a, b) => {
    if (a.recommended && !b.recommended) return -1;
    if (!a.recommended && b.recommended) return 1;
    return a.route_number - b.route_number;
  });
}
