export interface Player {
  id: string;
  x: number;
  y: number;
  position: string;
  number: number;
  selected?: boolean;
  [key: string]: unknown;
}

export interface Route {
  id: string;
  playerId: string;
  points: { x: number; y: number }[];
  type: string;
  color: string;
  [key: string]: unknown;
}

export interface SavedPlay {
  id: string;
  name: string;
  phase: string;
  type: string;
  players: Player[];
  routes: Route[];
  createdAt: number;
  [key: string]: unknown;
}

export interface UndoState {
  players: Player[];
  routes: Route[];
  action?: string;
  timestamp?: number;
}

export const PLAYER_POSITIONS: Record<string, string[]>;
export const ROUTE_TYPES: string[];
export const ROUTE_COLORS: Record<string, string>;

export function hasDuplicateNumber(players: Player[], number: number, excludeId?: string | null): boolean;
export function hasDuplicatePosition(players: Player[], position: string, excludeId?: string | null): boolean;
export function createPlayer(x: number, y: number, position: string, number: number): Player;
export function createRoute(playerId: string, points: { x: number; y: number }[], type?: string, color?: string): Route;
export function addPlayer(players: Player[], player: Player): Player[];
export function removePlayer(players: Player[], playerId: string): Player[];
export function selectPlayer(players: Player[], playerId: string): Player[];
export function deselectAll(players: Player[]): Player[];
export function updatePlayerPosition(players: Player[], playerId: string, x: number, y: number): Player[];
export function addRoute(routes: Route[], route: Route): Route[];
export function removeRoute(routes: Route[], routeId: string): Route[];
export function savePlay(options: { name: string; phase: string; type: string; players: Player[]; routes: Route[] }): SavedPlay;
export function undo(undoStack: UndoState[], redoStack: UndoState[], currentState: UndoState): [UndoState, UndoState[], UndoState[]];
export function redo(undoStack: UndoState[], redoStack: UndoState[], currentState: UndoState): [UndoState, UndoState[], UndoState[]];
export function shotgunFormation(centerX: number, centerY: number, spacing?: number): Player[];
export function fourThreeFormation(centerX: number, centerY: number, spacing?: number): Player[];
export function calculateDistance(point1: { x: number; y: number }, point2: { x: number; y: number }): number;
export function findPlayerAtPosition(players: Player[], x: number, y: number, threshold?: number): Player | null;
