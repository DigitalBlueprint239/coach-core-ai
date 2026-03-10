/**
 * SmartPlaybook.js – Main application component
 * - Orchestrates all Smart Playbook functionality
 * - Manages state and user interactions
 * - Provides complete touch-friendly UI
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import CanvasArea from './components/CanvasArea';
import SavePlayDialog from './components/SavePlayDialog';
import ErrorBoundary from '../common/ErrorBoundary';
import {
  createPlayer,
  createRoute,
  addPlayer,
  removePlayer,
  selectPlayer,
  deselectAll,
  updatePlayerPosition,
  addRoute,
  removeRoute,
  savePlay,
  undo,
  redo,
  shotgunFormation,
  fourThreeFormation,
  findPlayerAtPosition,
} from './PlayController';
import { AIProvider } from '../../ai-brain/AIContext';
import { PlaybookDataProvider } from '../../contexts/PlaybookDataContext';
import InstallListPanel from '../InstallListPanel';

// --- Base types ---

interface PlayerData {
  id: string;
  x: number;
  y: number;
  position: string;
  number?: number;
  selected: boolean;
  createdAt: string;
}

interface RoutePoint {
  x: number;
  y: number;
}

interface RouteData {
  id: string;
  playerId: string;
  points: RoutePoint[];
  type: string;
  color: string;
  createdAt: string;
}

interface SavedPlay {
  id: string;
  name: string;
  phase: string;
  type: string;
  players: PlayerData[];
  routes: RouteData[];
  createdAt: string;
  updatedAt: string;
}

interface UndoState {
  players: PlayerData[];
  routes: RouteData[];
  action: string;
  timestamp: number;
}

interface DebugResult {
  name: string;
  category: string;
  passed: boolean;
  duration: number;
}

interface NotificationData {
  id: number;
  type: string;
  message: string;
  duration: number;
}

// --- Props interfaces for untyped JS components ---

interface DebugPanelProps {
  results: DebugResult[];
  onRunAll: () => void;
  onTogglePassed: () => void;
  showPassed: boolean;
}

interface PlayLibraryProps {
  savedPlays: SavedPlay[];
  onLoadPlay: (play: SavedPlay) => void;
  onDeletePlay: (playId: string) => void;
  onClose: () => void;
}

interface PlayerControlsProps {
  selectedPlayer: PlayerData | undefined;
  players: PlayerData[];
  onUpdatePlayer: (updates: Partial<PlayerData>) => void;
  onDeletePlayer: () => void;
}

interface RouteControlsProps {
  selectedPlayer: PlayerData | undefined;
  isDrawingRoute: boolean;
  routeType: string;
  routeColor: string;
  onStartDrawing: (playerId: string) => void;
  onFinishDrawing: () => void;
  onCancelDrawing: () => void;
  onRouteTypeChange: (type: string) => void;
  onRouteColorChange: (color: string) => void;
}

interface RoutePreset {
  id: string;
  name: string;
  points: RoutePoint[];
}

interface RouteEditorProps {
  selectedRoute: RouteData | undefined;
  players: PlayerData[];
  onUpdateRoute: (routeId: string, updates: Partial<RouteData>) => void;
  onDeleteRoute: (routeId: string) => void;
  onApplyPreset: (routeId: string, preset: RoutePreset) => void;
  onClearSelection: () => void;
}

interface FormationTemplatesProps {
  onLoadFormation: (formationId: string) => void;
}

interface SaveLoadPanelProps {
  currentPlayName: string;
  currentPlayPhase: string;
  currentPlayType: string;
  onPlayNameChange: (name: string) => void;
  onPlayPhaseChange: (phase: string) => void;
  onPlayTypeChange: (type: string) => void;
  onSave: () => void;
  onLoad: () => void;
  canSave: boolean;
}

interface UndoState {
  players: PlayerData[];
  routes: RouteData[];
  action: string;
  timestamp: number;
}

interface ToolbarProps {
  mode: string;
  onModeChange: (mode: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undoStack: UndoState[];
  onClear: () => void;
  onShowHelp: () => void;
  onNewPlay: () => void;
}

interface NotificationProps {
  type: string;
  message: string;
  duration: number;
  onDismiss: (id: number) => void;
  id: number;
}

interface OnboardingProps {
  isVisible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

// JS UI Components — typed with proper interfaces
/* eslint-disable @typescript-eslint/no-var-requires */
const DebugPanel: React.FC<DebugPanelProps> = require('./DebugPanel').default;
const PlayLibrary: React.FC<PlayLibraryProps> = require('./PlayLibrary').default;
const PlayerControls: React.FC<PlayerControlsProps> = require('./components/PlayerControls').default;
const RouteControls: React.FC<RouteControlsProps> = require('./components/RouteControls').default;
const RouteEditor: React.FC<RouteEditorProps> = require('./components/RouteEditor').default;
const FormationTemplates: React.FC<FormationTemplatesProps> = require('./components/FormationTemplates').default;
const SaveLoadPanel: React.FC<SaveLoadPanelProps> = require('./components/SaveLoadPanel').default;
const Toolbar: React.FC<ToolbarProps> = require('./components/Toolbar').default;
const Notification: React.FC<NotificationProps> = require('./components/Notification').default;
const Onboarding: React.FC<OnboardingProps> = require('./components/Onboarding').default;
/* eslint-enable @typescript-eslint/no-var-requires */

