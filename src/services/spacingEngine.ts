import { Play, Player, Route, Point } from './firestore';

// Field config
export const FIELD_WIDTH_YARDS = 53.333;
export const FIELD_LENGTH_YARDS = 100;
export const FIELD_WIDTH_PX = 600;
export const FIELD_HEIGHT_PX = 300;
export const PX_PER_YARD_X = FIELD_WIDTH_PX / FIELD_WIDTH_YARDS;
export const PX_PER_YARD_Y = FIELD_HEIGHT_PX / FIELD_LENGTH_YARDS;

export interface SpacingViolation {
  type: 'vertical_crowding' | 'horizontal_crowding' | 'backfield_congestion' | 'route_convergence';
  severity: 'warning' | 'error';
  playerIds: string[];
  message: string;
  suggestion: string;
}

const SKILL_POSITIONS = new Set(['WR', 'TE', 'RB', 'FB', 'HB', 'SE', 'FL']);
const BACKFIELD_POSITIONS = new Set(['RB', 'FB', 'HB']);
const RECEIVER_POSITIONS = new Set(['WR', 'SE', 'FL', 'TE']);

/** Convert pixel position to yards. */
export function pixelToYard(px: Point): Point {
  return { x: px.x / PX_PER_YARD_X, y: px.y / PX_PER_YARD_Y };
}

/** Convert yard position to pixels. */
export function yardToPixel(yd: Point): Point {
  return { x: yd.x * PX_PER_YARD_X, y: yd.y * PX_PER_YARD_Y };
}

function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function getSkillPlayers(play: Play): Player[] {
  return play.players.filter((p) => SKILL_POSITIONS.has(p.position));
}

function getPlayerById(play: Play, id: string): Player | undefined {
  return play.players.find((p) => p.id === id);
}

function getRouteForPlayer(play: Play, playerId: string): Route | undefined {
  return play.routes.find((r) => r.playerId === playerId);
}

/**
 * Rule 1: Horizontal crowding - receivers within 3 yards laterally at their
 * starting positions.
 */
function checkHorizontalCrowding(play: Play): SpacingViolation[] {
  const violations: SpacingViolation[] = [];
  const receivers = play.players.filter((p) => RECEIVER_POSITIONS.has(p.position));

  for (let i = 0; i < receivers.length; i++) {
    for (let j = i + 1; j < receivers.length; j++) {
      const a = pixelToYard({ x: receivers[i].x, y: receivers[i].y });
      const b = pixelToYard({ x: receivers[j].x, y: receivers[j].y });
      const lateralDist = Math.abs(a.x - b.x);

      if (lateralDist < 3) {
        violations.push({
          type: 'horizontal_crowding',
          severity: 'warning',
          playerIds: [receivers[i].id, receivers[j].id],
          message: `Receivers #${receivers[i].number} (${receivers[i].position}) and #${receivers[j].number} (${receivers[j].position}) are only ${lateralDist.toFixed(1)} yards apart laterally at the snap.`,
          suggestion: `Spread receivers at least 3 yards apart horizontally to create better spacing and prevent easy double coverage.`,
        });
      }
    }
  }

  return violations;
}

/**
 * Rule 2: Vertical crowding - route endpoints at the same depth less than 2
 * yards apart laterally.
 */
function checkVerticalCrowding(play: Play): SpacingViolation[] {
  const violations: SpacingViolation[] = [];
  const passRoutes = play.routes.filter((r) => r.type === 'pass');

  for (let i = 0; i < passRoutes.length; i++) {
    for (let j = i + 1; j < passRoutes.length; j++) {
      const routeA = passRoutes[i];
      const routeB = passRoutes[j];

      if (routeA.path.length === 0 || routeB.path.length === 0) continue;

      const endA = pixelToYard(routeA.path[routeA.path.length - 1]);
      const endB = pixelToYard(routeB.path[routeB.path.length - 1]);

      const depthDiff = Math.abs(endA.y - endB.y);
      const lateralDist = Math.abs(endA.x - endB.x);

      // Same depth = within 2 yards vertically, and less than 2 yards laterally
      if (depthDiff < 2 && lateralDist < 2) {
        const playerA = getPlayerById(play, routeA.playerId);
        const playerB = getPlayerById(play, routeB.playerId);
        const nameA = playerA ? `#${playerA.number}` : routeA.playerId;
        const nameB = playerB ? `#${playerB.number}` : routeB.playerId;

        violations.push({
          type: 'vertical_crowding',
          severity: 'error',
          playerIds: [routeA.playerId, routeB.playerId],
          message: `Routes for ${nameA} and ${nameB} end at nearly the same spot (${lateralDist.toFixed(1)} yards apart laterally at similar depth).`,
          suggestion: `Adjust route depths so endpoints are separated by at least 2 yards laterally or vertically to give the QB distinct windows.`,
        });
      }
    }
  }

  return violations;
}

