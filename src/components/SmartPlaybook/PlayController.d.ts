export interface PlayControllerPlayer {
  id: string;
  x: number;
  y: number;
  position: string;
  number: number;
  selected: boolean;
  createdAt: string;
}

export interface PlayControllerPoint {
  x: number;
  y: number;
}

export interface PlayControllerRoute {
  id: string;
  playerId: string;
  points: PlayControllerPoint[];
  type: string;
  color: string;
  createdAt: string;
}

export interface PlayControllerSavedPlay {
  id: string;
  name: string;
  phase: string;
  type: string;
  players: PlayControllerPlayer[];
  routes: PlayControllerRoute[];
  createdAt: string;
  updatedAt: string;
}

export interface PlayControllerState {
  players: PlayControllerPlayer[];
  routes: PlayControllerRoute[];
}

export const PLAYER_POSITIONS: {
  OFFENSE: string[];
  DEFENSE: string[];
};

export const ROUTE_TYPES: string[];

export const ROUTE_COLORS: {
  default: string;
  primary: string;
  secondary: string;
  warning: string;
};

export function createPlayer(x: number, y: number, position: string, number: number): PlayControllerPlayer;
export function createRoute(playerId: string, points: PlayControllerPoint[], type?: string, color?: string): PlayControllerRoute;
export function addPlayer(players: PlayControllerPlayer[], player: PlayControllerPlayer): PlayControllerPlayer[];
export function removePlayer(players: PlayControllerPlayer[], playerId: string): PlayControllerPlayer[];
export function selectPlayer(players: PlayControllerPlayer[], playerId: string): PlayControllerPlayer[];
export function deselectAll(players: PlayControllerPlayer[]): PlayControllerPlayer[];
export function updatePlayerPosition(players: PlayControllerPlayer[], playerId: string, x: number, y: number): PlayControllerPlayer[];
export function addRoute(routes: PlayControllerRoute[], route: PlayControllerRoute): PlayControllerRoute[];
export function removeRoute(routes: PlayControllerRoute[], routeId: string): PlayControllerRoute[];
export function savePlay(playData: { name: string; phase: string; type: string; players: PlayControllerPlayer[]; routes: PlayControllerRoute[] }): PlayControllerSavedPlay;
export function undo(undoStack: PlayControllerState[], redoStack: PlayControllerState[], currentState: PlayControllerState): [PlayControllerState, PlayControllerState[], PlayControllerState[]];
export function redo(undoStack: PlayControllerState[], redoStack: PlayControllerState[], currentState: PlayControllerState): [PlayControllerState, PlayControllerState[], PlayControllerState[]];
export function shotgunFormation(centerX: number, centerY: number, spacing?: number): PlayControllerPlayer[];
export function fourThreeFormation(centerX: number, centerY: number, spacing?: number): PlayControllerPlayer[];
export function calculateDistance(point1: PlayControllerPoint, point2: PlayControllerPoint): number;
export function findPlayerAtPosition(players: PlayControllerPlayer[], x: number, y: number, threshold?: number): PlayControllerPlayer | null;
export function hasDuplicateNumber(players: PlayControllerPlayer[], number: number, excludeId?: string | null): boolean;
export function hasDuplicatePosition(players: PlayControllerPlayer[], position: string, excludeId?: string | null): boolean;
