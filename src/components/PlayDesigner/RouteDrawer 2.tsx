import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Line, Arrow, Group } from 'react-konva';
import Konva from 'konva';
import { useBreakpointValue } from '@chakra-ui/react';

interface RouteDrawerProps {
  stage: any;
  player: any;
  onRouteComplete?: (route: any) => void;
  theme?: 'coach-core-default' | 'coach-core-dark' | 'coach-core-light';
  mobileOptimized?: boolean;
}

interface RoutePoint {
  x: number;
  y: number;
  timestamp: number;
}

interface Route {
  id: string;
  playerId: string;
  points: RoutePoint[];
  type: 'run' | 'pass' | 'block' | 'custom';
  color: string;
  strokeWidth: number;
  dash: number[];
  tension: number;
  arrow: boolean;
}

export const RouteDrawer: React.FC<RouteDrawerProps> = ({
  stage,
  player,
  onRouteComplete,
  theme = 'coach-core-default',
  mobileOptimized = false,
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [drawingPoints, setDrawingPoints] = useState<RoutePoint[]>([]);
  const [routeType, setRouteType] = useState<
    'run' | 'pass' | 'block' | 'custom'
  >('run');

  const routeRef = useRef<any>(null);
  const arrowRef = useRef<any>(null);

  const spacing = useBreakpointValue({ base: 2, md: 3, lg: 4 });
  const strokeWidth = useBreakpointValue({ base: 2, md: 3, lg: 4 });

  // Route type configurations
  const routeConfigs = {
    run: {
      color: '#ffcc00',
      strokeWidth: strokeWidth || 3,
      dash: [0, 0],
      tension: 0.5,
      arrow: true,
    },
    pass: {
      color: '#00ccff',
      strokeWidth: strokeWidth || 3,
      dash: [10, 5],
      tension: 0.3,
      arrow: true,
    },
    block: {
      color: '#ff6600',
      strokeWidth: strokeWidth || 4,
      dash: [5, 5],
      tension: 0.2,
      arrow: false,
    },
    custom: {
      color: '#cc66ff',
      strokeWidth: strokeWidth || 3,
      dash: [15, 5, 5, 5],
      tension: 0.4,
      arrow: true,
    },
  };

  const currentConfig = routeConfigs[routeType];

  // Start drawing route
  const startDrawing = useCallback(
    (e: any) => {
      if (!stage || !player) return;

      setIsDrawing(true);
      const pos = stage.getPointerPosition();

      const newRoute: Route = {
        id: `route-${Date.now()}`,
        playerId: player.id,
        points: [{ x: pos.x, y: pos.y, timestamp: Date.now() }],
        type: routeType,
        color: currentConfig.color,
        strokeWidth: currentConfig.strokeWidth,
        dash: currentConfig.dash,
        tension: currentConfig.tension,
        arrow: currentConfig.arrow,
      };

      setCurrentRoute(newRoute);
      setDrawingPoints([{ x: pos.x, y: pos.y, timestamp: Date.now() }]);
    },
    [stage, player, routeType, currentConfig]
  );

  // Continue drawing route
  const continueDrawing = useCallback(
    (e: any) => {
      if (!isDrawing || !currentRoute) return;

      const pos = stage.getPointerPosition();
      const newPoint: RoutePoint = {
        x: pos.x,
        y: pos.y,
        timestamp: Date.now(),
      };

      setDrawingPoints(prev => [...prev, newPoint]);
      setCurrentRoute(prev =>
        prev
          ? {
              ...prev,
              points: [...prev.points, newPoint],
            }
          : null
      );
    },
    [isDrawing, currentRoute, stage]
  );

  // Finish drawing route
  const finishDrawing = useCallback(() => {
    if (!isDrawing || !currentRoute || drawingPoints.length < 2) return;

    setIsDrawing(false);

    // Create final route
    const finalRoute: Route = {
      ...currentRoute,
      points: drawingPoints,
    };

    if (onRouteComplete) {
      onRouteComplete(finalRoute);
    }

    // Reset state
    setCurrentRoute(null);
    setDrawingPoints([]);
  }, [isDrawing, currentRoute, drawingPoints, onRouteComplete]);

  // Handle mouse events
  useEffect(() => {
    if (!stage) return;

    const handleMouseDown = (e: any) => {
      if (e.target === stage) {
        startDrawing(e);
      }
    };

    const handleMouseMove = (e: any) => {
      continueDrawing(e);
    };

    const handleMouseUp = () => {
      finishDrawing();
    };

    // Handle touch events for mobile
    const handleTouchStart = (e: any) => {
      e.evt.preventDefault();
      if (e.target === stage) {
        startDrawing(e);
      }
    };

    const handleTouchMove = (e: any) => {
      e.evt.preventDefault();
      continueDrawing(e);
    };

    const handleTouchEnd = () => {
      finishDrawing();
    };

    // Add event listeners
    stage.on('mousedown', handleMouseDown);
    stage.on('mousemove', handleMouseMove);
    stage.on('mouseup', handleMouseUp);
    stage.on('touchstart', handleTouchStart);
    stage.on('touchmove', handleTouchMove);
    stage.on('touchend', handleTouchEnd);

    return () => {
      stage.off('mousedown', handleMouseDown);
      stage.off('mousemove', handleMouseMove);
      stage.off('mouseup', handleMouseUp);
      stage.off('touchstart', handleTouchStart);
      stage.off('touchmove', handleTouchMove);
      stage.off('touchend', handleTouchEnd);
    };
  }, [stage, startDrawing, continueDrawing, finishDrawing]);

  // Convert points to flat array for Konva Line
  const getLinePoints = useCallback((points: RoutePoint[]) => {
    return points.reduce(
      (acc: number[], point) => [...acc, point.x, point.y],
      []
    );
  }, []);

  // Render current drawing route
  const renderCurrentRoute = () => {
    if (!isDrawing || drawingPoints.length < 2) return null;

    const points = getLinePoints(drawingPoints);

    return (
      <Group>
        <Line
          ref={routeRef}
          points={points}
          stroke={currentConfig.color}
          strokeWidth={currentConfig.strokeWidth}
          lineCap="round"
          lineJoin="round"
          tension={currentConfig.tension}
          dash={currentConfig.dash}
          opacity={0.8}
        />

        {/* Arrow at the end if enabled */}
        {currentConfig.arrow && points.length >= 4 && (
          <Arrow
            ref={arrowRef}
            points={points.slice(-4)}
            pointerLength={10}
            pointerWidth={10}
            fill={currentConfig.color}
            stroke={currentConfig.color}
            strokeWidth={currentConfig.strokeWidth}
            opacity={0.8}
          />
        )}
      </Group>
    );
  };

  // Route type selector
  const renderRouteTypeSelector = () => {
    if (mobileOptimized) return null; // Hide on mobile to save space

    return (
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '8px',
          borderRadius: '8px',
          border: '1px solid #ddd',
        }}
      >
        <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
          Route Type:
        </div>
        {Object.keys(routeConfigs).map(type => (
          <button
            key={type}
            onClick={() => setRouteType(type as any)}
            style={{
              margin: '2px',
              padding: '4px 8px',
              border: `2px solid ${routeType === type ? routeConfigs[type as keyof typeof routeConfigs].color : '#ccc'}`,
              borderRadius: '4px',
              background:
                routeType === type
                  ? routeConfigs[type as keyof typeof routeConfigs].color
                  : 'white',
              color: routeType === type ? 'white' : '#333',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>
    );
  };

  return (
    <>
      {renderRouteTypeSelector()}
      {renderCurrentRoute()}
    </>
  );
};

export default RouteDrawer;
