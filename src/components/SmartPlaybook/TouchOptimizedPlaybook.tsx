// src/components/SmartPlaybook/TouchOptimizedPlaybook.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAI } from '../../ai-brain/AIContext';
import { LoadingState } from '../LoadingStates';

// ============================================
// TOUCH OPTIMIZATION TYPES
// ============================================

interface TouchPoint {
  x: number;
  y: number;
  id: number;
}

interface TouchGesture {
  type: 'tap' | 'double_tap' | 'long_press' | 'swipe' | 'pinch' | 'pan';
  startPoint: TouchPoint;
  endPoint?: TouchPoint;
  duration: number;
  distance?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

interface TouchOptimizedPlaybookProps {
  teamContext: any;
  onPlaySave?: (play: any) => void;
  onPlayLoad?: (playId: string) => void;
  className?: string;
}

// ============================================
// TOUCH GESTURE DETECTION
// ============================================

class TouchGestureDetector {
  private touchStartTime: number = 0;
  private touchStartPoint: TouchPoint | null = null;
  private touchTimeout: NodeJS.Timeout | null = null;
  private longPressThreshold: number = 500;
  private doubleTapThreshold: number = 300;
  private lastTapTime: number = 0;

  onTouchStart = (event: TouchEvent, callback: (gesture: TouchGesture) => void) => {
    const touch = event.touches[0];
    const point: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      id: touch.identifier
    };

    this.touchStartTime = Date.now();
    this.touchStartPoint = point;

    // Start long press detection
    this.touchTimeout = setTimeout(() => {
      if (this.touchStartPoint) {
        callback({
          type: 'long_press',
          startPoint: this.touchStartPoint,
          duration: Date.now() - this.touchStartTime
        });
      }
    }, this.longPressThreshold);
  };

  onTouchEnd = (event: TouchEvent, callback: (gesture: TouchGesture) => void) => {
    if (this.touchTimeout) {
      clearTimeout(this.touchTimeout);
      this.touchTimeout = null;
    }

    if (!this.touchStartPoint) return;

    const touch = event.changedTouches[0];
    const endPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      id: touch.identifier
    };

    const duration = Date.now() - this.touchStartTime;
    const distance = Math.sqrt(
      Math.pow(endPoint.x - this.touchStartPoint.x, 2) +
      Math.pow(endPoint.y - this.touchStartPoint.y, 2)
    );

    // Determine gesture type
    let gestureType: TouchGesture['type'] = 'tap';
    let direction: TouchGesture['direction'] | undefined;

    if (distance > 50) {
      gestureType = 'swipe';
      const deltaX = endPoint.x - this.touchStartPoint.x;
      const deltaY = endPoint.y - this.touchStartPoint.y;
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }
    } else if (duration < 200) {
      // Check for double tap
      const timeSinceLastTap = Date.now() - this.lastTapTime;
      if (timeSinceLastTap < this.doubleTapThreshold) {
        gestureType = 'double_tap';
      }
      this.lastTapTime = Date.now();
    }

    callback({
      type: gestureType,
      startPoint: this.touchStartPoint,
      endPoint,
      duration,
      distance,
      direction
    });

    this.touchStartPoint = null;
  };

  onTouchMove = (event: TouchEvent, callback: (gesture: TouchGesture) => void) => {
    if (this.touchTimeout) {
      clearTimeout(this.touchTimeout);
      this.touchTimeout = null;
    }

    if (!this.touchStartPoint) return;

    const touch = event.touches[0];
    const currentPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      id: touch.identifier
    };

    const distance = Math.sqrt(
      Math.pow(currentPoint.x - this.touchStartPoint.x, 2) +
      Math.pow(currentPoint.y - this.touchStartPoint.y, 2)
    );

    if (distance > 10) {
      callback({
        type: 'pan',
        startPoint: this.touchStartPoint,
        endPoint: currentPoint,
        duration: Date.now() - this.touchStartTime,
        distance
      });
    }
  };
}

// ============================================
// TOUCH OPTIMIZED PLAYBOOK COMPONENT
// ============================================

