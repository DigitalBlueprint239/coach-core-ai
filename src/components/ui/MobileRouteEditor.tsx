// src/components/ui/MobileRouteEditor.tsx

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { TouchableOpacity } from './TouchableOpacity';
import { Haptics } from '@capacitor/haptics';

interface RoutePoint {
  id: string;
  x: number;
  y: number;
  type: 'start' | 'waypoint' | 'end';
  playerId?: string;
}

interface Route {
  id: string;
  points: RoutePoint[];
  color: string;
  type: 'run' | 'pass' | 'block';
  playerId: string;
}

interface MobileRouteEditorProps {
  routes: Route[];
  onRouteChange: (routes: Route[]) => void;
  onRouteSelect: (routeId: string) => void;
  selectedRouteId?: string;
  canvasWidth: number;
  canvasHeight: number;
  className?: string;
  style?: React.CSSProperties;
}

export const MobileRouteEditor: React.FC<MobileRouteEditorProps> = ({
  routes,
  onRouteChange,
  onRouteSelect,
  selectedRouteId,
  canvasWidth,
  canvasHeight,
  className = '',
  style = {},
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<RoutePoint | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showRouteTypeSelector, setShowRouteTypeSelector] = useState(false);

  // ============================================
  // CANVAS RENDERING
  // ============================================

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

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

  const drawFieldBackground = useCallback(
    (ctx: CanvasRenderingContext2D) => {
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
    },
    [canvasWidth, canvasHeight]
  );

  const drawRoute = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      route: Route,
      isSelected: boolean,
      isEditing = false
    ) => {
      if (route.points.length < 2) return;

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
        const isSelectedPoint = selectedPoint?.id === point.id;
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
    },
    [selectedPoint]
  );

  // ============================================
  // TOUCH HANDLERS
  // ============================================

  const getTouchPosition = useCallback(
    (event: TouchEvent): { x: number; y: number } => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };

      const touch = event.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    },
    []
  );

  const findPointAtPosition = useCallback(
    (x: number, y: number, threshold = 20): RoutePoint | null => {
      for (const route of routes) {
        for (const point of route.points) {
          const distance = Math.hypot(point.x - x, point.y - y);
          if (distance <= threshold) {
            return point;
          }
        }
      }
      return null;
    },
    [routes]
  );

  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const position = getTouchPosition(event);
      const point = findPointAtPosition(position.x, position.y);

      if (point) {
        // Select existing point
        setSelectedPoint(point);
        triggerHapticFeedback('light');
      } else {
        // Start drawing new route or add point to current route
        if (!currentRoute) {
          // Create new route
          const newRoute: Route = {
            id: `route_${Date.now()}`,
            points: [
              {
                id: `point_${Date.now()}`,
                x: position.x,
                y: position.y,
                type: 'start',
              },
            ],
            color: '#007AFF',
            type: 'run',
            playerId: 'player_1',
          };
          setCurrentRoute(newRoute);
        } else {
          // Add point to current route
          const newPoint: RoutePoint = {
            id: `point_${Date.now()}`,
            x: position.x,
            y: position.y,
            type: currentRoute.points.length === 0 ? 'start' : 'waypoint',
          };
          setCurrentRoute(prev =>
            prev
              ? {
                  ...prev,
                  points: [...prev.points, newPoint],
                }
              : null
          );
        }

        setIsDrawing(true);
        triggerHapticFeedback('light');
      }
    },
    [getTouchPosition, findPointAtPosition, currentRoute, triggerHapticFeedback]
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (!isDrawing || !currentRoute) return;

      event.preventDefault();
      event.stopPropagation();

      const position = getTouchPosition(event);

      // Update last point position while drawing
      setCurrentRoute(prev => {
        if (!prev || prev.points.length === 0) return prev;

        const updatedPoints = [...prev.points];
        updatedPoints[updatedPoints.length - 1] = {
          ...updatedPoints[updatedPoints.length - 1],
          x: position.x,
          y: position.y,
        };

        return { ...prev, points: updatedPoints };
      });
    },
    [isDrawing, currentRoute, getTouchPosition]
  );

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (isDrawing && currentRoute) {
        // Finish drawing current route
        if (currentRoute.points.length >= 2) {
          // Mark last point as end point
          const updatedPoints = [...currentRoute.points];
          updatedPoints[updatedPoints.length - 1] = {
            ...updatedPoints[updatedPoints.length - 1],
            type: 'end',
          };

          const completedRoute = { ...currentRoute, points: updatedPoints };
          onRouteChange([...routes, completedRoute]);
          onRouteSelect(completedRoute.id);
          triggerHapticFeedback('success');
        }

        setCurrentRoute(null);
        setIsDrawing(false);
      }
    },
    [
      isDrawing,
      currentRoute,
      routes,
      onRouteChange,
      onRouteSelect,
      triggerHapticFeedback,
    ]
  );

  // ============================================
  // ROUTE EDITING
  // ============================================

  const handlePointMove = useCallback(
    (pointId: string, newX: number, newY: number) => {
      const updatedRoutes = routes.map(route => ({
        ...route,
        points: route.points.map(point =>
          point.id === pointId ? { ...point, x: newX, y: newY } : point
        ),
      }));
      onRouteChange(updatedRoutes);
    },
    [routes, onRouteChange]
  );

  const handleRouteDelete = useCallback(
    (routeId: string) => {
      const updatedRoutes = routes.filter(route => route.id !== routeId);
      onRouteChange(updatedRoutes);
      triggerHapticFeedback('success');
    },
    [routes, onRouteChange, triggerHapticFeedback]
  );

  const handleRouteColorChange = useCallback(
    (routeId: string, color: string) => {
      const updatedRoutes = routes.map(route =>
        route.id === routeId ? { ...route, color } : route
      );
      onRouteChange(updatedRoutes);
      setShowColorPicker(false);
      triggerHapticFeedback('light');
    },
    [routes, onRouteChange, triggerHapticFeedback]
  );

  const handleRouteTypeChange = useCallback(
    (routeId: string, type: 'run' | 'pass' | 'block') => {
      const updatedRoutes = routes.map(route =>
        route.id === routeId ? { ...route, type } : route
      );
      onRouteChange(updatedRoutes);
      setShowRouteTypeSelector(false);
      triggerHapticFeedback('light');
    },
    [routes, onRouteChange, triggerHapticFeedback]
  );

  // ============================================
  // HAPTIC FEEDBACK
  // ============================================

  const triggerHapticFeedback = useCallback(
    async (type: 'light' | 'medium' | 'success' | 'error') => {
      try {
        switch (type) {
          case 'light':
            await Haptics.impact({ style: 'light' });
            break;
          case 'medium':
            await Haptics.impact({ style: 'medium' });
            break;
          case 'success':
            await Haptics.notification({ type: 'success' });
            break;
          case 'error':
            await Haptics.notification({ type: 'error' });
            break;
        }
      } catch (error) {
        console.warn('Haptic feedback not available:', error);
      }
    },
    []
  );

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // ============================================
  // RENDER
  // ============================================

  const colors = [
    '#007AFF',
    '#34C759',
    '#FF9500',
    '#FF3B30',
    '#AF52DE',
    '#5856D6',
  ];

  return (
    <div
      ref={containerRef}
      className={`mobile-route-editor ${className}`}
      style={{
        position: 'relative',
        width: canvasWidth,
        height: canvasHeight,
        ...style,
      }}
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        style={{
          display: 'block',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      />

      {/* Route Controls */}
      <div
        className="route-controls"
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          display: 'flex',
          gap: 10,
          justifyContent: 'center',
        }}
      >
        <TouchableOpacity
          onPress={() => setShowColorPicker(!showColorPicker)}
          className="control-button"
          style={{
            backgroundColor: '#007AFF',
            color: '#FFFFFF',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
          }}
          hapticFeedback="light"
        >
          Color
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowRouteTypeSelector(!showRouteTypeSelector)}
          className="control-button"
          style={{
            backgroundColor: '#34C759',
            color: '#FFFFFF',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
          }}
          hapticFeedback="light"
        >
          Type
        </TouchableOpacity>

        {selectedRouteId && (
          <TouchableOpacity
            onPress={() => handleRouteDelete(selectedRouteId)}
            className="control-button"
            style={{
              backgroundColor: '#FF3B30',
              color: '#FFFFFF',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
            }}
            hapticFeedback="medium"
          >
            Delete
          </TouchableOpacity>
        )}
      </div>

      {/* Color Picker */}
      {showColorPicker && (
        <div
          className="color-picker"
          style={{
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
          }}
        >
          {colors.map(color => (
            <TouchableOpacity
              key={color}
              onPress={() =>
                selectedRouteId &&
                handleRouteColorChange(selectedRouteId, color)
              }
              className="color-option"
              style={{
                width: '40px',
                height: '40px',
                backgroundColor: color,
                borderRadius: '20px',
                border: '2px solid #FFFFFF',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              }}
              hapticFeedback="light"
            />
          ))}
        </div>
      )}

      {/* Route Type Selector */}
      {showRouteTypeSelector && (
        <div
          className="route-type-selector"
          style={{
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
          }}
        >
          {(['run', 'pass', 'block'] as const).map(type => (
            <TouchableOpacity
              key={type}
              onPress={() =>
                selectedRouteId && handleRouteTypeChange(selectedRouteId, type)
              }
              className="route-type-option"
              style={{
                padding: '12px 16px',
                backgroundColor: '#F8F9FA',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                textTransform: 'capitalize',
                textAlign: 'center',
              }}
              hapticFeedback="light"
            >
              {type}
            </TouchableOpacity>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div
        className="instructions"
        style={{
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
        }}
      >
        {isDrawing ? 'Drawing route...' : 'Tap to start drawing a route'}
      </div>
    </div>
  );
};

// ============================================
// EXPORT
// ============================================

export default MobileRouteEditor;
