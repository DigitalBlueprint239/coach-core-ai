/**
 * PlayController.js – Core utilities for managing football plays
 * - Pure functions for player and route management
 * - Immutable operations for predictable state updates
 * - Comprehensive error handling and validation
 */

// Position constants for better maintainability
export const PLAYER_POSITIONS = {
  OFFENSE: ['QB', 'RB', 'WR', 'TE', 'FB', 'LT', 'LG', 'C', 'RG', 'RT'],
  DEFENSE: ['DE', 'DT', 'NT', 'MLB', 'OLB', 'CB', 'FS', 'SS', 'NB', 'LB']
};

// Route types for validation
export const ROUTE_TYPES = ['custom', 'slant', 'post', 'corner', 'out', 'in', 'hitch', 'go'];

// Default colors for routes
export const ROUTE_COLORS = {
  default: '#ef4444',
  primary: '#3b82f6',
  secondary: '#10b981',
  warning: '#f59e0b'
};

/**
 * Generate a unique ID with timestamp and random component
 * @returns {string} Unique identifier
 */
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Validate player data
 * @param {Object} player - Player object to validate
 * @returns {boolean} True if valid
 */
const validatePlayer = (player) => {
  if (!player || typeof player !== 'object') return false;
  if (typeof player.x !== 'number' || typeof player.y !== 'number') return false;
  if (!player.position || typeof player.position !== 'string') return false;
  if (player.number !== undefined && (typeof player.number !== 'number' || player.number < 0)) return false;
  return true;
};

/**
 * Check for duplicate player numbers
 * @param {Array} players - Current players array
 * @param {number} number - Number to check
 * @param {string} excludeId - Player ID to exclude from check
 * @returns {boolean} True if duplicate found
 */
export const hasDuplicateNumber = (players, number, excludeId = null) => {
  return players.some(player => 
    player.number === number && player.id !== excludeId
  );
};

/**
 * Check for duplicate player positions
 * @param {Array} players - Current players array
 * @param {string} position - Position to check
 * @param {string} excludeId - Player ID to exclude from check
 * @returns {boolean} True if duplicate found
 */
export const hasDuplicatePosition = (players, position, excludeId = null) => {
  return players.some(player => 
    player.position === position && player.id !== excludeId
  );
};

/**
 * Validate route data
 * @param {Object} route - Route object to validate
 * @returns {boolean} True if valid
 */
const validateRoute = (route) => {
  if (!route || typeof route !== 'object') return false;
  if (!route.playerId || typeof route.playerId !== 'string') return false;
  if (!route.points || !Array.isArray(route.points) || route.points.length < 2) return false;
  if (route.type && !ROUTE_TYPES.includes(route.type)) return false;
  if (route.color && typeof route.color !== 'string') return false;
  return true;
};

/**
 * Create a new player with validation
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {string} position - Player position
 * @param {number} [number] - Player number
 * @returns {Object} Player object
 */
export function createPlayer(x, y, position, number) {
  // Input validation
  if (typeof x !== 'number' || typeof y !== 'number') {
    throw new Error('Player coordinates must be numbers');
  }
  
  if (!position || typeof position !== 'string') {
    throw new Error('Player position is required and must be a string');
  }
  
  if (!PLAYER_POSITIONS.OFFENSE.includes(position) && !PLAYER_POSITIONS.DEFENSE.includes(position)) {
    console.warn(`Unknown position: ${position}`);
  }
  
  if (number !== undefined && (typeof number !== 'number' || number < 0)) {
    throw new Error('Player number must be a non-negative number');
  }

  return {
    id: generateId(),
    x,
    y,
    position,
    number,
    selected: false,
    createdAt: new Date().toISOString()
  };
}

/**
 * Create a new route with validation
 * @param {string} playerId - ID of the player this route belongs to
 * @param {Array} points - Array of {x, y} coordinate objects
 * @param {string} [type='custom'] - Route type
 * @param {string} [color] - Route color
 * @returns {Object} Route object
 */
