/**
 * conceptAssignment.js – Concept-to-route batch assignment logic
 *
 * Assigns routes to players based on named offensive concepts (Smash, Mesh, etc.).
 * Purely functional — no side effects, no state mutations.
 */

import { createRoute } from '../PlayController';

// ── Eligible receiver positions ───────────────────────────────────────────────

const ELIGIBLE_POSITIONS = new Set(['WR', 'TE', 'RB', 'FB', 'QB']);

/**
 * Check whether a player can run a route.
 * @param {{ position: string }} player
 * @returns {boolean}
 */
export function isEligibleReceiver(player) {
  return ELIGIBLE_POSITIONS.has(player.position);
}

// ── Route geometry generators ────────────────────────────────────────────────
// Each generator returns an array of {x, y} waypoints relative to the player
// position, pre-computed for "outside" orientation.
// A player on the LEFT of center will have x-offsets mirrored automatically.

const FIELD_HEIGHT = 500; // canvas px — used to compute upfield direction

/**
 * Generate route waypoints for a given route type,
 * starting from player position and going upfield.
 *
 * @param {string} routeType
 * @param {{ x: number, y: number }} player
 * @param {boolean} [isLeft=false] - player is left of field center
 * @returns {Array<{x: number, y: number}>}
 */
export function generateRoutePoints(routeType, player, isLeft = false) {
  const { x, y } = player;
  // mirror factor: +1 for right-side player (breaks left/inside),
  //                -1 for left-side player (breaks right/inside)
  const m = isLeft ? 1 : -1;

  switch (routeType) {
    case 'hitch':
      return [{ x, y }, { x, y: y - 60 }, { x: x + m * 8, y: y - 40 }];

    case 'slant':
      return [{ x, y }, { x, y: y - 30 }, { x: x + m * 60, y: y - 80 }];

    case 'post':
      return [{ x, y }, { x, y: y - 80 }, { x: x + m * 50, y: y - 140 }];

    case 'corner':
      return [{ x, y }, { x, y: y - 80 }, { x: x - m * 50, y: y - 140 }];

    case 'out':
      return [{ x, y }, { x, y: y - 70 }, { x: x - m * 60, y: y - 70 }];

    case 'in':
      return [{ x, y }, { x, y: y - 70 }, { x: x + m * 60, y: y - 70 }];

    case 'go':
      return [{ x, y }, { x, y: y - 160 }];

    case 'cross':
      return [{ x, y }, { x, y: y - 60 }, { x: x + m * 100, y: y - 60 }];

    case 'screen':
      return [{ x, y }, { x: x - m * 40, y: y - 20 }];

    case 'wheel':
      return [{ x, y }, { x: x - m * 40, y: y - 20 }, { x: x - m * 40, y: y - 130 }];

    case 'drive':
      return [{ x, y }, { x, y: y - 50 }, { x: x + m * 40, y: y - 50 }];

    default: // custom
      return [{ x, y }, { x, y: y - 80 }];
  }
}

// ── Concept definitions ───────────────────────────────────────────────────────

/**
 * Each concept maps receiver "roles" to route types.
 * Roles: 'outside_left', 'outside_right', 'slot_left', 'slot_right',
 *        'backfield', 'te' (tight end)
 *
 * The engine resolves roles to actual players based on X position.
 */
export const CONCEPTS = {
  smash: {
    id: 'smash',
    name: 'Smash',
    description: 'Corner + Hitch — attacks Cover 2',
    routes: [
      { role: 'outside_right', routeType: 'corner', color: '#ef4444' },
      { role: 'slot_right',    routeType: 'hitch',  color: '#3b82f6' },
    ],
  },

  mesh: {
    id: 'mesh',
    name: 'Mesh',
    description: 'Crossing routes — creates traffic for man coverage',
    routes: [
      { role: 'slot_right', routeType: 'cross', color: '#ef4444' },
      { role: 'slot_left',  routeType: 'cross', color: '#3b82f6' },
    ],
  },

  four_verts: {
    id: 'four_verts',
    name: 'Four Verts',
    description: 'Four Go routes — stresses every coverage',
    routes: [
      { role: 'outside_left',  routeType: 'go', color: '#ef4444' },
      { role: 'slot_left',     routeType: 'go', color: '#ef4444' },
      { role: 'slot_right',    routeType: 'go', color: '#ef4444' },
      { role: 'outside_right', routeType: 'go', color: '#ef4444' },
    ],
  },

  flood: {
    id: 'flood',
    name: 'Flood',
    description: 'Corner + Flat + Seam — three levels on one side',
    routes: [
      { role: 'outside_right', routeType: 'corner',  color: '#ef4444' },
      { role: 'slot_right',    routeType: 'in',      color: '#3b82f6' },
      { role: 'backfield',     routeType: 'screen',  color: '#10b981' },
    ],
  },

  spacing: {
    id: 'spacing',
    name: 'Spacing',
    description: 'Five Hitches — quick rhythm vs. zone',
    routes: [
      { role: 'outside_left',  routeType: 'hitch', color: '#ef4444' },
      { role: 'slot_left',     routeType: 'hitch', color: '#ef4444' },
      { role: 'te',            routeType: 'hitch', color: '#ef4444' },
      { role: 'slot_right',    routeType: 'hitch', color: '#ef4444' },
      { role: 'outside_right', routeType: 'hitch', color: '#ef4444' },
    ],
  },
};