export const TouchOptimizedPlaybook: React.FC<TouchOptimizedPlaybookProps> = ({
  teamContext,
  onPlaySave,
  onPlayLoad,
  className = ''
}) => {
  const ai = useAI();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gestureDetector = useRef(new TouchGestureDetector());
  
  const [isLoading, setIsLoading] = useState(false);
  const [currentPlay, setCurrentPlay] = useState<any>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [showTouchControls, setShowTouchControls] = useState(false);

  // ============================================
  // TOUCH EVENT HANDLERS
  // ============================================

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    gestureDetector.current.onTouchStart(event.nativeEvent, handleGesture);
  }, []);

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    gestureDetector.current.onTouchEnd(event.nativeEvent, handleGesture);
  }, []);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    gestureDetector.current.onTouchMove(event.nativeEvent, handleGesture);
  }, []);

  const handleGesture = useCallback((gesture: TouchGesture) => {
    switch (gesture.type) {
      case 'tap':
        handleTap(gesture.startPoint);
        break;
      case 'double_tap':
        handleDoubleTap(gesture.startPoint);
        break;
      case 'long_press':
        handleLongPress(gesture.startPoint);
        break;
      case 'swipe':
        handleSwipe(gesture);
        break;
      case 'pan':
        handlePan(gesture);
        break;
    }
  }, []);

  // ============================================
  // GESTURE HANDLERS
  // ============================================

  const handleTap = useCallback((point: TouchPoint) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (point.x - rect.left) / scale;
    const y = (point.y - rect.top) / scale;

    // Check if tapping on a player
    const player = findPlayerAtPosition(x, y);
    if (player) {
      setSelectedPlayer(player);
      showPlayerMenu(player, point);
    } else {
      setSelectedPlayer(null);
      hidePlayerMenu();
    }
  }, [scale]);

  const handleDoubleTap = useCallback((point: TouchPoint) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (point.x - rect.left) / scale;
    const y = (point.y - rect.top) / scale;

    // Add new player at tap location
    addPlayerAtPosition(x, y);
  }, [scale]);

  const handleLongPress = useCallback((point: TouchPoint) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (point.x - rect.left) / scale;
    const y = (point.y - rect.top) / scale;

    // Show context menu
    showContextMenu(point);
  }, [scale]);

  const handleSwipe = useCallback((gesture: TouchGesture) => {
    if (gesture.direction === 'left' || gesture.direction === 'right') {
      // Navigate between plays
      if (gesture.direction === 'left') {
        nextPlay();
      } else {
        previousPlay();
      }
    } else if (gesture.direction === 'up' || gesture.direction === 'down') {
      // Zoom in/out
      if (gesture.direction === 'up') {
        setScale(prev => Math.min(prev * 1.2, 3));
      } else {
        setScale(prev => Math.max(prev / 1.2, 0.5));
      }
    }
  }, []);

  const handlePan = useCallback((gesture: TouchGesture) => {
    if (selectedPlayer && gesture.endPoint) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const newX = (gesture.endPoint.x - rect.left) / scale;
      const newY = (gesture.endPoint.y - rect.top) / scale;

      // Update player position
      updatePlayerPosition(selectedPlayer.id, newX, newY);
    }
  }, [selectedPlayer, scale]);

  // ============================================
  // PLAYER MANAGEMENT
  // ============================================

  const findPlayerAtPosition = useCallback((x: number, y: number) => {
    if (!currentPlay?.players) return null;

    const touchRadius = 30 / scale; // Touch-friendly radius
    
    return currentPlay.players.find((player: any) => {
      const distance = Math.sqrt(
        Math.pow(player.x - x, 2) + Math.pow(player.y - y, 2)
      );
      return distance <= touchRadius;
    });
  }, [currentPlay, scale]);

  const addPlayerAtPosition = useCallback((x: number, y: number) => {
    if (!currentPlay) return;

    const newPlayer = {
      id: `player_${Date.now()}`,
      x,
      y,
      position: 'WR',
      number: Math.floor(Math.random() * 99) + 1,
      route: []
    };

    setCurrentPlay(prev => ({
      ...prev,
      players: [...(prev?.players || []), newPlayer]
    }));
  }, [currentPlay]);

  const updatePlayerPosition = useCallback((playerId: string, x: number, y: number) => {
    setCurrentPlay(prev => ({
      ...prev,
      players: prev?.players?.map((player: any) =>
        player.id === playerId ? { ...player, x, y } : player
      ) || []
    }));
  }, []);

  // ============================================
  // UI HELPERS
  // ============================================

  const showPlayerMenu = useCallback((player: any, point: TouchPoint) => {
    // Show player-specific menu
    setShowTouchControls(true);
  }, []);

  const hidePlayerMenu = useCallback(() => {
    setShowTouchControls(false);
  }, []);

  const showContextMenu = useCallback((point: TouchPoint) => {
    // Show general context menu
  }, []);

  const nextPlay = useCallback(() => {
    // Navigate to next play
  }, []);

  const previousPlay = useCallback(() => {
    // Navigate to previous play
  }, []);

  // ============================================
  // AI INTEGRATION
  // ============================================

  const generateAISuggestion = useCallback(async () => {
    if (!teamContext) return;

    setIsLoading(true);
    try {
      const gameContext = {
        down: 3,
        distance: 7,
        fieldPosition: 'midfield',
        scoreDifferential: 0,
        timeRemaining: 300
      };

      const result = await ai.generatePlaySuggestion(gameContext, teamContext);
      
      if (result.suggestions?.[0]) {
        setCurrentPlay(result.suggestions[0]);
      }
    } catch (error) {
      console.error('Failed to generate AI suggestion:', error);
    } finally {
      setIsLoading(false);
    }
  }, [ai, teamContext]);

  // ============================================
  // RENDERING
  // ============================================

  const renderTouchControls = () => {
    if (!showTouchControls) return null;

    return (
      <div className="touch-controls-overlay">
        <div className="touch-controls">
          <button 
            className="touch-control-btn"
            onClick={() => setScale(prev => Math.min(prev * 1.2, 3))}
          >
            🔍+
          </button>
          <button 
            className="touch-control-btn"
            onClick={() => setScale(prev => Math.max(prev / 1.2, 0.5))}
          >
            🔍-
          </button>
          <button 
            className="touch-control-btn"
            onClick={generateAISuggestion}
            disabled={isLoading}
          >
            {isLoading ? '🤔' : '🧠'}
          </button>
          <button 
            className="touch-control-btn"
            onClick={() => onPlaySave?.(currentPlay)}
          >
            💾
          </button>
        </div>
      </div>
    );
  };

  const renderCanvas = () => {
    return (
      <canvas
        ref={canvasRef}
        className="touch-optimized-canvas"
        width={800}
        height={600}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          touchAction: 'none', // Prevent default touch behaviors
          cursor: 'crosshair'
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      />
    );
  };

  const renderInstructions = () => {
    return (
      <div className="touch-instructions">
        <h3>Touch Controls</h3>
        <ul>
          <li>👆 <strong>Tap:</strong> Select player</li>
          <li>👆👆 <strong>Double Tap:</strong> Add new player</li>
          <li>👆⏱️ <strong>Long Press:</strong> Context menu</li>
          <li>👆➡️ <strong>Swipe Left/Right:</strong> Navigate plays</li>
          <li>👆⬆️⬇️ <strong>Swipe Up/Down:</strong> Zoom in/out</li>
          <li>👆↔️ <strong>Pan:</strong> Move selected player</li>
        </ul>
      </div>
    );
  };

  return (
    <div className={`touch-optimized-playbook ${className}`}>
      <div className="playbook-header">
        <h2>Touch-Optimized Playbook</h2>
        <div className="header-controls">
          <button 
            className="ai-suggest-btn"
            onClick={generateAISuggestion}
            disabled={isLoading}
          >
            {isLoading ? (
              <LoadingState type="spinner" size="small" text="AI Thinking..." />
            ) : (
              '🧠 AI Suggest Play'
            )}
          </button>
        </div>
      </div>

      <div className="playbook-container" ref={containerRef}>
        {renderCanvas()}
        {renderTouchControls()}
      </div>

      <div className="playbook-sidebar">
        {renderInstructions()}
        
        {selectedPlayer && (
          <div className="player-details">
            <h4>Selected Player</h4>
            <p>Position: {selectedPlayer.position}</p>
            <p>Number: {selectedPlayer.number}</p>
            <button onClick={() => setSelectedPlayer(null)}>
              Deselect
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .touch-optimized-playbook {
          display: flex;
          flex-direction: column;
          height: 100vh;
          max-height: 100vh;
          overflow: hidden;
        }

        .playbook-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
        }

        .playbook-container {
          flex: 1;
          position: relative;
          overflow: hidden;
          background: #f0f0f0;
        }

        .touch-optimized-canvas {
          display: block;
          background: white;
          border: 1px solid #ddd;
          touch-action: none;
        }

        .touch-controls-overlay {
          position: absolute;
          top: 1rem;
          right: 1rem;
          z-index: 10;
        }

        .touch-controls {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .touch-control-btn {
          width: 50px;
          height: 50px;
          border: none;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          font-size: 1.2rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .touch-control-btn:hover {
          background: rgba(0, 0, 0, 0.9);
          transform: scale(1.1);
        }

        .touch-control-btn:active {
          transform: scale(0.95);
        }

        .playbook-sidebar {
          width: 300px;
          padding: 1rem;
          background: white;
          border-left: 1px solid #e9ecef;
          overflow-y: auto;
        }

        .touch-instructions {
          margin-bottom: 2rem;
        }

        .touch-instructions h3 {
          margin-bottom: 1rem;
          color: #333;
        }

        .touch-instructions ul {
          list-style: none;
          padding: 0;
        }

        .touch-instructions li {
          padding: 0.5rem 0;
          border-bottom: 1px solid #eee;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .player-details {
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
          margin-top: 1rem;
        }

        .ai-suggest-btn {
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .ai-suggest-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .ai-suggest-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        @media (max-width: 768px) {
          .playbook-sidebar {
            width: 100%;
            border-left: none;
            border-top: 1px solid #e9ecef;
          }

          .touch-controls {
            flex-direction: row;
            gap: 0.25rem;
          }

          .touch-control-btn {
            width: 40px;
            height: 40px;
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
}; 