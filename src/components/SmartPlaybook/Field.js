/**
 * Field.js – Stateless Football Field/Canvas for Smart Playbook
 * - Pure functional component: receives all props (players, routes, events)
 * - Does *not* manage its own state (for clarity, testability, and scalability)
 * - Optimized with React.memo and useCallback for performance
 */

import React, { useRef, useEffect, useCallback, memo, useState } from 'react';

// Constants for better maintainability
const FIELD_COLORS = {
  background: '#15803d',
  endzone: '#3b82f6',
  endzoneAlpha: 0.13,
  yardLines: '#fff',
  playerSelected: '#3b82f6',
  playerDefault: '#1e293b',
  playerBorder: '#fff',
  routeDefault: '#ef4444',
  debug: '#f59e42'
};

const PLAYER_SIZES = {
  selected: 20,
  default: 16,
  borderWidth: 3
};

const ROUTE_STYLES = {
  width: 4,
  dashPattern: [5, 6],
  arrowSize: 15
};

const TOUCH_THRESHOLD = 20; // pixels for touch detection

// Utility: Get canvas coordinates from event
const getCanvasCoordinates = (event, canvas) => {
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
};

// Utility: Find player at position
const findPlayerAtPosition = (players, x, y, threshold = 20) => {
  for (const player of players) {
    const distance = Math.sqrt((x - player.x) ** 2 + (y - player.y) ** 2);
    if (distance <= threshold) {
      return player;
    }
  }
  return null;
};

// Utility: Find route at position
const findRouteAtPosition = (routes, x, y, threshold = 10) => {
  for (const route of routes) {
    if (!route.points || route.points.length < 2) continue;
    
    // Check each line segment of the route
    for (let i = 0; i < route.points.length - 1; i++) {
      const p1 = route.points[i];
      const p2 = route.points[i + 1];
      
      // Calculate distance from point to line segment
      const distance = distanceToLineSegment(x, y, p1.x, p1.y, p2.x, p2.y);
      if (distance <= threshold) {
        return route;
      }
    }
  }
  return null;
};

// Utility: Calculate distance from point to line segment
const distanceToLineSegment = (px, py, x1, y1, x2, y2) => {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  
  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
};

