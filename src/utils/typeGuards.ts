/**
 * Runtime type guards for Play, Player, Route, and Point.
 * Use these instead of `as` type assertions for data from external sources.
 */

import type { Play, Player, Route, Point } from '../services/firestore';

export function isPoint(data: unknown): data is Point {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as Point).x === 'number' &&
    typeof (data as Point).y === 'number'
  );
}

export function isPlayer(data: unknown): data is Player {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.id === 'string' &&
    typeof d.number === 'number' &&
    typeof d.position === 'string' &&
    typeof d.x === 'number' &&
    typeof d.y === 'number'
  );
}

export function isRoute(data: unknown): data is Route {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.id === 'string' &&
    typeof d.playerId === 'string' &&
    Array.isArray(d.path) &&
    d.path.every(isPoint) &&
    (d.type === 'run' || d.type === 'pass' || d.type === 'block') &&
    typeof d.timing === 'number'
  );
}

export function isPlay(data: unknown): data is Play {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.teamId === 'string' &&
    typeof d.name === 'string' &&
    typeof d.formation === 'string' &&
    typeof d.description === 'string' &&
    Array.isArray(d.routes) &&
    Array.isArray(d.players) &&
    Array.isArray(d.tags) &&
    typeof d.sport === 'string' &&
    typeof d.createdBy === 'string'
  );
}

/**
 * Assert and narrow a value to Play, or throw a descriptive error.
 */
export function assertPlay(data: unknown, context = ''): Play {
  if (!isPlay(data)) {
    throw new Error(`Invalid play data${context ? ` (${context})` : ''}: ${JSON.stringify(data)?.slice(0, 200)}`);
  }
  return data;
}

/**
 * Assert and narrow a value to Player, or throw a descriptive error.
 */
export function assertPlayer(data: unknown, context = ''): Player {
  if (!isPlayer(data)) {
    throw new Error(`Invalid player data${context ? ` (${context})` : ''}: ${JSON.stringify(data)?.slice(0, 200)}`);
  }
  return data;
}
