/**
 * Bridges the SmartPlaybook local state (pixel-based, plain JS) to the
 * EnginePlay type used by the concept detection and coverage beater engines.
 */
import { EnginePlay, EnginePlayer, FootballRouteId } from '../types/playbook';
import { CANVAS_WIDTH_PX, CANVAS_HEIGHT_PX, FIELD_WIDTH_YARDS, FIELD_LENGTH_YARDS } from '../config/fieldConfig';

/** Route type strings used by SmartPlaybook's RouteEditor / PlayController */
const ROUTE_TYPE_MAP: Record<string, FootballRouteId> = {
  slant: 'slant',
  post: 'post',
  corner: 'corner',
  out: 'out',
  in: 'in',
  hitch: 'hitch',
  go: 'go',
  drag: 'drag',
  dig: 'dig',
  curl: 'curl',
  flat: 'flat',
  wheel: 'wheel',
  comeback: 'comeback',
  seam: 'seam',
  shallow_cross: 'shallow_cross',
  option: 'option',
  bubble_screen: 'bubble_screen',
  streak: 'streak',
};

export interface SmartPlaybookPlayer {
  id: string;
  x: number;
  y: number;
  position: string;
  number: number;
  selected?: boolean;
}

export interface SmartPlaybookRoute {
  id: string;
  playerId: string;
  points: { x: number; y: number }[];
  type: string;
  color: string;
}

export interface SmartPlaybookSavedPlay {
  id: string;
  name: string;
  phase: string;
  type: string;
  players: SmartPlaybookPlayer[];
  routes: SmartPlaybookRoute[];
  timestamp?: number;
}

/**
 * Converts SmartPlaybook's local state into an EnginePlay for detection engines.
 * Player positions are converted from canvas pixels to yards.
 * Route types are mapped to FootballRouteId where possible.
 */
export function toEnginePlay(
  players: SmartPlaybookPlayer[],
  routes: SmartPlaybookRoute[],
  playId = 'current',
  playName = 'Current Play',
  formation = 'Custom',
): EnginePlay {
  // Index routes by playerId for quick lookup
  const routesByPlayer = new Map<string, SmartPlaybookRoute>();
  for (const r of routes) {
    // Use the first route found per player (most recent preset applied)
    if (!routesByPlayer.has(r.playerId)) {
      routesByPlayer.set(r.playerId, r);
    }
  }

  const enginePlayers: EnginePlayer[] = players.map((p) => {
    const route = routesByPlayer.get(p.id);
    const assignedRoute = route ? ROUTE_TYPE_MAP[route.type] : undefined;

    return {
      id: p.id,
      x: (p.x / CANVAS_WIDTH_PX) * FIELD_WIDTH_YARDS,
      y: (p.y / CANVAS_HEIGHT_PX) * FIELD_LENGTH_YARDS,
      position: p.position,
      assignedRoute,
    };
  });

  return {
    id: playId,
    name: playName,
    formation,
    players: enginePlayers,
  };
}

/**
 * Converts an array of SmartPlaybook saved plays to EnginePlay[].
 */
export function savedPlaysToEngine(savedPlays: SmartPlaybookSavedPlay[]): EnginePlay[] {
  return savedPlays.map((sp) =>
    toEnginePlay(sp.players, sp.routes, sp.id, sp.name, sp.phase),
  );
}

/**
 * Mirrors SmartPlaybook players + routes in pixel coordinates.
 * Used by the flip button (operates on SmartPlaybook's local state directly).
 */
export function mirrorPlaybookState(
  players: SmartPlaybookPlayer[],
  routes: SmartPlaybookRoute[],
  fieldWidthPx: number,
): { players: SmartPlaybookPlayer[]; routes: SmartPlaybookRoute[] } {
  const mirroredPlayers = players.map((p) => ({
    ...p,
    x: fieldWidthPx - p.x,
  }));

  const mirroredRoutes = routes.map((r) => ({
    ...r,
    points: r.points.map((pt) => ({
      ...pt,
      x: fieldWidthPx - pt.x,
    })),
  }));

  return { players: mirroredPlayers, routes: mirroredRoutes };
}
