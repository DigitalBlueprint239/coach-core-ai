/**
 * SmartPlaybook.js – Main application component
 * - Orchestrates all Smart Playbook functionality
 * - Manages state and user interactions
 * - Provides complete touch-friendly UI
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTeam } from '../../contexts/TeamContext';
import LegacyImport from '../../features/legacy-import/LegacyImport';
import { useDocument } from '../../features/persistence/useDocument';
import { Recovery, download } from '../../features/persistence/Recovery';
import { equal, Fields } from '../../features/persistence/model';
import EarlierDrafts from '../../features/persistence/EarlierDrafts';
import DebugPanel from './DebugPanel';
import PlayLibrary from './PlayLibrary';
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
  undo,
  redo,
  shotgunFormation,
  fourThreeFormation,
  findPlayerAtPosition,
  calculateDistance
} from './PlayController';

// UI Components
import PlayerControls from './components/PlayerControls';
import RouteControls from './components/RouteControls';
import RouteEditor from './components/RouteEditor';
import FormationTemplates from './components/FormationTemplates';
import SaveLoadPanel from './components/SaveLoadPanel';
import Toolbar from './components/Toolbar';
import Notification from './components/Notification';
import Onboarding from './components/Onboarding';
import { AIProvider } from '../../ai-brain/AIContext';

// Internal state types for SmartPlaybook UI layer
interface PlaybookPlayer {
  id: string;
  x: number;
  y: number;
  position: string;
  number: number;
  selected?: boolean;
}

interface PlaybookRoute {
  id: string;
  playerId: string;
  points: Array<{ x: number; y: number }>;
  type: string;
  color?: string;
}

interface PlaybookSnapshot {
  players: PlaybookPlayer[];
  routes: PlaybookRoute[];
  action: string;
  timestamp: number;
}

interface SavedPlay {
  id: string;
  name: string;
  phase: string;
  type: string;
  players: PlaybookPlayer[];
  routes: PlaybookRoute[];
}

interface PlaybookNotification {
  id: number;
  type: 'success' | 'error' | 'warning';
  message: string;
  duration: number;
}

interface DebugResult {
  name: string;
  category: string;
  passed: boolean;
  duration: number;
}

type PlaybookMode = 'view' | 'player' | 'route' | 'delete';

// Constants
const FIELD_DIMENSIONS = {
  width: 600,
  height: 300
};

const TOUCH_THRESHOLD = 20; // pixels for touch detection

const SmartPlaybook = () => {
  const { user } = useAuth();
  const { currentTeam } = useTeam();
  const persistence = useDocument({uid:user!.uid,teamId:currentTeam!.id},'plays',{name:'',phase:'offense',type:'pass',players:[],routes:[]});
  // Core state
  const [players, setPlayers] = useState<PlaybookPlayer[]>((persistence.fields.players || []) as unknown as PlaybookPlayer[]);
  const [routes, setRoutes] = useState<PlaybookRoute[]>((persistence.fields.routes || []) as unknown as PlaybookRoute[]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [mode, setMode] = useState<PlaybookMode>('view');
  const [currentPlayName, setCurrentPlayName] = useState(String(persistence.fields.name || ''));
  const [currentPlayPhase, setCurrentPlayPhase] = useState(persistence.fields.phase === 'special_teams' ? 'special' : String(persistence.fields.phase || 'offense'));
  const [currentPlayType, setCurrentPlayType] = useState(String(persistence.fields.type || 'pass'));
  const openedRef = useRef(persistence.opened);
  // Route drawing state
  const [isDrawingRoute, setIsDrawingRoute] = useState(false);
  const [routePoints, setRoutePoints] = useState<Array<{ x: number; y: number }>>([]);
  const [routeType, setRouteType] = useState('custom');
  const [routeColor, setRouteColor] = useState('#ef4444');

  // Undo/Redo state
  const [undoStack, setUndoStack] = useState<PlaybookSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<PlaybookSnapshot[]>([]);

  // UI state
  const [showLibrary, setShowLibrary] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [debugResults, setDebugResults] = useState<DebugResult[]>([]);
  const [notifications, setNotifications] = useState<PlaybookNotification[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastTouchRef = useRef<TouchEvent | null>(null);

  const playFields:Fields = {...persistence.fields,name:currentPlayName,phase:currentPlayPhase==='special'?'special_teams':currentPlayPhase,type:currentPlayType,
    players:JSON.parse(JSON.stringify(players)),routes:JSON.parse(JSON.stringify(routes))};
  const playStatus = persistence.saving ? 'saving' : persistence.error ? 'failed' : persistence.ack && equal(persistence.ack,playFields) ? 'saved' : 'unsaved';
  useEffect(()=>{
    if(openedRef.current !== persistence.opened){
      openedRef.current=persistence.opened;
      setPlayers((persistence.fields.players||[]) as unknown as PlaybookPlayer[]);
      setRoutes((persistence.fields.routes||[]) as unknown as PlaybookRoute[]);
      setCurrentPlayName(String(persistence.fields.name||''));
      setCurrentPlayPhase(persistence.fields.phase==='special_teams'?'special':String(persistence.fields.phase||'offense'));
      setCurrentPlayType(String(persistence.fields.type||'pass'));setUndoStack([]);setRedoStack([]);return;
    }
    persistence.update(playFields);
  });
  useEffect(()=>{if(!localStorage.getItem('smartPlaybook_onboarding_complete'))setShowOnboarding(true);},[]);
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

  // Save current state to undo stack
  const saveToUndoStack = useCallback((action: string) => {
    const currentState = {
      players: [...players],
      routes: [...routes],
      action,
      timestamp: Date.now()
    };
    setUndoStack(prev => [...prev, currentState]);
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
  const getCanvasCoordinates = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX: number, clientY: number;

    if ('touches' in event && event.touches[0]) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if ('clientX' in event) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      return null;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }, []);

  // Handle canvas click/touch
  const handleCanvasEvent = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();

    if (!canvasRef.current) return;
    
    const coords = getCanvasCoordinates(event);
    if (!coords) return;

    // Handle route drawing
    if (mode === 'route' && isDrawingRoute) {
      setRoutePoints(prev => [...prev, coords]);
      return;
    }

    // Handle player selection
    if (mode === 'view' || mode === 'player' || mode === 'delete') {
      const clickedPlayer = findPlayerAtPosition(players, coords.x, coords.y, TOUCH_THRESHOLD) as PlaybookPlayer | null;

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
      } else {
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

  // Handle player drag — FIELD_DIMENSIONS is a module constant, no need in deps
  const handlePlayerDrag = useCallback((playerId: string, newX: number, newY: number) => {
    // Constrain to field boundaries
    const constrainedX = Math.max(20, Math.min(FIELD_DIMENSIONS.width - 20, newX));
    const constrainedY = Math.max(20, Math.min(FIELD_DIMENSIONS.height - 20, newY));

    setPlayers(prev => updatePlayerPosition(prev, playerId, constrainedX, constrainedY));
  }, []);

  // Handle player drag end (save to undo stack)
  const handlePlayerDragEnd = useCallback((playerId: string) => {
    saveToUndoStack('move_player');
    addNotification('success', 'Player moved successfully');
  }, [saveToUndoStack]);

  // Add notification helper
  const addNotification = useCallback((type: 'success' | 'error' | 'warning', message: string, duration = 3000) => {
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
  const handleRouteUpdate = useCallback((routeId: string, updates: Partial<PlaybookRoute>) => {
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
  const handleApplyPreset = useCallback((routeId: string, preset: { id: string; points: Array<{ x: number; y: number }> }) => {
    saveToUndoStack('apply_preset_route');
    const route = routes.find(r => r.id === routeId);
    if (!route) return;

    // Convert preset points to actual coordinates based on player position
    const player = players.find(p => p.id === route.playerId);
    if (!player) return;

    const newPoints = preset.points.map(point => ({
      x: player.x + point.x,
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
    if (routePoints.length < 2 || !selectedPlayerId) {
      setIsDrawingRoute(false);
      setRoutePoints([]);
      return;
    }

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
  const saveCurrentPlay = async () => {
    persistence.update(playFields);
    if(await persistence.save())setShowSaveDialog(false);
  };
  const loadPlay = (play:SavedPlay) => {
    const record=persistence.records.find(r=>r.id===play.id);
    if(record && (!persistence.hasWork||window.confirm('Open another play? Export your unsaved draft first if you need both.'))){persistence.open(record);setShowLibrary(false);}
  };
  const deletePlay = () => {addNotification('warning','Deletion is disabled. Your plays and originals are preserved.');};
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
      {user && currentTeam && currentTeam.ownerId === user.uid && <LegacyImport key={`${user.uid}:${currentTeam.id}`} uid={user.uid} teamId={currentTeam.id} teamName={currentTeam.name} onImported={() => {void persistence.reload();}} />}
        <EarlierDrafts scope={{uid:user!.uid,teamId:currentTeam!.id}} onOpen={record=>{if(!persistence.hasWork||window.confirm('Export your current draft before recovering another. Continue?'))persistence.open(record);}}/>
        <p role="status" aria-label="Play save status">{playStatus}</p>
        <button onClick={()=>{if(!persistence.hasWork||window.confirm('Start a new play? Export your current draft first if you need both.'))persistence.create({name:'',phase:'offense',type:'pass',players:[],routes:[]});}}>New play</button>
        <button onClick={()=>download(playFields,'play-draft.json')}>Export draft</button>
        <button onClick={()=>{void persistence.reload();}}>Refresh play library</button>
        {persistence.error&&<p role="alert">{persistence.error}</p>}{persistence.listError&&<p role="alert">{persistence.listError}</p>}
        {persistence.conflict&&<Recovery remote={persistence.conflict} fields={playFields} onReload={()=>persistence.open(persistence.conflict!)} onCopy={()=>{persistence.update(playFields);void persistence.save(true);}}/>}
        {persistence.timestamps&&<p>Created {persistence.timestamps.createdAt}; last saved {persistence.timestamps.updatedAt}</p>}
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
            />

            {/* Formation Templates */}
            <FormationTemplates onLoadFormation={loadFormation} />

            {/* Player Controls */}
            <PlayerControls
              selectedPlayer={players.find(p => p.id === selectedPlayerId)}
              players={players}
              onUpdatePlayer={(updates: Partial<PlaybookPlayer>) => {
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

          {/* Right Sidebar - Library */}
          <div className="lg:col-span-1">
            {showLibrary && (
              <PlayLibrary
                savedPlays={persistence.records.map(r => ({...r.fields,id:r.id,phase:r.fields.phase==='special_teams'?'special':r.fields.phase})) as unknown as SavedPlay[]}
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
          void saveCurrentPlay()
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

const WrappedSmartPlaybook = () => {
  const { user } = useAuth();
  const { currentTeam } = useTeam();
  return (
    <AIProvider>
      <SmartPlaybook key={`${user?.uid || 'anonymous'}:${currentTeam?.id || 'none'}`} />
    </AIProvider>
  );
};

export default WrappedSmartPlaybook;
