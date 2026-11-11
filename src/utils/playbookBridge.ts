/**
 * playbookBridge.ts — Translates between SmartPlaybook's pixel-based state
 * and the EnginePlay types used by detection/validation engines.
 *
 * This is the single most important correctness surface in the application.
 * Every conversion uses named constants — no magic numbers.
 */

import { Play, Player, Route, Point } from '../services/firestore';

// ============================================
// FIELD CONFIGURATION CONSTANTS
// ============================================

export const FIELD_WIDTH_YARDS = 53.333;
export const FIELD_LENGTH_YARDS = 100;
export const FIELD_WIDTH_PX = 600;
export const FIELD_HEIGHT_PX = 300;

export const PX_PER_YARD_X = FIELD_WIDTH_PX / FIELD_WIDTH_YARDS;
export const PX_PER_YARD_Y = FIELD_HEIGHT_PX / FIELD_LENGTH_YARDS;

// ============================================
// COORDINATE CONVERSION — pixel ↔ yard
// ============================================

/**
 * Convert a pixel coordinate to yard coordinate.
 * X: 0px → 0yd, 600px → 53.333yd
 * Y: 0px → 0yd, 300px → 100yd
 */
export function pixelToYard(px: Point): Point {
  return {
    x: px.x / PX_PER_YARD_X,
    y: px.y / PX_PER_YARD_Y,
  };
}

/**
 * Convert a yard coordinate to pixel coordinate.
 */
export function yardToPixel(yd: Point): Point {
  return {
    x: yd.x * PX_PER_YARD_X,
    y: yd.y * PX_PER_YARD_Y,
  };
}

// ============================================
// ENGINE PLAY TYPE (yard-based)
// ============================================

export interface EnginePlayer {
  id: string;
  number: number;
  position: string;
  x: number; // yards
  y: number; // yards
}

export interface EngineRoute {
  id: string;
  playerId: string;
  path: Point[]; // yards
  type: 'run' | 'pass' | 'block';
  timing: number;
}

export interface EnginePlay {
  id?: string;
  teamId: string;
  name: string;
  formation: string;
  description: string;
  routes: EngineRoute[];
  players: EnginePlayer[];
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  sport: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// CONVERSION FUNCTIONS
// ============================================

/**
 * Convert a pixel-based Play to a yard-based EnginePlay.
 * Every player position and route waypoint is converted.
 */
export function toEnginePlay(play: Play): EnginePlay {
  return {
    id: play.id,
    teamId: play.teamId,
    name: play.name,
    formation: play.formation,
    description: play.description,
    players: play.players.map(toEnginePlayer),
    routes: play.routes.map(toEngineRoute),
    tags: [...play.tags],
    difficulty: play.difficulty,
    sport: play.sport,
    createdBy: play.createdBy,
    createdAt: play.createdAt,
    updatedAt: play.updatedAt,
  };
}

/**
 * Convert a yard-based EnginePlay back to a pixel-based Play.
 */
export function fromEnginePlay(engine: EnginePlay): Play {
  return {
    id: engine.id,
    teamId: engine.teamId,
    name: engine.name,
    formation: engine.formation,
    description: engine.description,
    players: engine.players.map(fromEnginePlayer),
    routes: engine.routes.map(fromEngineRoute),
    tags: [...engine.tags],
    difficulty: engine.difficulty,
    sport: engine.sport,
    createdBy: engine.createdBy,
    createdAt: engine.createdAt,
    updatedAt: engine.updatedAt,
  };
}

function toEnginePlayer(player: Player): EnginePlayer {
  const yardPos = pixelToYard({ x: player.x, y: player.y });
  return {
    id: player.id,
    number: player.number,
    position: player.position,
    x: yardPos.x,
    y: yardPos.y,
  };
}

function fromEnginePlayer(engine: EnginePlayer): Player {
  const pxPos = yardToPixel({ x: engine.x, y: engine.y });
  return {
    id: engine.id,
    number: engine.number,
    position: engine.position,
    x: pxPos.x,
    y: pxPos.y,
  };
}

function toEngineRoute(route: Route): EngineRoute {
  return {
    id: route.id,
    playerId: route.playerId,
    path: route.path.map(p => pixelToYard(p)),
    type: route.type,
    timing: route.timing,
  };
}

function fromEngineRoute(engine: EngineRoute): Route {
  return {
    id: engine.id,
    playerId: engine.playerId,
    path: engine.path.map(p => yardToPixel(p)),
    type: engine.type,
    timing: engine.timing,
  };
}

// ============================================
// UTILITY: Distance in yards between two pixel points
// ============================================

export function pixelDistanceInYards(a: Point, b: Point): number {
  const aYd = pixelToYard(a);
  const bYd = pixelToYard(b);
  const dx = aYd.x - bYd.x;
  const dy = aYd.y - bYd.y;
  return Math.sqrt(dx * dx + dy * dy);
}