/**
 * Rule 3: Route convergence - two route paths arrive at the same point within a
 * 2-yard radius at any point along their paths.
 */
function checkRouteConvergence(play: Play): SpacingViolation[] {
  const violations: SpacingViolation[] = [];
  const passRoutes = play.routes.filter((r) => r.type === 'pass');
  const checked = new Set<string>();

  for (let i = 0; i < passRoutes.length; i++) {
    for (let j = i + 1; j < passRoutes.length; j++) {
      const routeA = passRoutes[i];
      const routeB = passRoutes[j];
      const pairKey = `${routeA.id}:${routeB.id}`;

      if (checked.has(pairKey)) continue;

      let converges = false;

      for (const ptA of routeA.path) {
        for (const ptB of routeB.path) {
          const yA = pixelToYard(ptA);
          const yB = pixelToYard(ptB);
          if (distance(yA, yB) < 2) {
            converges = true;
            break;
          }
        }
        if (converges) break;
      }

      if (converges) {
        checked.add(pairKey);
        const playerA = getPlayerById(play, routeA.playerId);
        const playerB = getPlayerById(play, routeB.playerId);
        const nameA = playerA ? `#${playerA.number}` : routeA.playerId;
        const nameB = playerB ? `#${playerB.number}` : routeB.playerId;

        violations.push({
          type: 'route_convergence',
          severity: 'warning',
          playerIds: [routeA.playerId, routeB.playerId],
          message: `Routes for ${nameA} and ${nameB} converge within 2 yards of each other during their paths.`,
          suggestion: `Adjust route stems or break points to maintain separation and avoid collisions in the pattern.`,
        });
      }
    }
  }

  return violations;
}

/**
 * Rule 4: Backfield congestion - a RB route path intersects with a WR/TE route
 * path within a 2-yard radius.
 */
function checkBackfieldCongestion(play: Play): SpacingViolation[] {
  const violations: SpacingViolation[] = [];

  const rbRoutes: { route: Route; player: Player }[] = [];
  const wrRoutes: { route: Route; player: Player }[] = [];

  for (const route of play.routes) {
    if (route.type === 'block') continue;
    const player = getPlayerById(play, route.playerId);
    if (!player) continue;

    if (BACKFIELD_POSITIONS.has(player.position)) {
      rbRoutes.push({ route, player });
    } else if (RECEIVER_POSITIONS.has(player.position)) {
      wrRoutes.push({ route, player });
    }
  }

  for (const rb of rbRoutes) {
    for (const wr of wrRoutes) {
      let intersects = false;

      for (const ptRB of rb.route.path) {
        for (const ptWR of wr.route.path) {
          const yRB = pixelToYard(ptRB);
          const yWR = pixelToYard(ptWR);
          if (distance(yRB, yWR) < 2) {
            intersects = true;
            break;
          }
        }
        if (intersects) break;
      }

      if (intersects) {
        violations.push({
          type: 'backfield_congestion',
          severity: 'warning',
          playerIds: [rb.player.id, wr.player.id],
          message: `RB #${rb.player.number} route intersects with ${wr.player.position} #${wr.player.number} route path, causing backfield congestion.`,
          suggestion: `Delay the RB release or adjust the route angle to avoid crossing the receiver's path in the backfield.`,
        });
      }
    }
  }

  return violations;
}

/** Run all spacing checks on a play and return any violations found. */
export function checkSpacing(play: Play): SpacingViolation[] {
  const violations: SpacingViolation[] = [];

  violations.push(...checkHorizontalCrowding(play));
  violations.push(...checkVerticalCrowding(play));
  violations.push(...checkRouteConvergence(play));
  violations.push(...checkBackfieldCongestion(play));

  return violations;
}