export function createRoute(playerId, points, type = 'custom', color = ROUTE_COLORS.default) {
  // Input validation
  if (!playerId || typeof playerId !== 'string') {
    throw new Error('Player ID is required and must be a string');
  }
  
  if (!Array.isArray(points) || points.length < 2) {
    throw new Error('Route must have at least 2 points');
  }
  
  // Validate each point
  points.forEach((point, index) => {
    if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') {
      throw new Error(`Invalid point at index ${index}: ${JSON.stringify(point)}`);
    }
  });
  
  if (type && !ROUTE_TYPES.includes(type)) {
    throw new Error(`Invalid route type: ${type}. Must be one of: ${ROUTE_TYPES.join(', ')}`);
  }
  
  if (color && typeof color !== 'string') {
    throw new Error('Route color must be a string');
  }

  return {
    id: generateId(),
    playerId,
    points: [...points], // Create a copy to prevent mutation
    type,
    color,
    createdAt: new Date().toISOString()
  };
}

/**
 * Add a player to the players array (immutable)
 * @param {Array} players - Current players array
 * @param {Object} player - Player to add
 * @returns {Array} New players array
 */
export function addPlayer(players, player) {
  if (!Array.isArray(players)) {
    throw new Error('Players must be an array');
  }
  
  if (!validatePlayer(player)) {
    throw new Error('Invalid player data');
  }
  
  // Check for duplicate IDs
  if (players.some(p => p.id === player.id)) {
    throw new Error(`Player with ID ${player.id} already exists`);
  }
  
  return [...players, player];
}

/**
 * Remove a player by ID (immutable)
 * @param {Array} players - Current players array
 * @param {string} playerId - ID of player to remove
 * @returns {Array} New players array
 */
export function removePlayer(players, playerId) {
  if (!Array.isArray(players)) {
    throw new Error('Players must be an array');
  }
  
  if (!playerId || typeof playerId !== 'string') {
    throw new Error('Player ID is required and must be a string');
  }
  
  const filtered = players.filter(p => p.id !== playerId);
  
  if (filtered.length === players.length) {
    console.warn(`Player with ID ${playerId} not found`);
  }
  
  return filtered;
}

/**
 * Select a player by ID (immutable)
 * @param {Array} players - Current players array
 * @param {string} playerId - ID of player to select
 * @returns {Array} New players array with selection updated
 */
export function selectPlayer(players, playerId) {
  if (!Array.isArray(players)) {
    throw new Error('Players must be an array');
  }
  
  if (!playerId || typeof playerId !== 'string') {
    throw new Error('Player ID is required and must be a string');
  }
  
  return players.map(p => ({ ...p, selected: p.id === playerId }));
}

/**
 * Deselect all players (immutable)
 * @param {Array} players - Current players array
 * @returns {Array} New players array with all selections cleared
 */
export function deselectAll(players) {
  if (!Array.isArray(players)) {
    throw new Error('Players must be an array');
  }
  
  return players.map(p => ({ ...p, selected: false }));
}

/**
 * Update player position (immutable)
 * @param {Array} players - Current players array
 * @param {string} playerId - ID of player to update
 * @param {number} x - New X coordinate
 * @param {number} y - New Y coordinate
 * @returns {Array} New players array with updated position
 */
export function updatePlayerPosition(players, playerId, x, y) {
  if (!Array.isArray(players)) {
    throw new Error('Players must be an array');
  }
  
  if (!playerId || typeof playerId !== 'string') {
    throw new Error('Player ID is required and must be a string');
  }
  
  if (typeof x !== 'number' || typeof y !== 'number') {
    throw new Error('Coordinates must be numbers');
  }
  
  return players.map(p => 
    p.id === playerId ? { ...p, x, y } : p
  );
}

/**
 * Add a route to the routes array (immutable)
 * @param {Array} routes - Current routes array
 * @param {Object} route - Route to add
 * @returns {Array} New routes array
 */
