/**
 * playSerializer.ts — Converts between SmartPlaybook's internal play format
 * and the Firestore UserPlay document format.
 *
 * Key responsibilities:
 * - Strip runtime-only properties (selected, createdAt on players)
 * - Prevent Konva node references or circular structures from reaching Firestore
 * - Preserve coordinate system (yard-based, consistent with canvas)
 * - Convert Firestore timestamps to/from JS Dates
 */

import type { UserPlay, UserPlayRoute, Player } from '../../../services/firestore';

// ============================================
// TYPES (SmartPlaybook internal format)
// ============================================

export interface InternalPlayer {
  id: string;
  x: number;
  y: number;
  position: string;
  number: number;
  selected?: boolean;
  createdAt?: string;
  // May contain runtime refs — we strip these
  [key: string]: any;
}

export interface InternalRoute {
  id: string;
  playerId: string;
  points: { x: number; y: number }[];
  type: string;
  color: string;
  createdAt?: string;
  [key: string]: any;
}

export interface InternalPlay {
  id: string;
  name: string;
  phase: string;
  type: string;
  players: InternalPlayer[];
  routes: InternalRoute[];
  createdAt?: string;
  aiGenerated?: boolean;
  aiContext?: {
    down: number;
    distance: number;
    fieldPosition: number;
    confidence: number;
  };
}

// ============================================
// SERIALIZE: Internal → Firestore
// ============================================

/**
 * Serialize an internal player to a Firestore-safe Player object.
 * Strips selected state, createdAt, and any runtime references.
 */
function serializePlayer(player: InternalPlayer): Player {
  return {
    id: String(player.id),
    number: typeof player.number === 'number' ? player.number : 0,
    position: String(player.position || 'WR'),
    x: typeof player.x === 'number' ? player.x : 0,
    y: typeof player.y === 'number' ? player.y : 0,
  };
}

/**
 * Serialize an internal route to a Firestore-safe UserPlayRoute object.
 * Strips createdAt and validates points.
 */
function serializeRoute(route: InternalRoute): UserPlayRoute {
  return {
    id: String(route.id),
    playerId: String(route.playerId),
    points: (route.points || []).map(p => ({
      x: typeof p.x === 'number' ? p.x : 0,
      y: typeof p.y === 'number' ? p.y : 0,
    })),
    type: String(route.type || 'custom'),
    color: String(route.color || '#ef4444'),
  };
}

/**
 * Convert an internal play to Firestore document fields.
 * Does NOT include id, userId, createdAt, updatedAt — those are managed by the service layer.
 */
export function serializePlay(
  play: InternalPlay
): Omit<UserPlay, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {
  return {
    name: String(play.name || 'Untitled Play'),
    phase: String(play.phase || 'offense'),
    type: String(play.type || 'pass'),
    players: (play.players || []).map(serializePlayer),
    routes: (play.routes || []).map(serializeRoute),
    aiGenerated: !!play.aiGenerated,
    aiContext: play.aiContext || undefined,
    tags: [],
    notes: '',
  };
}

// ============================================
// DESERIALIZE: Firestore → Internal
// ============================================

/**
 * Convert a Firestore Player to the internal format.
 */
function deserializePlayer(player: Player): InternalPlayer {
  return {
    id: player.id,
    x: player.x,
    y: player.y,
    position: player.position,
    number: player.number,
    selected: false,
  };
}

/**
 * Convert a Firestore UserPlayRoute to the internal format.
 */
function deserializeRoute(route: UserPlayRoute): InternalRoute {
  return {
    id: route.id,
    playerId: route.playerId,
    points: route.points.map(p => ({ x: p.x, y: p.y })),
    type: route.type,
    color: route.color,
  };
}

/**
 * Convert a Firestore UserPlay document to the internal play format.
 */
export function deserializePlay(doc: UserPlay): InternalPlay {
  return {
    id: doc.id || '',
    name: doc.name,
    phase: doc.phase,
    type: doc.type,
    players: (doc.players || []).map(deserializePlayer),
    routes: (doc.routes || []).map(deserializeRoute),
    aiGenerated: doc.aiGenerated,
    aiContext: doc.aiContext,
  };
}

// ============================================
// DIFF UTILITY
// ============================================

/**
 * Check if two plays have meaningful differences (ignoring ephemeral state like selected).
 * Used to avoid unnecessary Firestore writes.
 */
export function playsAreDifferent(a: InternalPlay, b: InternalPlay): boolean {
  if (a.name !== b.name || a.phase !== b.phase || a.type !== b.type) return true;
  if (a.players.length !== b.players.length || a.routes.length !== b.routes.length) return true;

  // Compare players (ignoring selected state)
  for (let i = 0; i < a.players.length; i++) {
    const pa = a.players[i];
    const pb = b.players[i];
    if (pa.id !== pb.id || pa.x !== pb.x || pa.y !== pb.y ||
        pa.position !== pb.position || pa.number !== pb.number) {
      return true;
    }
  }

  // Compare routes
  for (let i = 0; i < a.routes.length; i++) {
    const ra = a.routes[i];
    const rb = b.routes[i];
    if (ra.id !== rb.id || ra.playerId !== rb.playerId ||
        ra.type !== rb.type || ra.color !== rb.color) {
      return true;
    }
    if (ra.points.length !== rb.points.length) return true;
    for (let j = 0; j < ra.points.length; j++) {
      if (ra.points[j].x !== rb.points[j].x || ra.points[j].y !== rb.points[j].y) {
        return true;
      }
    }
  }

  return false;
}