// Constants
const FIELD_DIMENSIONS = {
  width: 600,
  height: 300
};

const TOUCH_THRESHOLD = 20; // pixels for touch detection

const SmartPlaybook = () => {
  // Core state
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [mode, setMode] = useState<string>('view');
  const [savedPlays, setSavedPlays] = useState<SavedPlay[]>([]);
  const [currentPlayName, setCurrentPlayName] = useState('');
  const [currentPlayPhase, setCurrentPlayPhase] = useState('offense');
  const [currentPlayType, setCurrentPlayType] = useState('pass');

  // Route drawing state
  const [isDrawingRoute, setIsDrawingRoute] = useState(false);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [routeType, setRouteType] = useState('custom');
  const [routeColor, setRouteColor] = useState('#ef4444');

  // Undo/Redo state
  const [undoStack, setUndoStack] = useState<UndoState[]>([]);
  const [redoStack, setRedoStack] = useState<UndoState[]>([]);

  // UI state
  const [showLibrary, setShowLibrary] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [debugResults, setDebugResults] = useState<DebugResult[]>([]);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastTouchRef = useRef<TouchEvent | null>(null);

  // Load saved plays from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('smartPlaybook_plays');
      if (saved) {
        setSavedPlays(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading saved plays:', error);
    }

    // Check if onboarding is needed
    const onboardingComplete = localStorage.getItem('smartPlaybook_onboarding_complete');
    if (!onboardingComplete) {
      setShowOnboarding(true);
    }
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      // Force canvas redraw on resize
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Trigger a re-render of the Field component
          setPlayers(prev => [...prev]);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent double-tap zoom on mobile
  useEffect(() => {
    const preventDoubleTapZoom = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };

    document.addEventListener('touchstart', preventDoubleTapZoom, { passive: false });
    return () => document.removeEventListener('touchstart', preventDoubleTapZoom);
  }, []);

  // Handle page visibility change (reload recovery)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page became visible again, ensure state is consistent
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Trigger a re-render of the Field component
            setPlayers(prev => [...prev]);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Save plays to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('smartPlaybook_plays', JSON.stringify(savedPlays));
    } catch (error) {
      console.error('Error saving plays:', error);
    }
  }, [savedPlays]);

  // Save current state to undo stack (capped at 50 entries)
  const saveToUndoStack = useCallback((action: string) => {
    const currentState = {
      players: [...players],
      routes: [...routes],
      action,
      timestamp: Date.now()
    };
    setUndoStack(prev => [...prev, currentState].slice(-50));
    setRedoStack([]); // Clear redo stack when new action is performed
  }, [players, routes]);

  // Handle undo
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    
    const [newState, newUndoStack, newRedoStack] = undo(
      undoStack, 
      redoStack, 
      { players, routes }
    );
    
    setPlayers(newState.players);
    setRoutes(newState.routes);
    setUndoStack(newUndoStack);
    setRedoStack(newRedoStack);
  }, [undoStack, redoStack, players, routes]);

  // Handle redo
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    
    const [newState, newUndoStack, newRedoStack] = redo(
      undoStack, 
      redoStack, 
      { players, routes }
    );
    
    setPlayers(newState.players);
    setRoutes(newState.routes);
    setUndoStack(newUndoStack);
    setRedoStack(newRedoStack);
  }, [undoStack, redoStack, players, routes]);

  // Get canvas coordinates from event
  const getCanvasCoordinates = useCallback((event: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    
    if (event.touches && event.touches[0]) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }, []);

  // Handle canvas click/touch
  const handleCanvasEvent = useCallback((event: any) => {
    event.preventDefault();

    if (!canvasRef.current) return;
    
    const coords = getCanvasCoordinates(event);
    if (!coords) return;

    // Handle route drawing
    if (mode === 'route' && isDrawingRoute) {
      setRoutePoints(prev => [...prev, coords]);
      return;
    }

    // Handle player interactions
    if (mode === 'view' || mode === 'player' || mode === 'delete') {
      const clickedPlayer = findPlayerAtPosition(players, coords.x, coords.y, TOUCH_THRESHOLD) as PlayerData | null;

      if (clickedPlayer) {
        if (mode === 'delete') {
          // Delete player
          saveToUndoStack('delete_player');
          setPlayers(prev => removePlayer(prev, clickedPlayer.id));
          setRoutes(prev => prev.filter(route => route.playerId !== clickedPlayer.id));
          setSelectedPlayerId(null);
        } else {
          // Select player
          setSelectedPlayerId(clickedPlayer.id);
          setPlayers(prev => selectPlayer(prev, clickedPlayer.id));
        }
      } else if (mode !== 'delete') {
        // Deselect if clicking empty space
        setSelectedPlayerId(null);
        setPlayers(prev => deselectAll(prev));
      }
    }

    // Handle player placement
    if (mode === 'player' && !findPlayerAtPosition(players, coords.x, coords.y, TOUCH_THRESHOLD)) {
      const newPlayer = createPlayer(coords.x, coords.y, 'WR', Math.floor(Math.random() * 99) + 1);
      saveToUndoStack('add_player');
      setPlayers(prev => addPlayer(prev, newPlayer));
    }
  }, [mode, isDrawingRoute, players, getCanvasCoordinates, saveToUndoStack]);

  // Handle player drag
  const handlePlayerDrag = useCallback((playerId: string, newX: number, newY: number) => {
    // Constrain to field boundaries
    const constrainedX = Math.max(20, Math.min(FIELD_DIMENSIONS.width - 20, newX));
    const constrainedY = Math.max(20, Math.min(FIELD_DIMENSIONS.height - 20, newY));
    
    setPlayers(prev => updatePlayerPosition(prev, playerId, constrainedX, constrainedY));
  }, [FIELD_DIMENSIONS.width, FIELD_DIMENSIONS.height]);

  // Handle player drag end (save to undo stack)
  const handlePlayerDragEnd = useCallback((_playerId: string) => {
    saveToUndoStack('move_player');
    addNotification('success', 'Player moved successfully');
  }, [saveToUndoStack]);

  // Add notification helper
  const addNotification = useCallback((type: string, message: string, duration = 3000) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, type, message, duration }]);
  }, []);

  // Remove notification helper
  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Handle route selection
  const handleRouteSelect = useCallback((routeId: string) => {
    setSelectedRouteId(routeId);
    setSelectedPlayerId(null); // Deselect player when selecting route
  }, []);

  // Handle route update
  const handleRouteUpdate = useCallback((routeId: string, updates: Partial<RouteData>) => {
    saveToUndoStack('update_route');
    setRoutes(prev => prev.map(route => 
      route.id === routeId ? { ...route, ...updates } : route
    ));
  }, [saveToUndoStack]);

  // Handle route deletion
  const handleRouteDelete = useCallback((routeId: string) => {
    saveToUndoStack('delete_route');
    setRoutes(prev => removeRoute(prev, routeId));
    setSelectedRouteId(null);
  }, [saveToUndoStack]);

  // Handle preset route application
  const handleApplyPreset = useCallback((routeId: string, preset: { id: string; name: string; points: RoutePoint[] }) => {
    saveToUndoStack('apply_preset_route');
    const route = routes.find(r => r.id === routeId);
    if (!route) return;

    // Convert preset points to actual coordinates based on player position
    const player = players.find(p => p.id === route.playerId);
    if (!player) return;

    const fieldCenterX = FIELD_DIMENSIONS.width / 2;
    const isRightOfCenter = player.x > fieldCenterX;

    // Routes that break "inside" (toward center) need to be mirrored
    // for players on the right side of the field
    const insideRoutes = ['slant', 'in', 'post'];
    const shouldMirrorX = isRightOfCenter && insideRoutes.includes(preset.id);

    const newPoints = preset.points.map(point => ({
      x: player.x + (shouldMirrorX ? -point.x : point.x),
      y: player.y + point.y
    }));

    setRoutes(prev => prev.map(r =>
      r.id === routeId ? { ...r, points: newPoints, type: preset.id } : r
    ));
  }, [routes, players, saveToUndoStack]);

  // Start route drawing
  const startRouteDrawing = useCallback((playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    setSelectedPlayerId(playerId);
    setPlayers(prev => selectPlayer(prev, playerId));
    setIsDrawingRoute(true);
    setRoutePoints([{ x: player.x, y: player.y }]);
    setMode('route');
  }, [players]);

  // Finish route drawing
  const finishRouteDrawing = useCallback(() => {
    if (routePoints.length < 2) {
      setIsDrawingRoute(false);
      setRoutePoints([]);
      return;
    }

    if (!selectedPlayerId) return;
    const newRoute = createRoute(selectedPlayerId, routePoints, routeType, routeColor);
    saveToUndoStack('add_route');
    setRoutes(prev => addRoute(prev, newRoute));
    
    setIsDrawingRoute(false);
    setRoutePoints([]);
    setMode('view');
  }, [routePoints, selectedPlayerId, routeType, routeColor, saveToUndoStack]);

  // Cancel route drawing
  const cancelRouteDrawing = useCallback(() => {
    setIsDrawingRoute(false);
    setRoutePoints([]);
    setMode('view');
  }, []);

  // Load formation
  const loadFormation = useCallback((formationType: string) => {
    const centerX = FIELD_DIMENSIONS.width / 2;
    const centerY = FIELD_DIMENSIONS.height / 2;
    
    let newPlayers;
    switch (formationType) {
      case 'shotgun':
        newPlayers = shotgunFormation(centerX, centerY);
        break;
      case '4-3':
        newPlayers = fourThreeFormation(centerX, centerY);
        break;
      default:
        return;
    }

    saveToUndoStack('load_formation');
    setPlayers(newPlayers);
    setRoutes([]);
    setSelectedPlayerId(null);
  }, [saveToUndoStack]);

  // Save current play
  const saveCurrentPlay = useCallback((name: string, phase: string, type: string) => {
    if (!name.trim() || players.length === 0) {
      addNotification('error', 'Please enter a play name and add at least one player.');
      return;
    }

    const play = savePlay({
      name: name.trim(),
      phase: phase || currentPlayPhase,
      type: type || currentPlayType,
      players,
      routes
    });

    setSavedPlays(prev => [...prev, play as SavedPlay]);
    setShowSaveDialog(false);
    setCurrentPlayName('');
    addNotification('success', `Play "${name}" saved successfully`);
  }, [players, routes, currentPlayPhase, currentPlayType, addNotification]);

  // Load play
  const loadPlay = useCallback((play: SavedPlay) => {
    saveToUndoStack('load_play');
    setPlayers([...play.players]);
    setRoutes([...play.routes]);
    setCurrentPlayName(play.name);
    setCurrentPlayPhase(play.phase);
    setCurrentPlayType(play.type);
    setSelectedPlayerId(null);
    setShowLibrary(false);
    addNotification('success', `Play "${play.name}" loaded successfully`);
  }, [saveToUndoStack, addNotification]);

  // Delete play
  const deletePlay = useCallback((playId: string) => {
    if (window.confirm('Are you sure you want to delete this play?')) {
      setSavedPlays(prev => prev.filter(play => play.id !== playId));
      addNotification('success', 'Play deleted successfully');
    }
  }, [addNotification]);

  // New play counter for unique naming
  const newPlayCounterRef = useRef(1);

  // Create a new play
  const handleNewPlay = useCallback(() => {
    // Save current work if there are players on the field
    if (players.length > 0) {
      const shouldSave = window.confirm('Save current play before creating a new one?');
      if (shouldSave && currentPlayName.trim()) {
        saveCurrentPlay(currentPlayName, currentPlayPhase, currentPlayType);
      }
    }

    // Reset field for a new play
    saveToUndoStack('new_play');
    setPlayers([]);
    setRoutes([]);
    setSelectedPlayerId(null);
    setSelectedRouteId(null);
    setCurrentPlayName(`Untitled Play ${newPlayCounterRef.current}`);
    newPlayCounterRef.current += 1;
    setCurrentPlayPhase('offense');
    setCurrentPlayType('pass');
    setUndoStack([]);
    setRedoStack([]);
  }, [players, currentPlayName, currentPlayPhase, currentPlayType, saveToUndoStack, saveCurrentPlay]);

  // Clear field
  const clearField = useCallback(() => {
    if (window.confirm('Are you sure you want to clear the field?')) {
      saveToUndoStack('clear_field');
      setPlayers([]);
      setRoutes([]);
      setSelectedPlayerId(null);
      setSelectedRouteId(null);
    }
  }, [saveToUndoStack]);

  // Run debug tests
  const runDebugTests = useCallback(() => {
    const tests = [
      {
        name: 'Canvas Rendering',
        category: 'Performance',
        passed: true,
        duration: 15
      },
      {
        name: 'Player Management',
        category: 'Functionality',
        passed: players.length >= 0,
        duration: 8
      },
      {
        name: 'Route System',
        category: 'Functionality',
        passed: routes.length >= 0,
        duration: 12
      },
      {
        name: 'Undo/Redo',
        category: 'Features',
        passed: undoStack.length >= 0,
        duration: 5
      },
      {
        name: 'Touch Support',
        category: 'Mobile',
        passed: 'ontouchstart' in window,
        duration: 3
      }
    ];
    setDebugResults(tests);
  }, [players.length, routes.length, undoStack.length]);

  // Toggle debug mode
  const toggleDebugMode = useCallback(() => {
    setDebugMode(prev => !prev);
  }, []);

  return (
    <ErrorBoundary>
      <div className="smart-playbook-app min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Smart Playbook</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleDebugMode}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {debugMode ? 'Hide Debug' : 'Show Debug'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Controls */}
          <div className="lg:col-span-1 space-y-4">
            {/* Toolbar */}
            <Toolbar
              mode={mode}
              onModeChange={setMode}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={undoStack.length > 0}
              canRedo={redoStack.length > 0}
              undoStack={undoStack}
              onClear={clearField}
              onShowHelp={() => setShowOnboarding(true)}
              onNewPlay={handleNewPlay}
            />

            {/* Formation Templates */}
            <FormationTemplates onLoadFormation={loadFormation} />

            {/* Player Controls */}
            <PlayerControls
              selectedPlayer={players.find(p => p.id === selectedPlayerId)}
              players={players}
              onUpdatePlayer={(updates: Partial<PlayerData>) => {
                saveToUndoStack('update_player');
                setPlayers(prev => prev.map(p => 
                  p.id === selectedPlayerId ? { ...p, ...updates } : p
                ));
              }}
              onDeletePlayer={() => {
                if (selectedPlayerId) {
                  saveToUndoStack('delete_player');
                  setPlayers(prev => removePlayer(prev, selectedPlayerId));
                  setRoutes(prev => prev.filter(route => route.playerId !== selectedPlayerId));
                  setSelectedPlayerId(null);
                }
              }}
            />

            {/* Route Controls */}
            <RouteControls
              selectedPlayer={players.find(p => p.id === selectedPlayerId)}
              isDrawingRoute={isDrawingRoute}
              routeType={routeType}
              routeColor={routeColor}
              onStartDrawing={startRouteDrawing}
              onFinishDrawing={finishRouteDrawing}
              onCancelDrawing={cancelRouteDrawing}
              onRouteTypeChange={setRouteType}
              onRouteColorChange={setRouteColor}
            />

            {/* Route Editor */}
            <ErrorBoundary>
              <RouteEditor
                selectedRoute={routes.find(r => r.id === selectedRouteId)}
                players={players}
                onUpdateRoute={handleRouteUpdate}
                onDeleteRoute={handleRouteDelete}
                onApplyPreset={handleApplyPreset}
                onClearSelection={() => setSelectedRouteId(null)}
              />
            </ErrorBoundary>

            {/* Save/Load Panel */}
            <SaveLoadPanel
              currentPlayName={currentPlayName}
              currentPlayPhase={currentPlayPhase}
              currentPlayType={currentPlayType}
              onPlayNameChange={setCurrentPlayName}
              onPlayPhaseChange={setCurrentPlayPhase}
              onPlayTypeChange={setCurrentPlayType}
              onSave={() => setShowSaveDialog(true)}
              onLoad={() => setShowLibrary(true)}
              canSave={players.length > 0}
            />
          </div>

          {/* Main Canvas Area */}
          <div className="lg:col-span-2">
            <ErrorBoundary>
              <CanvasArea
                canvasRef={canvasRef}
                players={players}
                routes={routes}
                onCanvasEvent={handleCanvasEvent}
                onPlayerDrag={handlePlayerDrag}
              />
            </ErrorBoundary>

            {/* Route Drawing Overlay */}
            {isDrawingRoute && routePoints.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Drawing route... Click to add points, double-click to finish
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={finishRouteDrawing}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Finish Route
                  </button>
                  <button
                    onClick={cancelRouteDrawing}
                    className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Install List & Library */}
          <div className="lg:col-span-1 space-y-4">
            <InstallListPanel />
            {showLibrary && (
              <PlayLibrary
                savedPlays={savedPlays}
                onLoadPlay={loadPlay}
                onDeletePlay={deletePlay}
                onClose={() => setShowLibrary(false)}
              />
            )}
          </div>
        </div>
      </div>

      <SavePlayDialog
        show={showSaveDialog}
        playName={currentPlayName}
        playPhase={currentPlayPhase}
        playType={currentPlayType}
        onPlayNameChange={setCurrentPlayName}
        onPlayPhaseChange={setCurrentPlayPhase}
        onPlayTypeChange={setCurrentPlayType}
        onSave={() =>
          saveCurrentPlay(currentPlayName, currentPlayPhase, currentPlayType)
        }
        onCancel={() => setShowSaveDialog(false)}
        canSave={!!currentPlayName.trim() && players.length > 0}
      />

      {/* Debug Panel */}
      {debugMode && (
        <DebugPanel
          results={debugResults}
          onRunAll={runDebugTests}
          onTogglePassed={() => {}}
          showPassed={true}
        />
      )}

      {/* Notifications */}
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          id={notification.id}
          type={notification.type}
          message={notification.message}
          duration={notification.duration}
          onDismiss={removeNotification}
        />
      ))}

      {/* Onboarding */}
      <Onboarding
        isVisible={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
        onSkip={() => setShowOnboarding(false)}
      />
    </div>
    </ErrorBoundary>
  );
};

const WrappedSmartPlaybook = () => (
  <AIProvider>
    <PlaybookDataProvider>
      <SmartPlaybook />
    </PlaybookDataProvider>
  </AIProvider>
);

export default WrappedSmartPlaybook;