export function addRoute(routes, route) {
  if (!Array.isArray(routes)) {
    throw new Error('Routes must be an array');
  }
  
  if (!validateRoute(route)) {
    throw new Error('Invalid route data');
  }
  
  // Check for duplicate IDs
  if (routes.some(r => r.id === route.id)) {
    throw new Error(`Route with ID ${route.id} already exists`);
  }
  
  return [...routes, route];
}

/**
 * Remove a route by ID (immutable)
 * @param {Array} routes - Current routes array
 * @param {string} routeId - ID of route to remove
 * @returns {Array} New routes array
 */
export function removeRoute(routes, routeId) {
  if (!Array.isArray(routes)) {
    throw new Error('Routes must be an array');
  }
  
  if (!routeId || typeof routeId !== 'string') {
    throw new Error('Route ID is required and must be a string');
  }
  
  const filtered = routes.filter(r => r.id !== routeId);
  
  if (filtered.length === routes.length) {
    console.warn(`Route with ID ${routeId} not found`);
  }
  
  return filtered;
}

/**
 * Save a play with deep cloning
 * @param {Object} playData - Play data to save
 * @returns {Object} Saved play object
 */
export function savePlay({ name, phase, type, players, routes }) {
  // Input validation
  if (!name || typeof name !== 'string') {
    throw new Error('Play name is required and must be a string');
  }
  
  if (!phase || typeof phase !== 'string') {
    throw new Error('Play phase is required and must be a string');
  }
  
  if (!type || typeof type !== 'string') {
    throw new Error('Play type is required and must be a string');
  }
  
  if (!Array.isArray(players)) {
    throw new Error('Players must be an array');
  }
  
  if (!Array.isArray(routes)) {
    throw new Error('Routes must be an array');
  }
  
  // Validate all players and routes
  players.forEach((player, index) => {
    if (!validatePlayer(player)) {
      throw new Error(`Invalid player at index ${index}`);
    }
  });
  
  routes.forEach((route, index) => {
    if (!validateRoute(route)) {
      throw new Error(`Invalid route at index ${index}`);
    }
  });

  return {
    id: generateId(),
    name: name.trim(),
    phase,
    type,
    players: JSON.parse(JSON.stringify(players)), // Deep clone
    routes: JSON.parse(JSON.stringify(routes)), // Deep clone
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Undo operation for state management
 * @param {Array} undoStack - Stack of previous states
 * @param {Array} redoStack - Stack of future states
 * @param {Object} currentState - Current state
 * @returns {Array} [newState, newUndoStack, newRedoStack]
 */
export function undo(undoStack, redoStack, currentState) {
  if (!Array.isArray(undoStack) || !Array.isArray(redoStack)) {
    throw new Error('Undo and redo stacks must be arrays');
  }
  
  if (!undoStack.length) {
    return [currentState, undoStack, redoStack];
  }
  
  const prev = undoStack[undoStack.length - 1];
  const newUndoStack = undoStack.slice(0, -1);
  const newRedoStack = [currentState, ...redoStack];
  
  return [prev, newUndoStack, newRedoStack];
}

/**
 * Redo operation for state management
 * @param {Array} undoStack - Stack of previous states
 * @param {Array} redoStack - Stack of future states
 * @param {Object} currentState - Current state
 * @returns {Array} [newState, newUndoStack, newRedoStack]
 */
export function redo(undoStack, redoStack, currentState) {
  if (!Array.isArray(undoStack) || !Array.isArray(redoStack)) {
    throw new Error('Undo and redo stacks must be arrays');
  }
  
  if (!redoStack.length) {
    return [currentState, undoStack, redoStack];
  }
  
  const next = redoStack[0];
  const newUndoStack = [currentState, ...undoStack];
  const newRedoStack = redoStack.slice(1);
  
  return [next, newUndoStack, newRedoStack];
}

/**
 * Create a shotgun formation with players
 * @param {number} centerX - Center X coordinate
 * @param {number} centerY - Center Y coordinate
 * @param {number} [spacing=48] - Spacing between players
 * @returns {Array} Array of player objects
 */
export function shotgunFormation(centerX, centerY, spacing = 48) {
  if (typeof centerX !== 'number' || typeof centerY !== 'number') {
    throw new Error('Center coordinates must be numbers');
  }
  
  if (typeof spacing !== 'number' || spacing <= 0) {
    throw new Error('Spacing must be a positive number');
  }

  return [
    createPlayer(centerX - spacing * 2, centerY, 'LT', 76),
    createPlayer(centerX - spacing, centerY, 'LG', 66),
    createPlayer(centerX, centerY, 'C', 55),
    createPlayer(centerX + spacing, centerY, 'RG', 67),
    createPlayer(centerX + spacing * 2, centerY, 'RT', 77),
    createPlayer(centerX, centerY + 56, 'QB', 12),
    createPlayer(centerX - spacing, centerY + 72, 'RB', 21),
    createPlayer(centerX - spacing * 4, centerY, 'WR', 80),
    createPlayer(centerX + spacing * 4, centerY, 'WR', 81),
    createPlayer(centerX - spacing * 2.5, centerY - 32, 'WR', 11),
    createPlayer(centerX + spacing * 2.5, centerY + 32, 'TE', 88)
  ];
}

/**
 * Create a 4-3 defensive formation
 * @param {number} centerX - Center X coordinate
 * @param {number} centerY - Center Y coordinate
 * @param {number} [spacing=48] - Spacing between players
 * @returns {Array} Array of player objects
 */
export function fourThreeFormation(centerX, centerY, spacing = 48) {
  if (typeof centerX !== 'number' || typeof centerY !== 'number') {
    throw new Error('Center coordinates must be numbers');
  }
  
  if (typeof spacing !== 'number' || spacing <= 0) {
    throw new Error('Spacing must be a positive number');
  }

  return [
    createPlayer(centerX - spacing * 2, centerY, 'DE', 91),
    createPlayer(centerX - spacing, centerY, 'DT', 95),
    createPlayer(centerX + spacing, centerY, 'DT', 96),
    createPlayer(centerX + spacing * 2, centerY, 'DE', 92),
    createPlayer(centerX - spacing * 1.5, centerY + 40, 'OLB', 54),
    createPlayer(centerX, centerY + 40, 'MLB', 55),
    createPlayer(centerX + spacing * 1.5, centerY + 40, 'OLB', 56),
    createPlayer(centerX - spacing * 3, centerY, 'CB', 24),
    createPlayer(centerX + spacing * 3, centerY, 'CB', 25),
    createPlayer(centerX - spacing * 1.5, centerY - 40, 'FS', 30),
    createPlayer(centerX + spacing * 1.5, centerY - 40, 'SS', 31)
  ];
}

/**
 * Calculate distance between two points
 * @param {Object} point1 - First point {x, y}
 * @param {Object} point2 - Second point {x, y}
 * @returns {number} Distance between points
 */
export function calculateDistance(point1, point2) {
  if (!point1 || !point2) {
    throw new Error('Both points are required');
  }
  
  if (typeof point1.x !== 'number' || typeof point1.y !== 'number' ||
      typeof point2.x !== 'number' || typeof point2.y !== 'number') {
    throw new Error('Points must have numeric x and y coordinates');
  }
  
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Find player at a specific position
 * @param {Array} players - Players array
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} [threshold=20] - Distance threshold
 * @returns {Object|null} Player object or null if not found
 */
export function findPlayerAtPosition(players, x, y, threshold = 20) {
  if (!Array.isArray(players)) {
    throw new Error('Players must be an array');
  }
  
  if (typeof x !== 'number' || typeof y !== 'number') {
    throw new Error('Coordinates must be numbers');
  }
  
  if (typeof threshold !== 'number' || threshold <= 0) {
    throw new Error('Threshold must be a positive number');
  }

  for (const player of players) {
    const distance = calculateDistance({ x, y }, { x: player.x, y: player.y });
    if (distance <= threshold) {
      return player;
    }
  }
  
  return null;
}
