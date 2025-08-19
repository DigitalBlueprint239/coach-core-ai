"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TouchOptimizedPlaybook = void 0;
// src/components/SmartPlaybook/TouchOptimizedPlaybook.tsx
const react_1 = __importStar(require("react"));
const AIContext_1 = require("../../ai-brain/AIContext");
const LoadingStates_1 = require("../LoadingStates");
const firestore_1 = require("firebase/firestore");
// ============================================
// TOUCH GESTURE DETECTION
// ============================================
class TouchGestureDetector {
    constructor() {
        this.touchStartTime = 0;
        this.touchStartPoint = null;
        this.touchTimeout = null;
        this.longPressThreshold = 500;
        this.doubleTapThreshold = 300;
        this.lastTapTime = 0;
        this.onTouchStart = (event, callback) => {
            const touch = event.touches[0];
            const point = {
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
        this.onTouchEnd = (event, callback) => {
            if (this.touchTimeout) {
                clearTimeout(this.touchTimeout);
                this.touchTimeout = null;
            }
            if (!this.touchStartPoint)
                return;
            const touch = event.changedTouches[0];
            const endPoint = {
                x: touch.clientX,
                y: touch.clientY,
                id: touch.identifier
            };
            const duration = Date.now() - this.touchStartTime;
            const distance = Math.sqrt(Math.pow(endPoint.x - this.touchStartPoint.x, 2) +
                Math.pow(endPoint.y - this.touchStartPoint.y, 2));
            // Determine gesture type
            let gestureType = 'tap';
            let direction;
            if (distance > 50) {
                gestureType = 'swipe';
                const deltaX = endPoint.x - this.touchStartPoint.x;
                const deltaY = endPoint.y - this.touchStartPoint.y;
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    direction = deltaX > 0 ? 'right' : 'left';
                }
                else {
                    direction = deltaY > 0 ? 'down' : 'up';
                }
            }
            else if (duration < 200) {
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
        this.onTouchMove = (event, callback) => {
            if (this.touchTimeout) {
                clearTimeout(this.touchTimeout);
                this.touchTimeout = null;
            }
            if (!this.touchStartPoint)
                return;
            const touch = event.touches[0];
            const currentPoint = {
                x: touch.clientX,
                y: touch.clientY,
                id: touch.identifier
            };
            const distance = Math.sqrt(Math.pow(currentPoint.x - this.touchStartPoint.x, 2) +
                Math.pow(currentPoint.y - this.touchStartPoint.y, 2));
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
}
// ============================================
// TOUCH OPTIMIZED PLAYBOOK COMPONENT
// ============================================
const TouchOptimizedPlaybook = ({ teamContext, onPlaySave, onPlayLoad, className = '' }) => {
    const ai = (0, AIContext_1.useAI)();
    const canvasRef = (0, react_1.useRef)(null);
    const containerRef = (0, react_1.useRef)(null);
    const gestureDetector = (0, react_1.useRef)(new TouchGestureDetector());
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [currentPlay, setCurrentPlay] = (0, react_1.useState)(null);
    const [selectedPlayer, setSelectedPlayer] = (0, react_1.useState)(null);
    const [isDragging, setIsDragging] = (0, react_1.useState)(false);
    const [dragOffset, setDragOffset] = (0, react_1.useState)({ x: 0, y: 0 });
    const [scale, setScale] = (0, react_1.useState)(1);
    const [showTouchControls, setShowTouchControls] = (0, react_1.useState)(false);
    // ============================================
    // TOUCH EVENT HANDLERS
    // ============================================
    const handleTouchStart = (0, react_1.useCallback)((event) => {
        event.preventDefault();
        gestureDetector.current.onTouchStart(event.nativeEvent, handleGesture);
    }, []);
    const handleTouchEnd = (0, react_1.useCallback)((event) => {
        event.preventDefault();
        gestureDetector.current.onTouchEnd(event.nativeEvent, handleGesture);
    }, []);
    const handleTouchMove = (0, react_1.useCallback)((event) => {
        event.preventDefault();
        gestureDetector.current.onTouchMove(event.nativeEvent, handleGesture);
    }, []);
    const handleGesture = (0, react_1.useCallback)((gesture) => {
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
    const handleTap = (0, react_1.useCallback)((point) => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const rect = canvas.getBoundingClientRect();
        const x = (point.x - rect.left) / scale;
        const y = (point.y - rect.top) / scale;
        // Check if tapping on a player
        const player = findPlayerAtPosition(x, y);
        if (player) {
            setSelectedPlayer(player);
            showPlayerMenu(player, point);
        }
        else {
            setSelectedPlayer(null);
            hidePlayerMenu();
        }
    }, [scale]);
    const handleDoubleTap = (0, react_1.useCallback)((point) => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const rect = canvas.getBoundingClientRect();
        const x = (point.x - rect.left) / scale;
        const y = (point.y - rect.top) / scale;
        // Add new player at tap location
        addPlayerAtPosition(x, y);
    }, [scale]);
    const handleLongPress = (0, react_1.useCallback)((point) => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const rect = canvas.getBoundingClientRect();
        const x = (point.x - rect.left) / scale;
        const y = (point.y - rect.top) / scale;
        // Show context menu
        showContextMenu(point);
    }, [scale]);
    const handleSwipe = (0, react_1.useCallback)((gesture) => {
        if (gesture.direction === 'left' || gesture.direction === 'right') {
            // Navigate between plays
            if (gesture.direction === 'left') {
                nextPlay();
            }
            else {
                previousPlay();
            }
        }
        else if (gesture.direction === 'up' || gesture.direction === 'down') {
            // Zoom in/out
            if (gesture.direction === 'up') {
                setScale(prev => Math.min(prev * 1.2, 3));
            }
            else {
                setScale(prev => Math.max(prev / 1.2, 0.5));
            }
        }
    }, []);
    const handlePan = (0, react_1.useCallback)((gesture) => {
        if (selectedPlayer && gesture.endPoint) {
            const canvas = canvasRef.current;
            if (!canvas)
                return;
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
    const findPlayerAtPosition = (0, react_1.useCallback)((x, y) => {
        if (!(currentPlay === null || currentPlay === void 0 ? void 0 : currentPlay.players))
            return null;
        const touchRadius = 30 / scale; // Touch-friendly radius
        return currentPlay.players.find((player) => {
            const distance = Math.sqrt(Math.pow(player.x - x, 2) + Math.pow(player.y - y, 2));
            return distance <= touchRadius;
        });
    }, [currentPlay, scale]);
    const addPlayerAtPosition = (0, react_1.useCallback)((x, y) => {
        if (!currentPlay)
            return;
        const newPlayer = {
            id: `player_${Date.now()}`,
            x,
            y,
            position: 'WR',
            number: Math.floor(Math.random() * 99) + 1,
            route: []
        };
        setCurrentPlay(prev => (Object.assign(Object.assign({}, prev), { players: [...((prev === null || prev === void 0 ? void 0 : prev.players) || []), newPlayer] })));
    }, [currentPlay]);
    const updatePlayerPosition = (0, react_1.useCallback)((playerId, x, y) => {
        setCurrentPlay(prev => {
            var _a;
            return (Object.assign(Object.assign({}, prev), { players: ((_a = prev === null || prev === void 0 ? void 0 : prev.players) === null || _a === void 0 ? void 0 : _a.map((player) => player.id === playerId ? Object.assign(Object.assign({}, player), { x, y }) : player)) || [] }));
        });
    }, []);
    // ============================================
    // UI HELPERS
    // ============================================
    const showPlayerMenu = (0, react_1.useCallback)((player, point) => {
        // Show player-specific menu
        setShowTouchControls(true);
    }, []);
    const hidePlayerMenu = (0, react_1.useCallback)(() => {
        setShowTouchControls(false);
    }, []);
    const showContextMenu = (0, react_1.useCallback)((point) => {
        // Show general context menu
    }, []);
    const nextPlay = (0, react_1.useCallback)(() => {
        // Navigate to next play
    }, []);
    const previousPlay = (0, react_1.useCallback)(() => {
        // Navigate to previous play
    }, []);
    // ============================================
    // AI INTEGRATION
    // ============================================
    const generateAISuggestion = (0, react_1.useCallback)(() => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        if (!teamContext)
            return;
        setIsLoading(true);
        try {
            const gameContext = {
                gameId: 'demo-game',
                opponent: 'Demo Opponent',
                date: firestore_1.Timestamp.fromDate(new Date()), // Use Firestore Timestamp
                location: 'Demo Field',
                down: 3,
                distance: 7,
                fieldPosition: 'midfield',
                scoreDifferential: 0,
                timeRemaining: 300
            };
            const result = yield ai.generatePlaySuggestion(gameContext, teamContext);
            if ((_a = result.suggestions) === null || _a === void 0 ? void 0 : _a[0]) {
                setCurrentPlay(result.suggestions[0]);
            }
        }
        catch (error) {
            console.error('Failed to generate AI suggestion:', error);
        }
        finally {
            setIsLoading(false);
        }
    }), [ai, teamContext]);
    // ============================================
    // RENDERING
    // ============================================
    const renderTouchControls = () => {
        if (!showTouchControls)
            return null;
        return (react_1.default.createElement("div", { className: "touch-controls-overlay" },
            react_1.default.createElement("div", { className: "touch-controls" },
                react_1.default.createElement("button", { className: "touch-control-btn", onClick: () => setScale(prev => Math.min(prev * 1.2, 3)) }, "\uD83D\uDD0D+"),
                react_1.default.createElement("button", { className: "touch-control-btn", onClick: () => setScale(prev => Math.max(prev / 1.2, 0.5)) }, "\uD83D\uDD0D-"),
                react_1.default.createElement("button", { className: "touch-control-btn", onClick: generateAISuggestion, disabled: isLoading }, isLoading ? '🤔' : '🧠'),
                react_1.default.createElement("button", { className: "touch-control-btn", onClick: () => onPlaySave === null || onPlaySave === void 0 ? void 0 : onPlaySave(currentPlay) }, "\uD83D\uDCBE"))));
    };
    const renderCanvas = () => {
        return (react_1.default.createElement("canvas", { ref: canvasRef, className: "touch-optimized-canvas", width: 800, height: 600, style: {
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                touchAction: 'none', // Prevent default touch behaviors
                cursor: 'crosshair'
            }, onTouchStart: handleTouchStart, onTouchEnd: handleTouchEnd, onTouchMove: handleTouchMove }));
    };
    const renderInstructions = () => {
        return (react_1.default.createElement("div", { className: "touch-instructions" },
            react_1.default.createElement("h3", null, "Touch Controls"),
            react_1.default.createElement("ul", null,
                react_1.default.createElement("li", null,
                    "\uD83D\uDC46 ",
                    react_1.default.createElement("strong", null, "Tap:"),
                    " Select player"),
                react_1.default.createElement("li", null,
                    "\uD83D\uDC46\uD83D\uDC46 ",
                    react_1.default.createElement("strong", null, "Double Tap:"),
                    " Add new player"),
                react_1.default.createElement("li", null,
                    "\uD83D\uDC46\u23F1\uFE0F ",
                    react_1.default.createElement("strong", null, "Long Press:"),
                    " Context menu"),
                react_1.default.createElement("li", null,
                    "\uD83D\uDC46\u27A1\uFE0F ",
                    react_1.default.createElement("strong", null, "Swipe Left/Right:"),
                    " Navigate plays"),
                react_1.default.createElement("li", null,
                    "\uD83D\uDC46\u2B06\uFE0F\u2B07\uFE0F ",
                    react_1.default.createElement("strong", null, "Swipe Up/Down:"),
                    " Zoom in/out"),
                react_1.default.createElement("li", null,
                    "\uD83D\uDC46\u2194\uFE0F ",
                    react_1.default.createElement("strong", null, "Pan:"),
                    " Move selected player"))));
    };
    return (react_1.default.createElement("div", { className: `touch-optimized-playbook ${className}` },
        react_1.default.createElement("div", { className: "playbook-header" },
            react_1.default.createElement("h2", null, "Touch-Optimized Playbook"),
            react_1.default.createElement("div", { className: "header-controls" },
                react_1.default.createElement("button", { className: "ai-suggest-btn", onClick: generateAISuggestion, disabled: isLoading }, isLoading ? (react_1.default.createElement(LoadingStates_1.LoadingState, { type: "spinner", size: "small", text: "AI Thinking..." })) : ('🧠 AI Suggest Play')))),
        react_1.default.createElement("div", { className: "playbook-container", ref: containerRef },
            renderCanvas(),
            renderTouchControls()),
        react_1.default.createElement("div", { className: "playbook-sidebar" },
            renderInstructions(),
            selectedPlayer && (react_1.default.createElement("div", { className: "player-details" },
                react_1.default.createElement("h4", null, "Selected Player"),
                react_1.default.createElement("p", null,
                    "Position: ",
                    selectedPlayer.position),
                react_1.default.createElement("p", null,
                    "Number: ",
                    selectedPlayer.number),
                react_1.default.createElement("button", { onClick: () => setSelectedPlayer(null) }, "Deselect")))),
        react_1.default.createElement("style", null, `
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
      `)));
};
exports.TouchOptimizedPlaybook = TouchOptimizedPlaybook;
