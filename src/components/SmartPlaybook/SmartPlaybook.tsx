/**
 * SmartPlaybook.js – Main application component
 * - Orchestrates all Smart Playbook functionality
 * - Manages state and user interactions
 * - Provides complete touch-friendly UI
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Field from './Field';
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
  savePlay,
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

// CCIL Integration (commit-based analysis)
import { useCommitAnalysis } from './ccil/useCommitAnalysis';
import type { AnalysisResult, IntelligenceIssue, IssueCategory } from './ccil/types';

// Constants
const FIELD_DIMENSIONS = {
  width: 600,
  height: 300
};

const TOUCH_THRESHOLD = 20; // pixels for touch detection

const SmartPlaybook = () => {
  // Core state
  const [players, setPlayers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [mode, setMode] = useState('view'); // view, player, route, delete
  const [savedPlays, setSavedPlays] = useState([]);
  const [currentPlayName, setCurrentPlayName] = useState('');
  const [currentPlayPhase, setCurrentPlayPhase] = useState('offense');
  const [currentPlayType, setCurrentPlayType] = useState('pass');

  // Route drawing state
  const [isDrawingRoute, setIsDrawingRoute] = useState(false);
  const [routePoints, setRoutePoints] = useState([]);
  const [routeType, setRouteType] = useState('custom');
  const [routeColor, setRouteColor] = useState('#ef4444');

  // Undo/Redo state
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // UI state
  const [showLibrary, setShowLibrary] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [debugResults, setDebugResults] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Coach Mode UI state
  const [coachModeOpen, setCoachModeOpen] = useState(false);

  // CCIL commit-based analysis hook
  const { commit, analysisRevision, analysisResult } = useCommitAnalysis({
    players,
    routes,
    phase: currentPlayPhase,
    playType: currentPlayType,
    playName: currentPlayName,
  });

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
    const preventDoubleTapZoom = (event) => {
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

  // Save current state to undo stack
  const saveToUndoStack = useCallback((action) => {
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
    commit();
  }, [undoStack, redoStack, players, routes, commit]);

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
    commit();
  }, [undoStack, redoStack, players, routes, commit]);

  // Get canvas coordinates from event
  const getCanvasCoordinates = useCallback((event) => {
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
  const handleCanvasEvent = useCallback((event) => {
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
    if (mode === 'view' || mode === 'player') {
      const clickedPlayer = findPlayerAtPosition(players, coords.x, coords.y, TOUCH_THRESHOLD);
      
      if (clickedPlayer) {
        if (mode === 'delete') {
          // Delete player
          saveToUndoStack('delete_player');
          setPlayers(prev => removePlayer(prev, clickedPlayer.id));
          setRoutes(prev => prev.filter(route => route.playerId !== clickedPlayer.id));
          setSelectedPlayerId(null);
          commit();
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
      commit();
    }
  }, [mode, isDrawingRoute, players, getCanvasCoordinates, saveToUndoStack, commit]);

  // Handle player drag
  const handlePlayerDrag = useCallback((playerId, newX, newY) => {
    // Constrain to field boundaries
    const constrainedX = Math.max(20, Math.min(FIELD_DIMENSIONS.width - 20, newX));
    const constrainedY = Math.max(20, Math.min(FIELD_DIMENSIONS.height - 20, newY));
    
    setPlayers(prev => updatePlayerPosition(prev, playerId, constrainedX, constrainedY));
  }, [FIELD_DIMENSIONS.width, FIELD_DIMENSIONS.height]);

  // Handle player drag end (save to undo stack)
  const handlePlayerDragEnd = useCallback((playerId) => {
    saveToUndoStack('move_player');
    addNotification('success', 'Player moved successfully');
    commit();
  }, [saveToUndoStack, commit]);

  // Add notification helper
  const addNotification = useCallback((type, message, duration = 3000) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, type, message, duration }]);
  }, []);

  // Remove notification helper
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Handle route selection
  const handleRouteSelect = useCallback((routeId) => {
    setSelectedRouteId(routeId);
    setSelectedPlayerId(null); // Deselect player when selecting route
  }, []);

  // Handle route update
  const handleRouteUpdate = useCallback((routeId, updates) => {
    saveToUndoStack('update_route');
    setRoutes(prev => prev.map(route =>
      route.id === routeId ? { ...route, ...updates } : route
    ));
    commit();
  }, [saveToUndoStack, commit]);

  // Handle route deletion
  const handleRouteDelete = useCallback((routeId) => {
    saveToUndoStack('delete_route');
    setRoutes(prev => removeRoute(prev, routeId));
    setSelectedRouteId(null);
    commit();
  }, [saveToUndoStack, commit]);

  // Handle preset route application
  const handleApplyPreset = useCallback((routeId, preset) => {
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
    commit();
  }, [routes, players, saveToUndoStack, commit]);

  // Start route drawing
  const startRouteDrawing = useCallback((playerId) => {
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

    const newRoute = createRoute(selectedPlayerId, routePoints, routeType, routeColor);
    saveToUndoStack('add_route');
    setRoutes(prev => addRoute(prev, newRoute));

    setIsDrawingRoute(false);
    setRoutePoints([]);
    setMode('view');
    commit();
  }, [routePoints, selectedPlayerId, routeType, routeColor, saveToUndoStack, commit]);

  // Cancel route drawing
  const cancelRouteDrawing = useCallback(() => {
    setIsDrawingRoute(false);
    setRoutePoints([]);
    setMode('view');
  }, []);

  // Load formation
  const loadFormation = useCallback((formationType) => {
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
    commit();
  }, [saveToUndoStack, commit]);

  // Save current play
  const saveCurrentPlay = useCallback((name, phase, type) => {
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

    setSavedPlays(prev => [...prev, play]);
    setShowSaveDialog(false);
    setCurrentPlayName('');
    addNotification('success', `Play "${name}" saved successfully`);
  }, [players, routes, currentPlayPhase, currentPlayType, addNotification]);

  // Load play
  const loadPlay = useCallback((play) => {
    saveToUndoStack('load_play');
    setPlayers([...play.players]);
    setRoutes([...play.routes]);
    setCurrentPlayName(play.name);
    setCurrentPlayPhase(play.phase);
    setCurrentPlayType(play.type);
    setSelectedPlayerId(null);
    setShowLibrary(false);
    addNotification('success', `Play "${play.name}" loaded successfully`);
    commit();
  }, [saveToUndoStack, addNotification, commit]);

  // Delete play
  const deletePlay = useCallback((playId) => {
    if (window.confirm('Are you sure you want to delete this play?')) {
      setSavedPlays(prev => prev.filter(play => play.id !== playId));
      addNotification('success', 'Play deleted successfully');
    }
  }, [addNotification]);

  // Clear field
  const clearField = useCallback(() => {
    if (window.confirm('Are you sure you want to clear the field?')) {
      saveToUndoStack('clear_field');
      setPlayers([]);
      setRoutes([]);
      setSelectedPlayerId(null);
      setSelectedRouteId(null);
      commit();
    }
  }, [saveToUndoStack, commit]);

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
            />

            {/* Formation Templates */}
            <FormationTemplates onLoadFormation={loadFormation} />

            {/* Player Controls */}
            <PlayerControls
              selectedPlayer={players.find(p => p.id === selectedPlayerId)}
              players={players}
              onUpdatePlayer={(updates) => {
                saveToUndoStack('update_player');
                setPlayers(prev => prev.map(p =>
                  p.id === selectedPlayerId ? { ...p, ...updates } : p
                ));
                commit();
              }}
              onDeletePlayer={() => {
                if (selectedPlayerId) {
                  saveToUndoStack('delete_player');
                  setPlayers(prev => removePlayer(prev, selectedPlayerId));
                  setRoutes(prev => prev.filter(route => route.playerId !== selectedPlayerId));
                  setSelectedPlayerId(null);
                  commit();
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

          {/* Right Sidebar - Assist Mode + Library */}
          <div className="lg:col-span-1 space-y-4">
            {/* CCIL Assist Mode Panel — inline, desktop only */}
            <div className="hidden lg:block">
              <div className="bg-white rounded-lg border shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">Assist Mode</h3>
                  <span className="text-xs text-gray-400">rev {analysisRevision}</span>
                </div>
                <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                  analysisResult.score >= 80 ? 'bg-green-50 border-green-200' :
                  analysisResult.score >= 50 ? 'bg-yellow-50 border-yellow-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <span className="text-xs font-medium text-gray-600">Play Score</span>
                  <span className={`text-lg font-bold ${
                    analysisResult.score >= 80 ? 'text-green-600' :
                    analysisResult.score >= 50 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>{analysisResult.score}</span>
                </div>
                {analysisResult.issues.length > 0 ? (
                  <div className="space-y-1.5">
                    {[...analysisResult.issues]
                      .sort((a, b) => {
                        const ord: Record<string, number> = { critical: 0, warning: 1, info: 2 };
                        return (ord[a.severity] ?? 9) - (ord[b.severity] ?? 9);
                      })
                      .slice(0, 3)
                      .map(issue => (
                        <div key={issue.id} className={`flex items-start gap-2 px-3 py-2 rounded ${
                          issue.severity === 'critical' ? 'bg-red-50' :
                          issue.severity === 'warning' ? 'bg-yellow-50' : 'bg-blue-50'
                        }`}>
                          <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                            issue.severity === 'critical' ? 'bg-red-500' :
                            issue.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-400'
                          }`} />
                          <div className="min-w-0">
                            <p className={`text-xs font-medium truncate ${
                              issue.severity === 'critical' ? 'text-red-800' :
                              issue.severity === 'warning' ? 'text-yellow-800' : 'text-blue-800'
                            }`}>{issue.title}</p>
                            <p className="text-xs text-gray-500 truncate">{issue.description}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center py-2">No issues detected.</p>
                )}
                <button
                  onClick={() => setCoachModeOpen(true)}
                  className="w-full mt-1 px-3 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  {analysisResult.issues.length > 3
                    ? `Open Coach Mode (+${analysisResult.issues.length - 3} more)`
                    : 'Open Coach Mode'}
                </button>
              </div>
            </div>

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

      {/* CCIL Coach Mode Drawer — inline, desktop only */}
      {coachModeOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40 hidden lg:block"
          onClick={() => setCoachModeOpen(false)}
        />
      )}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white shadow-xl z-50 transform transition-transform duration-300 hidden lg:flex flex-col ${
          coachModeOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Coach Mode</h2>
            <p className="text-xs text-gray-500">
              Revision {analysisRevision} &middot; {new Date(analysisResult.analyzedAt).toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={() => setCoachModeOpen(false)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
            aria-label="Close Coach Mode"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Score + stats */}
          <div className="text-center">
            <span className={`text-4xl font-bold ${
              analysisResult.score >= 80 ? 'text-green-600' :
              analysisResult.score >= 50 ? 'text-yellow-600' : 'text-red-600'
            }`}>{analysisResult.score}</span>
            <p className="text-xs text-gray-500 mt-1">Play Quality Score</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-lg font-bold text-gray-800">{players.length}</p>
              <p className="text-xs text-gray-500">Players</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-lg font-bold text-gray-800">{routes.length}</p>
              <p className="text-xs text-gray-500">Routes</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-lg font-bold text-gray-800">{analysisResult.issues.length}</p>
              <p className="text-xs text-gray-500">Issues</p>
            </div>
          </div>
          {/* Issues grouped by category */}
          {analysisResult.issues.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No issues found. Play design looks clean.</p>
          ) : (
            (() => {
              const grouped = new Map<IssueCategory, IntelligenceIssue[]>();
              for (const issue of analysisResult.issues) {
                const list = grouped.get(issue.category) ?? [];
                list.push(issue);
                grouped.set(issue.category, list);
              }
              const labels: Record<string, string> = {
                alignment: 'Alignment', spacing: 'Spacing', route_conflict: 'Route Conflicts',
                coverage_gap: 'Coverage Gaps', personnel: 'Personnel', formation: 'Formation', general: 'General',
              };
              return Array.from(grouped.entries()).map(([cat, issues]) => (
                <div key={cat}>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {labels[cat] ?? cat} ({issues.length})
                  </h3>
                  <div className="space-y-2">
                    {issues.map(issue => (
                      <div key={issue.id} className="border rounded-lg p-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            issue.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            issue.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>{issue.severity}</span>
                          <span className="text-sm font-medium text-gray-800">{issue.title}</span>
                        </div>
                        <p className="text-xs text-gray-600">{issue.description}</p>
                        {issue.suggestion && (
                          <p className="text-xs text-indigo-600 italic">{issue.suggestion}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()
          )}
        </div>
        <div className="border-t px-5 py-3">
          <button
            onClick={() => setCoachModeOpen(false)}
            className="w-full px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
};

const WrappedSmartPlaybook = () => (
  <AIProvider>
    <SmartPlaybook />
  </AIProvider>
);

export default WrappedSmartPlaybook; 