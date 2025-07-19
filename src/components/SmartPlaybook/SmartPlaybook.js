/**
 * SmartPlaybook.js – Level-aware football playbook with progressive complexity
 * - Supports youth to professional levels with appropriate feature sets
 * - Progressive disclosure based on team level
 * - Safety validation for youth levels
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFeatureGating } from '../../utils/featureGating';
import { FootballLevel } from '../../types/football';
import Field from './Field.js';
import Toolbar from './components/Toolbar.js';
import FormationTemplates from './components/FormationTemplates.js';
import PlayerControls from './components/PlayerControls.js';
import RouteControls from './components/RouteControls.js';
import RouteEditor from './components/RouteEditor.js';
import SaveLoadPanel from './components/SaveLoadPanel.js';
import PlayLibrary from './PlayLibrary.js';
import DebugPanel from './DebugPanel.js';
import Notification from './components/Notification.js';
import Onboarding from './components/Onboarding.js';

// Position constants for better maintainability
export const PLAYER_POSITIONS = {
  OFFENSE: ['QB', 'RB', 'WR', 'TE', 'FB', 'LT', 'LG', 'C', 'RG', 'RT'],
  DEFENSE: ['DE', 'DT', 'NT', 'MLB', 'OLB', 'CB', 'FS', 'SS', 'NB', 'LB']
};

const SmartPlaybook = ({ teamLevel = FootballLevel.VARSITY }) => {
  // Feature gating for level-aware functionality
  const { canAccess, isYouth, isAdvanced, constraints } = useFeatureGating(teamLevel);

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

  // Level-specific state
  const [safetyWarnings, setSafetyWarnings] = useState([]);
  const [complexityLevel, setComplexityLevel] = useState(isYouth ? 'basic' : 'advanced');

  // Refs
  const canvasRef = useRef(null);

  // Load saved plays from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('smartPlaybook_plays');
      if (saved) {
        const parsedPlays = JSON.parse(saved);
        // Filter plays based on level if needed
        const levelAppropriatePlays = isYouth 
          ? parsedPlays.filter(play => play.complexity !== 'advanced')
          : parsedPlays;
        setSavedPlays(levelAppropriatePlays);
      }
    } catch (error) {
      console.error('Error loading saved plays:', error);
    }

    // Check if onboarding is needed
    const onboardingComplete = localStorage.getItem('smartPlaybook_onboarding_complete');
    if (!onboardingComplete) {
      setShowOnboarding(true);
    }
  }, [isYouth]);

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

  // Level-specific safety validation
  useEffect(() => {
    const warnings = [];
    
    if (isYouth) {
      // Check for youth-specific safety concerns
      if (players.length > constraints.maxPlayers) {
        warnings.push(`Too many players for youth level (max: ${constraints.maxPlayers})`);
      }
      
      if (routes.length > 5) {
        warnings.push('Too many routes for youth level - keep it simple');
      }
      
      // Check for prohibited formations
      const currentFormation = getCurrentFormation();
      if (!constraints.allowedFormations.includes(currentFormation)) {
        warnings.push(`Formation "${currentFormation}" not recommended for youth level`);
      }
    }
    
    setSafetyWarnings(warnings);
  }, [players, routes, isYouth, constraints]);

  // Helper functions
  const getCurrentFormation = () => {
    // Simple formation detection based on player positions
    const qbCount = players.filter(p => p.position === 'QB').length;
    const rbCount = players.filter(p => p.position === 'RB').length;
    
    if (qbCount === 1 && rbCount === 1) return 'i_formation';
    if (qbCount === 1 && rbCount === 0) return 'shotgun';
    return 'custom';
  };

  const saveToUndoStack = (action) => {
    setUndoStack(prev => [...prev, { action, players: [...players], routes: [...routes] }]);
    setRedoStack([]); // Clear redo stack when new action is performed
  };

  const handleUndo = () => {
    if (undoStack.length > 0) {
      const lastState = undoStack[undoStack.length - 1];
      setRedoStack(prev => [...prev, { action: 'undo', players: [...players], routes: [...routes] }]);
      setPlayers(lastState.players);
      setRoutes(lastState.routes);
      setUndoStack(prev => prev.slice(0, -1));
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const nextState = redoStack[redoStack.length - 1];
      setUndoStack(prev => [...prev, { action: 'redo', players: [...players], routes: [...routes] }]);
      setPlayers(nextState.players);
      setRoutes(nextState.routes);
      setRedoStack(prev => prev.slice(0, -1));
    }
  };

  const clearField = () => {
    saveToUndoStack('clear');
    setPlayers([]);
    setRoutes([]);
    setSelectedPlayerId(null);
    setSelectedRouteId(null);
  };

  const loadFormation = (formation) => {
    saveToUndoStack('load_formation');
    
    // Level-appropriate formation loading
    const formationData = getFormationData(formation, isYouth);
    setPlayers(formationData.players);
    setRoutes([]);
    setSelectedPlayerId(null);
    setSelectedRouteId(null);
  };

  const getFormationData = (formation, isYouth) => {
    // Simplified formations for youth, complex for advanced
    const formations = {
      shotgun: {
        players: isYouth ? [
          { id: 1, x: 50, y: 50, position: 'QB', number: 12 },
          { id: 2, x: 30, y: 30, position: 'RB', number: 21 },
          { id: 3, x: 70, y: 30, position: 'WR', number: 81 },
          { id: 4, x: 70, y: 70, position: 'WR', number: 80 }
        ] : [
          { id: 1, x: 50, y: 50, position: 'QB', number: 12 },
          { id: 2, x: 30, y: 30, position: 'RB', number: 21 },
          { id: 3, x: 70, y: 30, position: 'WR', number: 81 },
          { id: 4, x: 70, y: 70, position: 'WR', number: 80 },
          { id: 5, x: 50, y: 20, position: 'TE', number: 88 },
          { id: 6, x: 20, y: 40, position: 'LT', number: 74 },
          { id: 7, x: 25, y: 50, position: 'LG', number: 73 },
          { id: 8, x: 30, y: 60, position: 'C', number: 72 },
          { id: 9, x: 35, y: 50, position: 'RG', number: 71 },
          { id: 10, x: 40, y: 40, position: 'RT', number: 70 },
          { id: 11, x: 80, y: 50, position: 'FB', number: 44 }
        ]
      },
      i_formation: {
        players: isYouth ? [
          { id: 1, x: 50, y: 50, position: 'QB', number: 12 },
          { id: 2, x: 50, y: 30, position: 'RB', number: 21 },
          { id: 3, x: 50, y: 20, position: 'FB', number: 44 },
          { id: 4, x: 70, y: 30, position: 'WR', number: 81 }
        ] : [
          { id: 1, x: 50, y: 50, position: 'QB', number: 12 },
          { id: 2, x: 50, y: 30, position: 'RB', number: 21 },
          { id: 3, x: 50, y: 20, position: 'FB', number: 44 },
          { id: 4, x: 70, y: 30, position: 'WR', number: 81 },
          { id: 5, x: 70, y: 70, position: 'WR', number: 80 },
          { id: 6, x: 50, y: 80, position: 'TE', number: 88 },
          { id: 7, x: 20, y: 40, position: 'LT', number: 74 },
          { id: 8, x: 25, y: 50, position: 'LG', number: 73 },
          { id: 9, x: 30, y: 60, position: 'C', number: 72 },
          { id: 10, x: 35, y: 50, position: 'RG', number: 71 },
          { id: 11, x: 40, y: 40, position: 'RT', number: 70 }
        ]
      }
    };
    
    return formations[formation] || formations.shotgun;
  };

  const startRouteDrawing = () => {
    if (!canAccess('advanced_plays') && isYouth) {
      addNotification('Route drawing not available for youth level', 'warning');
      return;
    }
    setIsDrawingRoute(true);
    setRoutePoints([]);
  };

  const finishRouteDrawing = () => {
    if (routePoints.length > 0) {
      const newRoute = {
        id: Date.now(),
        playerId: selectedPlayerId,
        points: [...routePoints],
        type: routeType,
        color: routeColor
      };
      setRoutes(prev => [...prev, newRoute]);
    }
    setIsDrawingRoute(false);
    setRoutePoints([]);
  };

  const cancelRouteDrawing = () => {
    setIsDrawingRoute(false);
    setRoutePoints([]);
  };

  const addNotification = (message, type = 'info') => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const savePlay = () => {
    if (!currentPlayName.trim()) {
      addNotification('Please enter a play name', 'error');
      return;
    }
    
    // Level-specific validation
    if (isYouth && complexityLevel === 'advanced') {
      addNotification('Advanced complexity not recommended for youth level', 'warning');
    }
    
    const newPlay = {
      id: Date.now(),
      name: currentPlayName.trim(),
      type: currentPlayType,
      phase: currentPlayPhase,
      players: [...players],
      routes: [...routes],
      complexity: complexityLevel,
      level: teamLevel,
      timestamp: Date.now()
    };
    
    setSavedPlays(prev => [...prev, newPlay]);
    setCurrentPlayName('');
    addNotification(`Play "${newPlay.name}" saved successfully!`, 'success');
  };

  const loadPlay = (play) => {
    // Check if play is appropriate for current level
    if (isYouth && play.complexity === 'advanced') {
      addNotification('This play is too complex for youth level', 'warning');
      return;
    }
    
    setPlayers(play.players || []);
    setRoutes(play.routes || []);
    setCurrentPlayType(play.type || 'pass');
    setCurrentPlayPhase(play.phase || 'offense');
    setCurrentPlayName(play.name);
    setComplexityLevel(play.complexity || 'basic');
    setSelectedPlayerId(null);
    setSelectedRouteId(null);
    addNotification(`Play "${play.name}" loaded`, 'success');
  };

  const removePlayer = (players, playerId) => {
    return players.filter(p => p.id !== playerId);
  };

  return (
    <div className="smart-playbook-container">
      {/* Level indicator */}
      <div className="level-indicator bg-blue-100 text-blue-800 px-4 py-2 rounded-lg mb-4">
        <strong>Level:</strong> {teamLevel} 
        {isYouth && <span className="ml-2 text-sm">(Youth Mode - Simplified Features)</span>}
        {isAdvanced && <span className="ml-2 text-sm">(Advanced Mode - Full Features)</span>}
      </div>

      {/* Safety warnings */}
      {safetyWarnings.length > 0 && (
        <div className="safety-warnings bg-yellow-100 border border-yellow-300 rounded-lg p-4 mb-4">
          <h3 className="font-medium text-yellow-800 mb-2">Safety Warnings</h3>
          <ul className="text-yellow-700 text-sm">
            {safetyWarnings.map((warning, index) => (
              <li key={index}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main canvas area */}
        <div className="lg:col-span-3">
          <Field
            ref={canvasRef}
            players={players}
            routes={routes}
            selectedPlayerId={selectedPlayerId}
            selectedRouteId={selectedRouteId}
            onPlayerSelect={setSelectedPlayerId}
            onRouteSelect={setSelectedRouteId}
            isDrawingRoute={isDrawingRoute}
            routePoints={routePoints}
            onRoutePointAdd={(point) => setRoutePoints(prev => [...prev, point])}
            mode={mode}
            teamLevel={teamLevel}
          />
        </div>

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
            teamLevel={teamLevel}
            canAccessAdvanced={canAccess('advanced_plays')}
          />

          {/* Formation Templates */}
          <FormationTemplates 
            onLoadFormation={loadFormation} 
            allowedFormations={constraints.allowedFormations}
            teamLevel={teamLevel}
          />

          {/* Player Controls */}
          <PlayerControls
            selectedPlayer={players.find(p => p.id === selectedPlayerId)}
            players={players}
            onUpdatePlayer={(updates) => {
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
            teamLevel={teamLevel}
            maxPlayers={constraints.maxPlayers}
          />

          {/* Route Controls - Only show for appropriate levels */}
          {canAccess('advanced_plays') && (
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
              teamLevel={teamLevel}
            />
          )}

          {/* Route Editor */}
          {canAccess('advanced_plays') && (
            <RouteEditor
              routes={routes}
              selectedRouteId={selectedRouteId}
              onRouteSelect={setSelectedRouteId}
              onRouteUpdate={(routeId, updates) => {
                saveToUndoStack('update_route');
                setRoutes(prev => prev.map(r => 
                  r.id === routeId ? { ...r, ...updates } : r
                ));
              }}
              onRouteDelete={(routeId) => {
                saveToUndoStack('delete_route');
                setRoutes(prev => prev.filter(r => r.id !== routeId));
                setSelectedRouteId(null);
              }}
              teamLevel={teamLevel}
            />
          )}

          {/* Save/Load Panel */}
          <SaveLoadPanel
            currentPlayName={currentPlayName}
            onPlayNameChange={setCurrentPlayName}
            currentPlayType={currentPlayType}
            onPlayTypeChange={setCurrentPlayType}
            currentPlayPhase={currentPlayPhase}
            onPlayPhaseChange={setCurrentPlayPhase}
            onSave={savePlay}
            onLoad={() => setShowLibrary(true)}
            complexityLevel={complexityLevel}
            onComplexityChange={setComplexityLevel}
            teamLevel={teamLevel}
            isYouth={isYouth}
          />
        </div>
      </div>

      {/* Play Library Modal */}
      {showLibrary && (
        <PlayLibrary
          plays={savedPlays}
          onLoadPlay={loadPlay}
          onClose={() => setShowLibrary(false)}
          teamLevel={teamLevel}
          isYouth={isYouth}
        />
      )}

      {/* Debug Panel - Only for advanced levels */}
      {debugMode && canAccess('advanced_analytics') && (
        <DebugPanel
          players={players}
          routes={routes}
          debugResults={debugResults}
          onClose={() => setDebugMode(false)}
        />
      )}

      {/* Notifications */}
      <div className="notifications-container fixed top-4 right-4 z-50">
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            message={notification.message}
            type={notification.type}
            onClose={() => setNotifications(prev => 
              prev.filter(n => n.id !== notification.id)
            )}
          />
        ))}
      </div>

      {/* Onboarding */}
      {showOnboarding && (
        <Onboarding
          onClose={() => {
            setShowOnboarding(false);
            localStorage.setItem('smartPlaybook_onboarding_complete', 'true');
          }}
          teamLevel={teamLevel}
          isYouth={isYouth}
        />
      )}
    </div>
  );
};

export default SmartPlaybook;