// ── Role → player resolver ────────────────────────────────────────────────────

/**
 * Sort eligible receivers by X position (left → right).
 * @param {Array} players
 * @returns {Array}
 */
function sortByX(players) {
  return [...players].sort((a, b) => a.x - b.x);
}

/**
 * Resolve a role string to a player from the available receivers.
 *
 * Roles:
 *   outside_left  → leftmost receiver
 *   outside_right → rightmost receiver
 *   slot_left     → second from left (or leftmost if fewer)
 *   slot_right    → second from right (or rightmost if fewer)
 *   backfield     → RB or FB, fallback to innermost receiver
 *   te            → TE, fallback to slot_right logic
 *
 * @param {string} role
 * @param {Array} sortedReceivers - receivers sorted left → right
 * @param {Array} allPlayers
 * @returns {{ player: Object|null, isLeft: boolean }}
 */
function resolveRole(role, sortedReceivers, allPlayers, fieldCenterX) {
  const n = sortedReceivers.length;
  if (n === 0) return { player: null, isLeft: false };

  switch (role) {
    case 'outside_left': {
      const player = sortedReceivers[0];
      return { player, isLeft: player.x < fieldCenterX };
    }
    case 'outside_right': {
      const player = sortedReceivers[n - 1];
      return { player, isLeft: player.x < fieldCenterX };
    }
    case 'slot_left': {
      const player = sortedReceivers[Math.min(1, n - 1)];
      return { player, isLeft: player.x < fieldCenterX };
    }
    case 'slot_right': {
      const player = sortedReceivers[Math.max(n - 2, 0)];
      return { player, isLeft: player.x < fieldCenterX };
    }
    case 'backfield': {
      const rb = allPlayers.find(p => p.position === 'RB' || p.position === 'FB');
      if (rb) return { player: rb, isLeft: rb.x < fieldCenterX };
      // Fallback: innermost receiver
      const mid = sortedReceivers[Math.floor(n / 2)];
      return { player: mid, isLeft: mid.x < fieldCenterX };
    }
    case 'te': {
      const te = allPlayers.find(p => p.position === 'TE');
      if (te) return { player: te, isLeft: te.x < fieldCenterX };
      // Fallback: slot_right
      const player = sortedReceivers[Math.max(n - 2, 0)];
      return { player, isLeft: player.x < fieldCenterX };
    }
    default:
      return { player: sortedReceivers[0], isLeft: false };
  }
}

// ── Main API ──────────────────────────────────────────────────────────────────

/**
 * Assign a named concept's routes to players.
 *
 * @param {string} conceptId - Key from CONCEPTS (e.g. 'smash')
 * @param {Array}  players   - All players on the field
 * @param {number} [fieldCenterX=400] - X midpoint for left/right determination
 * @returns {Array<{ player: Object, routeType: string, color: string }>}
 *          Assignments (player may be null if not enough receivers)
 */
export function assignConcept(conceptId, players, fieldCenterX = 400) {
  const concept = CONCEPTS[conceptId];
  if (!concept) return [];

  const eligibleReceivers = players.filter(isEligibleReceiver);
  const sorted = sortByX(eligibleReceivers);

  const assignments = [];
  const used = new Set(); // avoid assigning two routes to the same player

  for (const roleDef of concept.routes) {
    const { player, isLeft } = resolveRole(
      roleDef.role,
      sorted,
      players,
      fieldCenterX
    );

    if (!player) continue;

    // If this player is already assigned, skip (concept has more routes than receivers)
    if (used.has(player.id)) continue;
    used.add(player.id);

    assignments.push({
      player,
      routeType: roleDef.routeType,
      color: roleDef.color,
      isLeft,
    });
  }

  return assignments;
}

/**
 * Build an array of route objects (ready to add to state) from concept assignments.
 *
 * @param {string} conceptId
 * @param {Array}  players
 * @param {number} [fieldCenterX=400]
 * @returns {Array} Route objects compatible with PlayController.createRoute
 */
export function buildConceptRoutes(conceptId, players, fieldCenterX = 400) {
  const assignments = assignConcept(conceptId, players, fieldCenterX);

  return assignments.map(({ player, routeType, color, isLeft }) => {
    const points = generateRoutePoints(routeType, player, isLeft);
    return createRoute(player.id, points, routeType, color);
  });
}

export const CONCEPT_LIST = Object.values(CONCEPTS);
