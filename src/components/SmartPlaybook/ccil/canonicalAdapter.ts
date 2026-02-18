/**
 * Canonical Adapter — Transforms SmartPlaybook UI state into CanonicalPlay
 *
 * This is the single translation boundary between the playbook component's
 * internal state shape and the intelligence layer's canonical input type.
 * All analysis consumers receive CanonicalPlay — never raw UI state.
 */

import type { CanonicalPlay, CanonicalPlayer, CanonicalRoute } from './types';

interface SmartPlaybookState {
  players: Array<{
    id: string;
    x: number;
    y: number;
    position: string;
    number?: number;
    selected?: boolean;
    createdAt?: string;
  }>;
  routes: Array<{
    id: string;
    playerId: string;
    points: Array<{ x: number; y: number }>;
    type: string;
    color?: string;
    createdAt?: string;
  }>;
  phase: string;
  playType: string;
  playName: string;
  fieldDimensions: { width: number; height: number };
  revision: number;
}

/**
 * Adapt a single UI player to CanonicalPlayer, stripping UI-only fields.
 */
function adaptPlayer(player: SmartPlaybookState['players'][number]): CanonicalPlayer {
  return {
    id: player.id,
    x: player.x,
    y: player.y,
    position: player.position,
    number: player.number,
  };
}

/**
 * Adapt a single UI route to CanonicalRoute, stripping UI-only fields.
 */
function adaptRoute(route: SmartPlaybookState['routes'][number]): CanonicalRoute {
  return {
    id: route.id,
    playerId: route.playerId,
    points: route.points.map(p => ({ x: p.x, y: p.y })),
    type: route.type,
    color: route.color,
  };
}

/**
 * toCanonicalPlay — Main adapter entry point.
 * Converts the SmartPlaybook component state snapshot into a CanonicalPlay.
 */
export function toCanonicalPlay(state: SmartPlaybookState): CanonicalPlay {
  const phase = (['offense', 'defense', 'special_teams'].includes(state.phase)
    ? state.phase
    : 'offense') as CanonicalPlay['phase'];

  return {
    players: state.players.map(adaptPlayer),
    routes: state.routes.map(adaptRoute),
    phase,
    playType: state.playType || 'pass',
    playName: state.playName || '',
    fieldDimensions: { ...state.fieldDimensions },
    revision: state.revision,
    timestamp: Date.now(),
  };
}
