"use strict";
// src/components/ui/FieldCanvas.tsx
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
exports.FieldCanvas = void 0;
const react_1 = __importStar(require("react"));
const haptics_1 = require("@capacitor/haptics");
const FieldCanvas = ({ width, height, onDraw, onPlayerMove, onZoom, onPan, initialScale = 1, maxScale = 3, minScale = 0.5, enableTouchDrawing = true, enablePinchZoom = true, enablePanning = true, className = '', style = {}, }) => {
    const canvasRef = (0, react_1.useRef)(null);
    const containerRef = (0, react_1.useRef)(null);
    const animationFrameRef = (0, react_1.useRef)();
    const touchStatesRef = (0, react_1.useRef)(new Map());
    const gestureStateRef = (0, react_1.useRef)({
        scale: initialScale,
        offsetX: 0,
        offsetY: 0,
        isPanning: false,
        isZooming: false,
        isDrawing: false,
    });
    const [isDrawing, setIsDrawing] = (0, react_1.useState)(false);
    const [drawingPoints, setDrawingPoints] = (0, react_1.useState)([]);
    const [contextMenu, setContextMenu] = (0, react_1.useState)({
        x: 0,
        y: 0,
        visible: false,
    });
    // ============================================
    // CANVAS CONTEXT AND RENDERING
    // ============================================
    const canvasContext = (0, react_1.useMemo)(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return null;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return null;
        // Set canvas size with device pixel ratio
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        return ctx;
    }, [width, height]);
    const renderCanvas = (0, react_1.useCallback)(() => {
        const ctx = canvasContext;
        if (!ctx)
            return;
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        // Apply transformations
        ctx.save();
        ctx.translate(gestureStateRef.current.offsetX, gestureStateRef.current.offsetY);
        ctx.scale(gestureStateRef.current.scale, gestureStateRef.current.scale);
        // Draw field background
        drawFieldBackground(ctx);
        // Draw players
        drawPlayers(ctx);
        // Draw routes
        drawRoutes(ctx);
        // Draw current drawing path
        if (drawingPoints.length > 0) {
            drawPath(ctx, drawingPoints, '#007AFF', 3);
        }
        ctx.restore();
        // Schedule next frame
        animationFrameRef.current = requestAnimationFrame(renderCanvas);
    }, [canvasContext, width, height, drawingPoints]);
    // ============================================
    // DRAWING FUNCTIONS
    // ============================================
    const drawFieldBackground = (0, react_1.useCallback)((ctx) => {
        // Field outline
        ctx.strokeStyle = '#2C3E50';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, width, height);
        // Field markings (yard lines, hash marks, etc.)
        ctx.strokeStyle = '#34495E';
        ctx.lineWidth = 1;
        // Draw yard lines every 10 yards
        for (let i = 0; i <= width; i += width / 10) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, height);
            ctx.stroke();
        }
        // Draw hash marks
        for (let i = 0; i <= height; i += height / 5) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(10, i);
            ctx.moveTo(width - 10, i);
            ctx.lineTo(width, i);
            ctx.stroke();
        }
    }, [width, height]);
    const drawPlayers = (0, react_1.useCallback)((ctx) => {
        // Example player positions - replace with actual player data
        const players = [
            { id: 'qb', x: width * 0.5, y: height * 0.8, color: '#E74C3C' },
            { id: 'rb', x: width * 0.3, y: height * 0.7, color: '#3498DB' },
            { id: 'wr1', x: width * 0.2, y: height * 0.3, color: '#2ECC71' },
            { id: 'wr2', x: width * 0.8, y: height * 0.3, color: '#F39C12' },
        ];
        players.forEach(player => {
            ctx.fillStyle = player.color;
            ctx.beginPath();
            ctx.arc(player.x, player.y, 15, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(player.id.toUpperCase(), player.x, player.y + 4);
        });
    }, [width, height]);
    const drawRoutes = (0, react_1.useCallback)((ctx) => {
        // Example routes - replace with actual route data
        const routes = [
            { start: { x: width * 0.5, y: height * 0.8 }, end: { x: width * 0.2, y: height * 0.3 }, color: '#E74C3C' },
            { start: { x: width * 0.3, y: height * 0.7 }, end: { x: width * 0.8, y: height * 0.3 }, color: '#3498DB' },
        ];
        routes.forEach(route => {
            ctx.strokeStyle = route.color;
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(route.start.x, route.start.y);
            ctx.lineTo(route.end.x, route.end.y);
            ctx.stroke();
            ctx.setLineDash([]);
        });
    }, [width, height]);
    const drawPath = (0, react_1.useCallback)((ctx, points, color, lineWidth) => {
        if (points.length < 2)
            return;
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
    }, []);
    // ============================================
    // TOUCH EVENT HANDLERS
    // ============================================
    const getTouchPosition = (0, react_1.useCallback)((event, touch) => {
        var _a;
        const rect = (_a = canvasRef.current) === null || _a === void 0 ? void 0 : _a.getBoundingClientRect();
        if (!rect)
            return { x: 0, y: 0 };
        return {
            x: (touch.clientX - rect.left - gestureStateRef.current.offsetX) / gestureStateRef.current.scale,
            y: (touch.clientY - rect.top - gestureStateRef.current.offsetY) / gestureStateRef.current.scale,
        };
    }, []);
    const handleTouchStart = (0, react_1.useCallback)((event) => {
        event.preventDefault();
        event.stopPropagation();
        const touches = Array.from(event.touches);
        touches.forEach(touch => {
            const position = getTouchPosition(event, touch);
            const touchState = {
                id: touch.identifier,
                startX: position.x,
                startY: position.y,
                currentX: position.x,
                currentY: position.y,
                startTime: Date.now(),
            };
            touchStatesRef.current.set(touch.identifier, touchState);
        });
        // Determine gesture type
        if (touches.length === 1 && enableTouchDrawing) {
            // Single touch - drawing mode
            gestureStateRef.current.isDrawing = true;
            setIsDrawing(true);
            setDrawingPoints([getTouchPosition(event, touches[0])]);
        }
        else if (touches.length === 2 && enablePinchZoom) {
            // Two touches - zoom/pan mode
            gestureStateRef.current.isZooming = true;
            triggerHapticFeedback('light');
        }
        else if (touches.length === 1 && enablePanning) {
            // Single touch - panning mode
            gestureStateRef.current.isPanning = true;
        }
    }, [getTouchPosition, enableTouchDrawing, enablePinchZoom, enablePanning]);
    const handleTouchMove = (0, react_1.useCallback)((event) => {
        event.preventDefault();
        event.stopPropagation();
        const touches = Array.from(event.touches);
        if (gestureStateRef.current.isDrawing && touches.length === 1) {
            // Drawing mode
            const position = getTouchPosition(event, touches[0]);
            setDrawingPoints(prev => [...prev, position]);
        }
        else if (gestureStateRef.current.isZooming && touches.length === 2) {
            // Pinch to zoom
            const touch1 = touchStatesRef.current.get(touches[0].identifier);
            const touch2 = touchStatesRef.current.get(touches[1].identifier);
            if (touch1 && touch2) {
                const currentDistance = Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
                const startDistance = Math.hypot(touch1.startX - touch2.startX, touch1.startY - touch2.startY);
                const scaleFactor = currentDistance / startDistance;
                const newScale = Math.max(minScale, Math.min(maxScale, gestureStateRef.current.scale * scaleFactor));
                gestureStateRef.current.scale = newScale;
                onZoom === null || onZoom === void 0 ? void 0 : onZoom(newScale);
            }
        }
        else if (gestureStateRef.current.isPanning && touches.length === 1) {
            // Panning mode
            const touch = touchStatesRef.current.get(touches[0].identifier);
            if (touch) {
                const deltaX = touches[0].clientX - touch.startX;
                const deltaY = touches[0].clientY - touch.startY;
                gestureStateRef.current.offsetX += deltaX;
                gestureStateRef.current.offsetY += deltaY;
                onPan === null || onPan === void 0 ? void 0 : onPan({ x: gestureStateRef.current.offsetX, y: gestureStateRef.current.offsetY });
                // Update touch start position for smooth panning
                touch.startX = touches[0].clientX;
                touch.startY = touches[0].clientY;
            }
        }
        // Update current positions
        touches.forEach(touch => {
            const touchState = touchStatesRef.current.get(touch.identifier);
            if (touchState) {
                const position = getTouchPosition(event, touch);
                touchState.currentX = position.x;
                touchState.currentY = position.y;
            }
        });
    }, [getTouchPosition, minScale, maxScale, onZoom, onPan]);
    const handleTouchEnd = (0, react_1.useCallback)((event) => {
        event.preventDefault();
        event.stopPropagation();
        const touches = Array.from(event.touches);
        if (gestureStateRef.current.isDrawing && drawingPoints.length > 0) {
            // Finish drawing
            onDraw === null || onDraw === void 0 ? void 0 : onDraw(drawingPoints);
            setDrawingPoints([]);
            setIsDrawing(false);
            triggerHapticFeedback('success');
        }
        // Remove ended touches
        const endedTouches = Array.from(touchStatesRef.current.keys()).filter(id => !touches.some(touch => touch.identifier === id));
        endedTouches.forEach(id => {
            touchStatesRef.current.delete(id);
        });
        // Reset gesture states
        if (touches.length === 0) {
            gestureStateRef.current.isPanning = false;
            gestureStateRef.current.isZooming = false;
            gestureStateRef.current.isDrawing = false;
        }
    }, [drawingPoints, onDraw]);
    // ============================================
    // LONG PRESS HANDLER
    // ============================================
    const handleLongPress = (0, react_1.useCallback)((event) => {
        var _a;
        const touch = event.touches[0];
        const rect = (_a = canvasRef.current) === null || _a === void 0 ? void 0 : _a.getBoundingClientRect();
        if (rect) {
            setContextMenu({
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top,
                visible: true,
            });
            triggerHapticFeedback('medium');
        }
    }, []);
    // ============================================
    // HAPTIC FEEDBACK
    // ============================================
    const triggerHapticFeedback = (0, react_1.useCallback)((type) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            switch (type) {
                case 'light':
                    yield haptics_1.Haptics.impact({ style: 'light' });
                    break;
                case 'medium':
                    yield haptics_1.Haptics.impact({ style: 'medium' });
                    break;
                case 'heavy':
                    yield haptics_1.Haptics.impact({ style: 'heavy' });
                    break;
                case 'success':
                    yield haptics_1.Haptics.notification({ type: 'success' });
                    break;
                case 'error':
                    yield haptics_1.Haptics.notification({ type: 'error' });
                    break;
            }
        }
        catch (error) {
            console.warn('Haptic feedback not available:', error);
        }
    }), []);
    // ============================================
    // CONTEXT MENU HANDLERS
    // ============================================
    const handleContextMenuAction = (0, react_1.useCallback)((action) => {
        setContextMenu(prev => (Object.assign(Object.assign({}, prev), { visible: false })));
        switch (action) {
            case 'add-player':
                // Add player at context menu position
                break;
            case 'add-route':
                // Start route drawing
                break;
            case 'delete':
                // Delete element at position
                break;
            case 'properties':
                // Show properties panel
                break;
        }
        triggerHapticFeedback('light');
    }, [triggerHapticFeedback]);
    // ============================================
    // EFFECTS
    // ============================================
    (0, react_1.useEffect)(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        // Add touch event listeners
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
        // Add long press detection
        let longPressTimer;
        const handleLongPressStart = (event) => {
            longPressTimer = setTimeout(() => handleLongPress(event), 500);
        };
        const handleLongPressCancel = () => {
            clearTimeout(longPressTimer);
        };
        canvas.addEventListener('touchstart', handleLongPressStart);
        canvas.addEventListener('touchmove', handleLongPressCancel);
        canvas.addEventListener('touchend', handleLongPressCancel);
        // Start rendering loop
        renderCanvas();
        // Cleanup
        return () => {
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
            canvas.removeEventListener('touchstart', handleLongPressStart);
            canvas.removeEventListener('touchmove', handleLongPressCancel);
            canvas.removeEventListener('touchend', handleLongPressCancel);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            clearTimeout(longPressTimer);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleLongPress, renderCanvas]);
    // ============================================
    // RENDER
    // ============================================
    return (react_1.default.createElement("div", { ref: containerRef, className: `field-canvas-container ${className}`, style: Object.assign({ position: 'relative', width,
            height, overflow: 'hidden', touchAction: 'none' }, style) },
        react_1.default.createElement("canvas", { ref: canvasRef, className: "field-canvas", style: {
                display: 'block',
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
            } }),
        contextMenu.visible && (react_1.default.createElement("div", { className: "context-menu", style: {
                position: 'absolute',
                left: contextMenu.x,
                top: contextMenu.y,
                backgroundColor: '#FFFFFF',
                border: '1px solid #CCCCCC',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                padding: '8px 0',
                zIndex: 1000,
            } },
            react_1.default.createElement(TouchableOpacity, { onPress: () => handleContextMenuAction('add-player'), className: "context-menu-item", style: { padding: '8px 16px', fontSize: '14px' } }, "Add Player"),
            react_1.default.createElement(TouchableOpacity, { onPress: () => handleContextMenuAction('add-route'), className: "context-menu-item", style: { padding: '8px 16px', fontSize: '14px' } }, "Add Route"),
            react_1.default.createElement(TouchableOpacity, { onPress: () => handleContextMenuAction('delete'), className: "context-menu-item", style: { padding: '8px 16px', fontSize: '14px', color: '#E74C3C' } }, "Delete"),
            react_1.default.createElement(TouchableOpacity, { onPress: () => handleContextMenuAction('properties'), className: "context-menu-item", style: { padding: '8px 16px', fontSize: '14px' } }, "Properties")))));
};
exports.FieldCanvas = FieldCanvas;
// ============================================
// EXPORT
// ============================================
exports.default = exports.FieldCanvas;
