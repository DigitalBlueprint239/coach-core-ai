import React, { createContext, useContext, useReducer, useEffect } from 'react';

// --- Types ---

export interface RoutePoint {
  x: number;
  y: number;
}

export interface PlayerData {
  id: string;
  x: number;
  y: number;
  position: string;
  number?: number;
  selected: boolean;
  createdAt: string;
}

export interface RouteData {
  id: string;
  playerId: string;
  points: RoutePoint[];
  type: string;
  color: string;
  createdAt: string;
}

export interface Play {
  id: string;
  name: string;
  phase: string;
  type: string;
  players: PlayerData[];
  routes: RouteData[];
  hashMark?: string;
  createdAt: string;
  updatedAt: string;
}

interface StateSnapshot {
  plays: Play[];
  activePlayId: string;
}

export interface PlaybookState {
  plays: Play[];
  activePlayId: string;
  history: StateSnapshot[];
  future: StateSnapshot[];
}

// --- Constants ---

const FIELD_WIDTH = 600;
const FIELD_HEIGHT = 300;
const MAX_HISTORY = 50;
const DEFAULT_FORMATION_ID = 'shotgun';

// --- Helper: Create a play from a formation ---

function createPlayFromFormation(
  _formationId: string,
  fieldWidth: number,
  fieldHeight: number,
  name: string
): Play {
  const centerX = fieldWidth / 2;
  const centerY = fieldHeight / 2;
  const spacing = 48;
  const now = new Date().toISOString();
  const id = `play-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const makePlayer = (
    x: number,
    y: number,
    position: string,
    num: number
  ): PlayerData => ({
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    x,
    y,
    position,
    number: num,
    selected: false,
    createdAt: now,
  });

  // Default shotgun formation
  const players: PlayerData[] = [
    makePlayer(centerX - spacing * 2, centerY, 'LT', 76),
    makePlayer(centerX - spacing, centerY, 'LG', 66),
    makePlayer(centerX, centerY, 'C', 55),
    makePlayer(centerX + spacing, centerY, 'RG', 67),
    makePlayer(centerX + spacing * 2, centerY, 'RT', 77),
    makePlayer(centerX, centerY + 56, 'QB', 12),
    makePlayer(centerX - spacing, centerY + 72, 'RB', 21),
    makePlayer(centerX - spacing * 4, centerY, 'WR', 80),
    makePlayer(centerX + spacing * 4, centerY, 'WR', 81),
    makePlayer(centerX - spacing * 2.5, centerY - 32, 'WR', 11),
    makePlayer(centerX + spacing * 2.5, centerY + 32, 'TE', 88),
  ];

  return {
    id,
    name,
    phase: 'offense',
    type: 'pass',
    players,
    routes: [],
    createdAt: now,
    updatedAt: now,
  };
}

// --- Helpers for route management ---

function addRouteToPlay(play: Play, route: RouteData): Play {
  return {
    ...play,
    routes: [...play.routes, route],
    updatedAt: new Date().toISOString(),
  };
}

function clearPlayerRoutesInPlay(play: Play, playerId: string): Play {
  return {
    ...play,
    routes: play.routes.filter((r) => r.playerId !== playerId),
    updatedAt: new Date().toISOString(),
  };
}

// --- History helpers ---

function snapshotState(state: PlaybookState): StateSnapshot {
  return {
    plays: JSON.parse(JSON.stringify(state.plays)),
    activePlayId: state.activePlayId,
  };
}

function withHistory(
  state: PlaybookState,
  changes: Partial<PlaybookState>
): PlaybookState {
  const snapshot = snapshotState(state);
  const history = [...state.history, snapshot].slice(-MAX_HISTORY);
  return { ...state, ...changes, history, future: [] };
}

// --- Actions ---

export type PlaybookAction =
  | { type: 'ADD_PLAY' }
  | { type: 'SET_ACTIVE_PLAY'; payload: { playId: string } }
  | { type: 'ADD_ROUTE'; payload: { playId: string; route: RouteData } }
  | {
      type: 'UPDATE_ROUTE';
      payload: { playId: string; routeId: string; updates: Partial<RouteData> };
    }
  | { type: 'CLEAR_PLAYER_ROUTES'; payload: { playId: string; playerId: string } }
  | {
      type: 'MOVE_PLAYER';
      payload: { playId: string; playerId: string; x: number; y: number };
    }
  | { type: 'APPLY_FORMATION'; payload: { playId: string; formationId: string } }
  | { type: 'SET_HASH'; payload: { playId: string; hash: string } }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET_TO_DEFAULT' }
  | { type: 'LOAD_STATE'; payload: { plays: Play[]; activePlayId: string } };

// --- Reducer ---

function playbookReducer(
  state: PlaybookState,
  action: PlaybookAction
): PlaybookState {
  switch (action.type) {
    case 'ADD_PLAY': {
      const newPlay = createPlayFromFormation(
        DEFAULT_FORMATION_ID,
        FIELD_WIDTH,
        FIELD_HEIGHT,
        `New Play ${state.plays.length + 1}`
      );
      return withHistory(state, {
        plays: [...state.plays, newPlay],
        activePlayId: newPlay.id,
      });
    }

    case 'SET_ACTIVE_PLAY': {
      return { ...state, activePlayId: action.payload.playId };
    }

    case 'ADD_ROUTE': {
      const { playId, route } = action.payload;
      return withHistory(state, {
        plays: state.plays.map((play) =>
          play.id === playId ? addRouteToPlay(play, route) : play
        ),
      });
    }

    case 'UPDATE_ROUTE': {
      const { playId, routeId, updates } = action.payload;
      return withHistory(state, {
        plays: state.plays.map((play) =>
          play.id === playId
            ? {
                ...play,
                routes: play.routes.map((r) =>
                  r.id === routeId ? { ...r, ...updates } : r
                ),
                updatedAt: new Date().toISOString(),
              }
            : play
        ),
      });
    }

    case 'CLEAR_PLAYER_ROUTES': {
      const { playId, playerId } = action.payload;
      return withHistory(state, {
        plays: state.plays.map((play) =>
          play.id === playId ? clearPlayerRoutesInPlay(play, playerId) : play
        ),
      });
    }

    case 'MOVE_PLAYER': {
      const { playId, playerId, x, y } = action.payload;
      return withHistory(state, {
        plays: state.plays.map((play) =>
          play.id === playId
            ? {
                ...play,
                players: play.players.map((p) =>
                  p.id === playerId ? { ...p, x, y } : p
                ),
                updatedAt: new Date().toISOString(),
              }
            : play
        ),
      });
    }

    case 'APPLY_FORMATION': {
      const { playId, formationId } = action.payload;
      const existingPlay = state.plays.find((p) => p.id === playId);
      if (!existingPlay) return state;
      const newPlay = createPlayFromFormation(
        formationId,
        FIELD_WIDTH,
        FIELD_HEIGHT,
        existingPlay.name
      );
      return withHistory(state, {
        plays: state.plays.map((play) =>
          play.id === playId
            ? { ...play, players: newPlay.players, routes: [], updatedAt: new Date().toISOString() }
            : play
        ),
      });
    }

    case 'SET_HASH': {
      const { playId, hash } = action.payload;
      return withHistory(state, {
        plays: state.plays.map((play) =>
          play.id === playId
            ? { ...play, hashMark: hash, updatedAt: new Date().toISOString() }
            : play
        ),
      });
    }

    case 'UNDO': {
      if (state.history.length === 0) return state;
      const previous = state.history[state.history.length - 1];
      const newHistory = state.history.slice(0, -1);
      const currentSnapshot = snapshotState(state);
      return {
        ...state,
        plays: previous.plays,
        activePlayId: previous.activePlayId,
        history: newHistory,
        future: [currentSnapshot, ...state.future],
      };
    }

    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      const currentSnapshot = snapshotState(state);
      return {
        ...state,
        plays: next.plays,
        activePlayId: next.activePlayId,
        history: [...state.history, currentSnapshot],
        future: newFuture,
      };
    }

    case 'RESET_TO_DEFAULT': {
      const defaultPlay = createPlayFromFormation(
        DEFAULT_FORMATION_ID,
        FIELD_WIDTH,
        FIELD_HEIGHT,
        'New Play 1'
      );
      return {
        plays: [defaultPlay],
        activePlayId: defaultPlay.id,
        history: [],
        future: [],
      };
    }

    case 'LOAD_STATE': {
      return {
        ...state,
        plays: action.payload.plays,
        activePlayId: action.payload.activePlayId,
        history: [],
        future: [],
      };
    }

    default:
      return state;
  }
}

// --- Initial state ---

function createInitialState(): PlaybookState {
  const defaultPlay = createPlayFromFormation(
    DEFAULT_FORMATION_ID,
    FIELD_WIDTH,
    FIELD_HEIGHT,
    'New Play 1'
  );
  return {
    plays: [defaultPlay],
    activePlayId: defaultPlay.id,
    history: [],
    future: [],
  };
}

// --- Context ---

interface PlaybookContextValue {
  state: PlaybookState;
  dispatch: React.Dispatch<PlaybookAction>;
}

const PlaybookDataContext = createContext<PlaybookContextValue | null>(null);

export function usePlaybookData(): PlaybookContextValue {
  const ctx = useContext(PlaybookDataContext);
  if (!ctx) {
    throw new Error('usePlaybookData must be used within a PlaybookDataProvider');
  }
  return ctx;
}

// --- Provider ---

export function PlaybookDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(
    playbookReducer,
    undefined,
    createInitialState
  );

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
      }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        dispatch({ type: 'REDO' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <PlaybookDataContext.Provider value={{ state, dispatch }}>
      {children}
    </PlaybookDataContext.Provider>
  );
}

export default PlaybookDataContext;
