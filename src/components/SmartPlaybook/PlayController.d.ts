export interface PlaybookPlayer {
  id: string;
  x: number;
  y: number;
  position: string;
  number: number;
  selected: boolean;
  createdAt: string;
}

export interface RoutePoint {
  x: number;
  y: number;
}

export interface PlaybookRoute {
  id: string;
  playerId: string;
  points: RoutePoint[];
  type: string;
  color: string;
  createdAt: string;
}

export interface SavedPlay {
  id: string;
  name: string;
  phase: string;
  type: string;
  players: PlaybookPlayer[];
  routes: PlaybookRoute[];
  createdAt: string;
}

export declare const PLAYER_POSITIONS: {
  OFFENSE: string[];
  DEFENSE: string[];
};

export declare const ROUTE_TYPES: string[];

export declare const ROUTE_COLORS: {
  default: string;
  primary: string;
  secondary: string;
  warning: string;
};

export declare function createPlayer(x: number, y: number, position: string, number: number): PlaybookPlayer;
export declare function createRoute(playerId: string, points: RoutePoint[], type?: string, color?: string): PlaybookRoute;
export declare function addPlayer(players: PlaybookPlayer[], player: PlaybookPlayer): PlaybookPlayer[];
export declare function removePlayer(players: PlaybookPlayer[], playerId: string): PlaybookPlayer[];
export declare function selectPlayer(players: PlaybookPlayer[], playerId: string): PlaybookPlayer[];
export declare function deselectAll(players: PlaybookPlayer[]): PlaybookPlayer[];
export declare function updatePlayerPosition(players: PlaybookPlayer[], playerId: string, x: number, y: number): PlaybookPlayer[];
export declare function addRoute(routes: PlaybookRoute[], route: PlaybookRoute): PlaybookRoute[];
export declare function removeRoute(routes: PlaybookRoute[], routeId: string): PlaybookRoute[];
export declare function savePlay(playData: { name: string; phase: string; type: string; players: PlaybookPlayer[]; routes: PlaybookRoute[] }): SavedPlay;
export declare function undo(undoStack: UndoState[], redoStack: UndoState[], currentState: { players: PlaybookPlayer[]; routes: PlaybookRoute[] }): [{ players: PlaybookPlayer[]; routes: PlaybookRoute[] }, UndoState[], UndoState[]];
export declare function redo(undoStack: UndoState[], redoStack: UndoState[], currentState: { players: PlaybookPlayer[]; routes: PlaybookRoute[] }): [{ players: PlaybookPlayer[]; routes: PlaybookRoute[] }, UndoState[], UndoState[]];
export declare function shotgunFormation(centerX: number, centerY: number): PlaybookPlayer[];
export declare function fourThreeFormation(centerX: number, centerY: number): PlaybookPlayer[];
export declare function findPlayerAtPosition(players: PlaybookPlayer[], x: number, y: number, threshold: number): PlaybookPlayer | null;
export declare function calculateDistance(x1: number, y1: number, x2: number, y2: number): number;
export declare const hasDuplicateNumber: (players: PlaybookPlayer[], number: number, excludeId?: string | null) => boolean;
export declare const hasDuplicatePosition: (players: PlaybookPlayer[], position: string, excludeId?: string | null) => boolean;

export interface UndoState {
  players: PlaybookPlayer[];
  routes: PlaybookRoute[];
  action: string;
  timestamp: number;
}