// Utility: Draw player circles with error handling
const drawPlayers = (ctx, players = []) => {
  if (!ctx || !Array.isArray(players)) return;
  
  players.forEach(player => {
    try {
      if (!player || typeof player.x !== 'number' || typeof player.y !== 'number') {
        console.warn('Invalid player data:', player);
        return;
      }

      const radius = player.selected ? PLAYER_SIZES.selected : PLAYER_SIZES.default;
      
      // Player circle
      ctx.beginPath();
      ctx.arc(player.x, player.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = player.selected ? FIELD_COLORS.playerSelected : FIELD_COLORS.playerDefault;
      ctx.strokeStyle = FIELD_COLORS.playerBorder;
      ctx.lineWidth = PLAYER_SIZES.borderWidth;
      ctx.fill();
      ctx.stroke();

      // Player text
      ctx.fillStyle = FIELD_COLORS.playerBorder;
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (player.position) {
        ctx.fillText(player.position, player.x, player.y);
      }
      
      if (player.number) {
        ctx.fillText(String(player.number), player.x, player.y - 24);
      }
    } catch (error) {
      console.error('Error drawing player:', error, player);
    }
  });
};

// Utility: Draw routes/arrows with error handling
const drawRoutes = (ctx, routes = [], selectedRouteId = null) => {
  if (!ctx || !Array.isArray(routes)) return;
  
  routes.forEach(route => {
    try {
      if (!route.points || !Array.isArray(route.points) || route.points.length < 2) {
        console.warn('Invalid route data:', route);
        return;
      }

      const isSelected = route.id === selectedRouteId;
      const color = route.color || FIELD_COLORS.routeDefault;
      
      // Route line
      ctx.strokeStyle = color;
      ctx.lineWidth = isSelected ? ROUTE_STYLES.width + 2 : ROUTE_STYLES.width;
      ctx.setLineDash(route.type === 'custom' ? ROUTE_STYLES.dashPattern : []);
      ctx.beginPath();
      ctx.moveTo(route.points[0].x, route.points[0].y);
      
      route.points.slice(1).forEach(point => {
        if (point && typeof point.x === 'number' && typeof point.y === 'number') {
          ctx.lineTo(point.x, point.y);
        }
      });
      
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw selection highlight for selected route
      if (isSelected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw arrowhead at end
      const points = route.points;
      const lastPoint = points[points.length - 1];
      const secondLastPoint = points[points.length - 2];
      
      if (secondLastPoint && lastPoint) {
        const angle = Math.atan2(lastPoint.y - secondLastPoint.y, lastPoint.x - secondLastPoint.x);
        
        ctx.save();
        ctx.translate(lastPoint.x, lastPoint.y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-ROUTE_STYLES.arrowSize, -7);
        ctx.lineTo(-ROUTE_STYLES.arrowSize, 7);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
      }
    } catch (error) {
      console.error('Error drawing route:', error, route);
    }
  });
};

// Utility: Draw field with error handling
const drawField = (ctx, width, height) => {
  if (!ctx || typeof width !== 'number' || typeof height !== 'number') {
    console.error('Invalid canvas context or dimensions');
    return;
  }

  try {
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Field background
    ctx.fillStyle = FIELD_COLORS.background;
    ctx.fillRect(0, 0, width, height);
    
    // Yard lines
    ctx.strokeStyle = FIELD_COLORS.yardLines;
    ctx.lineWidth = 2;
    const yardLineSpacing = width / 10;
    
    for (let x = 0; x <= width; x += yardLineSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Endzones
    ctx.fillStyle = FIELD_COLORS.endzone;
    ctx.globalAlpha = FIELD_COLORS.endzoneAlpha;
    ctx.fillRect(0, 0, width * 0.08, height);
    ctx.fillRect(width * 0.92, 0, width * 0.08, height);
    ctx.globalAlpha = 1;
  } catch (error) {
    console.error('Error drawing field:', error);
  }
};

// Utility: Draw debug information
const drawDebugInfo = (ctx, mode, width, height) => {
  if (!ctx) return;
  
  try {
    ctx.fillStyle = FIELD_COLORS.debug;
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`DEBUG: ${mode || 'unknown'}`, 10, 14);
    ctx.fillText(`Canvas: ${width}x${height}`, 10, 28);
  } catch (error) {
    console.error('Error drawing debug info:', error);
  }
};

const Field = memo(({
  players = [],
  routes = [],
  onCanvasEvent = () => {},
  onPlayerDrag = () => {},
  onRouteSelect = () => {},
  selectedRouteId = null,
  width = 600,
  height = 300,
  mode = 'view',
  debug = false,
  className = '',
  'data-testid': testId = 'smartplaybook-canvas'
}) => {
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPlayerId, setDraggedPlayerId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Memoized event handlers for better performance
  const handleCanvasEvent = useCallback((event) => {
    try {
      onCanvasEvent(event);
    } catch (error) {
      console.error('Error handling canvas event:', error);
    }
  }, [onCanvasEvent]);

  // Enhanced touch and mouse event handling with drag support
  const handleMouseDown = useCallback((event) => {
    event.preventDefault();
    
    const coords = getCanvasCoordinates(event, canvasRef.current);
    if (!coords) return;

    // Check if clicking on a route first
    const clickedRoute = findRouteAtPosition(routes, coords.x, coords.y, 10);
    if (clickedRoute && mode === 'view') {
      onRouteSelect(clickedRoute.id);
      return;
    }

    // Check if clicking on a player for dragging
    const clickedPlayer = findPlayerAtPosition(players, coords.x, coords.y, TOUCH_THRESHOLD);
    
    if (clickedPlayer && mode === 'view') {
      // Start dragging
      setIsDragging(true);
      setDraggedPlayerId(clickedPlayer.id);
      setDragOffset({
        x: coords.x - clickedPlayer.x,
        y: coords.y - clickedPlayer.y
      });
    } else {
      // Normal canvas event
      handleCanvasEvent(event);
    }
  }, [handleCanvasEvent, players, routes, mode, onRouteSelect]);

  const handleTouchStart = useCallback((event) => {
    event.preventDefault();
    
    const coords = getCanvasCoordinates(event, canvasRef.current);
    if (!coords) return;

    // Check if touching a route first
    const touchedRoute = findRouteAtPosition(routes, coords.x, coords.y, 10);
    if (touchedRoute && mode === 'view') {
      onRouteSelect(touchedRoute.id);
      return;
    }

    // Check if touching a player for dragging
    const touchedPlayer = findPlayerAtPosition(players, coords.x, coords.y, TOUCH_THRESHOLD);
    
    if (touchedPlayer && mode === 'view') {
      // Start dragging
      setIsDragging(true);
      setDraggedPlayerId(touchedPlayer.id);
      setDragOffset({
        x: coords.x - touchedPlayer.x,
        y: coords.y - touchedPlayer.y
      });
    } else {
      // Normal canvas event
      handleCanvasEvent(event);
    }
  }, [handleCanvasEvent, players, routes, mode, onRouteSelect]);

  const handleDoubleClick = useCallback((event) => {
    event.preventDefault();
    // Trigger finish route drawing on double click
    if (mode === 'route') {
      const customEvent = { ...event, type: 'finishRoute' };
      handleCanvasEvent(customEvent);
    }
  }, [handleCanvasEvent, mode]);

  // Drag event handlers
  const handleMouseMove = useCallback((event) => {
    if (!isDragging || !draggedPlayerId) return;
    
    event.preventDefault();
    const coords = getCanvasCoordinates(event, canvasRef.current);
    if (!coords) return;

    const newX = coords.x - dragOffset.x;
    const newY = coords.y - dragOffset.y;
    
    // Call parent drag handler
    onPlayerDrag(draggedPlayerId, newX, newY);
  }, [isDragging, draggedPlayerId, dragOffset, onPlayerDrag]);

  const handleTouchMove = useCallback((event) => {
    if (!isDragging || !draggedPlayerId) return;
    
    event.preventDefault();
    const coords = getCanvasCoordinates(event, canvasRef.current);
    if (!coords) return;

    const newX = coords.x - dragOffset.x;
    const newY = coords.y - dragOffset.y;
    
    // Call parent drag handler
    onPlayerDrag(draggedPlayerId, newX, newY);
  }, [isDragging, draggedPlayerId, dragOffset, onPlayerDrag]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDraggedPlayerId(null);
      setDragOffset({ x: 0, y: 0 });
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDraggedPlayerId(null);
      setDragOffset({ x: 0, y: 0 });
    }
  }, [isDragging]);

  // Memoized drawing function
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get 2D context from canvas');
      return;
    }

    // Set canvas dimensions to match props
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    drawField(ctx, width, height);
    drawRoutes(ctx, routes, selectedRouteId);
    drawPlayers(ctx, players);
    
    // Draw dragging feedback
    if (isDragging && draggedPlayerId) {
      const draggedPlayer = players.find(p => p.id === draggedPlayerId);
      if (draggedPlayer) {
        // Draw shadow/ghost of dragged player
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(draggedPlayer.x, draggedPlayer.y, PLAYER_SIZES.selected + 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.restore();
      }
    }
    
    if (debug) {
      drawDebugInfo(ctx, mode, width, height);
    }
  }, [players, routes, width, height, mode, debug, isDragging, draggedPlayerId, selectedRouteId]);

  // Effect to redraw canvas when dependencies change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Canvas styles with better accessibility and responsive design
  const canvasStyle = {
    width: '100%',
    maxWidth: width,
    height: 'auto',
    aspectRatio: `${width}/${height}`,
    borderRadius: 20,
    background: '#14532d',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
    outline: debug ? `2px solid ${FIELD_COLORS.debug}` : 'none',
    cursor: mode === 'route' ? 'crosshair' : 'pointer',
    display: 'block',
    ...(className && { className })
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      tabIndex={0}
      style={{
        ...canvasStyle,
        cursor: isDragging ? 'grabbing' : (mode === 'route' ? 'crosshair' : 'pointer')
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleCanvasEvent}
      role="img"
      aria-label={`Football field canvas in ${mode} mode`}
      data-testid={testId}
    />
  );
});

// Add display name for better debugging
Field.displayName = 'Field';

export default Field;
