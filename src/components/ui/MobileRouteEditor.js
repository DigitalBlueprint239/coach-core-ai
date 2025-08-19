"use strict";
// src/components/ui/MobileRouteEditor.tsx
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
exports.MobileRouteEditor = void 0;
const react_1 = __importStar(require("react"));
const TouchableOpacity_1 = require("./TouchableOpacity");
const haptics_1 = require("@capacitor/haptics");
const MobileRouteEditor = ({ routes, onRouteChange, onRouteSelect, selectedRouteId, canvasWidth, canvasHeight, className = '', style = {}, }) => {
    const canvasRef = (0, react_1.useRef)(null);
    const containerRef = (0, react_1.useRef)(null);
    const [isDrawing, setIsDrawing] = (0, react_1.useState)(false);
    const [currentRoute, setCurrentRoute] = (0, react_1.useState)(null);
    const [selectedPoint, setSelectedPoint] = (0, react_1.useState)(null);
    const [showColorPicker, setShowColorPicker] = (0, react_1.useState)(false);
    const [showRouteTypeSelector, setShowRouteTypeSelector] = (0, react_1.useState)(false);
    // ============================================
    // CANVAS RENDERING
    // ============================================
    const renderCanvas = (0, react_1.useCallback)(() => {
        const canvas = canvasRef.current;
        const ctx = canvas === null || canvas === void 0 ? void 0 : canvas.getContext('2d');
        if (!canvas || !ctx)
            return;
        // Clear canvas
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        // Draw field background
        drawFieldBackground(ctx);
        // Draw all routes
        routes.forEach(route => {
            drawRoute(ctx, route, route.id === selectedRouteId);
        });
        // Draw current route being edited
        if (currentRoute) {
            drawRoute(ctx, currentRoute, true, true);
        }
    }, [routes, selectedRouteId, currentRoute, canvasWidth, canvasHeight]);
    const drawFieldBackground = (0, react_1.useCallback)((ctx) => {
        // Field outline
        ctx.strokeStyle = '#2C3E50';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, canvasWidth, canvasHeight);
        // Grid lines
        ctx.strokeStyle = '#34495E';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        // Vertical lines
        for (let i = 0; i <= canvasWidth; i += canvasWidth / 10) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvasHeight);
            ctx.stroke();
        }
        // Horizontal lines
        for (let i = 0; i <= canvasHeight; i += canvasHeight / 5) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvasWidth, i);
            ctx.stroke();
        }
        ctx.setLineDash([]);
    }, [canvasWidth, canvasHeight]);
    const drawRoute = (0, react_1.useCallback)((ctx, route, isSelected, isEditing = false) => {
        if (route.points.length < 2)
            return;
        // Draw route line
        ctx.strokeStyle = route.color;
        ctx.lineWidth = isSelected ? 4 : 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (isEditing) {
            ctx.setLineDash([5, 5]);
        }
        ctx.beginPath();
        ctx.moveTo(route.points[0].x, route.points[0].y);
        for (let i = 1; i < route.points.length; i++) {
            ctx.lineTo(route.points[i].x, route.points[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        // Draw route points
        route.points.forEach((point, index) => {
            const isSelectedPoint = (selectedPoint === null || selectedPoint === void 0 ? void 0 : selectedPoint.id) === point.id;
            const radius = isSelectedPoint ? 12 : 8;
            // Point background
            ctx.fillStyle = isSelectedPoint ? '#FFFFFF' : route.color;
            ctx.beginPath();
            ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
            ctx.fill();
            // Point border
            ctx.strokeStyle = isSelectedPoint ? route.color : '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();
            // Point label
            ctx.fillStyle = isSelectedPoint ? route.color : '#FFFFFF';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText((index + 1).toString(), point.x, point.y + 4);
        });
    }, [selectedPoint]);
    // ============================================
    // TOUCH HANDLERS
    // ============================================
    const getTouchPosition = (0, react_1.useCallback)((event) => {
        var _a;
        const rect = (_a = canvasRef.current) === null || _a === void 0 ? void 0 : _a.getBoundingClientRect();
        if (!rect)
            return { x: 0, y: 0 };
        const touch = event.touches[0];
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top,
        };
    }, []);
    const findPointAtPosition = (0, react_1.useCallback)((x, y, threshold = 20) => {
        for (const route of routes) {
            for (const point of route.points) {
                const distance = Math.hypot(point.x - x, point.y - y);
                if (distance <= threshold) {
                    return point;
                }
            }
        }
        return null;
    }, [routes]);
    const handleTouchStart = (0, react_1.useCallback)((event) => {
        event.preventDefault();
        event.stopPropagation();
        const position = getTouchPosition(event);
        const point = findPointAtPosition(position.x, position.y);
        if (point) {
            // Select existing point
            setSelectedPoint(point);
            triggerHapticFeedback('light');
        }
        else {
            // Start drawing new route or add point to current route
            if (!currentRoute) {
                // Create new route
                const newRoute = {
                    id: `route_${Date.now()}`,
                    points: [{ id: `point_${Date.now()}`, x: position.x, y: position.y, type: 'start' }],
                    color: '#007AFF',
                    type: 'run',
                    playerId: 'player_1',
                };
                setCurrentRoute(newRoute);
            }
            else {
                // Add point to current route
                const newPoint = {
                    id: `point_${Date.now()}`,
                    x: position.x,
                    y: position.y,
                    type: currentRoute.points.length === 0 ? 'start' : 'waypoint',
                };
                setCurrentRoute(prev => prev ? Object.assign(Object.assign({}, prev), { points: [...prev.points, newPoint] }) : null);
            }
            setIsDrawing(true);
            triggerHapticFeedback('light');
        }
    }, [getTouchPosition, findPointAtPosition, currentRoute, triggerHapticFeedback]);
    const handleTouchMove = (0, react_1.useCallback)((event) => {
        if (!isDrawing || !currentRoute)
            return;
        event.preventDefault();
        event.stopPropagation();
        const position = getTouchPosition(event);
        // Update last point position while drawing
        setCurrentRoute(prev => {
            if (!prev || prev.points.length === 0)
                return prev;
            const updatedPoints = [...prev.points];
            updatedPoints[updatedPoints.length - 1] = Object.assign(Object.assign({}, updatedPoints[updatedPoints.length - 1]), { x: position.x, y: position.y });
            return Object.assign(Object.assign({}, prev), { points: updatedPoints });
        });
    }, [isDrawing, currentRoute, getTouchPosition]);
    const handleTouchEnd = (0, react_1.useCallback)((event) => {
        event.preventDefault();
        event.stopPropagation();
        if (isDrawing && currentRoute) {
            // Finish drawing current route
            if (currentRoute.points.length >= 2) {
                // Mark last point as end point
                const updatedPoints = [...currentRoute.points];
                updatedPoints[updatedPoints.length - 1] = Object.assign(Object.assign({}, updatedPoints[updatedPoints.length - 1]), { type: 'end' });
                const completedRoute = Object.assign(Object.assign({}, currentRoute), { points: updatedPoints });
                onRouteChange([...routes, completedRoute]);
                onRouteSelect(completedRoute.id);
                triggerHapticFeedback('success');
            }
            setCurrentRoute(null);
            setIsDrawing(false);
        }
    }, [isDrawing, currentRoute, routes, onRouteChange, onRouteSelect, triggerHapticFeedback]);
    // ============================================
    // ROUTE EDITING
    // ============================================
    const handlePointMove = (0, react_1.useCallback)((pointId, newX, newY) => {
        const updatedRoutes = routes.map(route => (Object.assign(Object.assign({}, route), { points: route.points.map(point => point.id === pointId ? Object.assign(Object.assign({}, point), { x: newX, y: newY }) : point) })));
        onRouteChange(updatedRoutes);
    }, [routes, onRouteChange]);
    const handleRouteDelete = (0, react_1.useCallback)((routeId) => {
        const updatedRoutes = routes.filter(route => route.id !== routeId);
        onRouteChange(updatedRoutes);
        triggerHapticFeedback('success');
    }, [routes, onRouteChange, triggerHapticFeedback]);
    const handleRouteColorChange = (0, react_1.useCallback)((routeId, color) => {
        const updatedRoutes = routes.map(route => route.id === routeId ? Object.assign(Object.assign({}, route), { color }) : route);
        onRouteChange(updatedRoutes);
        setShowColorPicker(false);
        triggerHapticFeedback('light');
    }, [routes, onRouteChange, triggerHapticFeedback]);
    const handleRouteTypeChange = (0, react_1.useCallback)((routeId, type) => {
        const updatedRoutes = routes.map(route => route.id === routeId ? Object.assign(Object.assign({}, route), { type }) : route);
        onRouteChange(updatedRoutes);
        setShowRouteTypeSelector(false);
        triggerHapticFeedback('light');
    }, [routes, onRouteChange, triggerHapticFeedback]);
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
        // Cleanup
        return () => {
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
    (0, react_1.useEffect)(() => {
        renderCanvas();
    }, [renderCanvas]);
    // ============================================
    // RENDER
    // ============================================
    const colors = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5856D6'];
    return (react_1.default.createElement("div", { ref: containerRef, className: `mobile-route-editor ${className}`, style: Object.assign({ position: 'relative', width: canvasWidth, height: canvasHeight }, style) },
        react_1.default.createElement("canvas", { ref: canvasRef, width: canvasWidth, height: canvasHeight, style: {
                display: 'block',
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
            } }),
        react_1.default.createElement("div", { className: "route-controls", style: {
                position: 'absolute',
                bottom: 20,
                left: 20,
                right: 20,
                display: 'flex',
                gap: 10,
                justifyContent: 'center',
            } },
            react_1.default.createElement(TouchableOpacity_1.TouchableOpacity, { onPress: () => setShowColorPicker(!showColorPicker), className: "control-button", style: {
                    backgroundColor: '#007AFF',
                    color: '#FFFFFF',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                }, hapticFeedback: "light" }, "Color"),
            react_1.default.createElement(TouchableOpacity_1.TouchableOpacity, { onPress: () => setShowRouteTypeSelector(!showRouteTypeSelector), className: "control-button", style: {
                    backgroundColor: '#34C759',
                    color: '#FFFFFF',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                }, hapticFeedback: "light" }, "Type"),
            selectedRouteId && (react_1.default.createElement(TouchableOpacity_1.TouchableOpacity, { onPress: () => handleRouteDelete(selectedRouteId), className: "control-button", style: {
                    backgroundColor: '#FF3B30',
                    color: '#FFFFFF',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                }, hapticFeedback: "medium" }, "Delete"))),
        showColorPicker && (react_1.default.createElement("div", { className: "color-picker", style: {
                position: 'absolute',
                bottom: 80,
                left: 20,
                right: 20,
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                justifyContent: 'center',
            } }, colors.map(color => (react_1.default.createElement(TouchableOpacity_1.TouchableOpacity, { key: color, onPress: () => selectedRouteId && handleRouteColorChange(selectedRouteId, color), className: "color-option", style: {
                width: '40px',
                height: '40px',
                backgroundColor: color,
                borderRadius: '20px',
                border: '2px solid #FFFFFF',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            }, hapticFeedback: "light" }))))),
        showRouteTypeSelector && (react_1.default.createElement("div", { className: "route-type-selector", style: {
                position: 'absolute',
                bottom: 80,
                left: 20,
                right: 20,
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
            } }, ['run', 'pass', 'block'].map(type => (react_1.default.createElement(TouchableOpacity_1.TouchableOpacity, { key: type, onPress: () => selectedRouteId && handleRouteTypeChange(selectedRouteId, type), className: "route-type-option", style: {
                padding: '12px 16px',
                backgroundColor: '#F8F9FA',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                textTransform: 'capitalize',
                textAlign: 'center',
            }, hapticFeedback: "light" }, type))))),
        react_1.default.createElement("div", { className: "instructions", style: {
                position: 'absolute',
                top: 20,
                left: 20,
                right: 20,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: '#FFFFFF',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                textAlign: 'center',
            } }, isDrawing ? 'Drawing route...' : 'Tap to start drawing a route')));
};
exports.MobileRouteEditor = MobileRouteEditor;
// ============================================
// EXPORT
// ============================================
exports.default = exports.MobileRouteEditor;
