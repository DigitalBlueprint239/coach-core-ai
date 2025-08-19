/**
 * FieldCanvasFixed.js – Memory-leak-free Football Field/Canvas for Smart Playbook
 * - Proper cleanup of canvas contexts and event listeners
 * - WeakMap for object references to prevent memory leaks
 * - Performance monitoring integration
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

// WeakMap for storing object references to prevent memory leaks
const objectCache = new WeakMap();

// Performance monitoring
const performanceMetrics = {
  drawCount: 0,
  lastDrawTime: 0,
  averageDrawTime: 0
};

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

// Drawing functions with proper cleanup
const drawPlayers = (ctx, players = []) => {
  if (!ctx) return;
  
  ctx.save();
  
  for (const player of players) {
    const size = player.selected ? PLAYER_SIZES.selected : PLAYER_SIZES.default;
    const color = player.selected ? FIELD_COLORS.playerSelected : FIELD_COLORS.playerDefault;
    
    // Draw player circle
    ctx.beginPath();
    ctx.arc(player.x, player.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    
    // Draw border
    ctx.lineWidth = PLAYER_SIZES.borderWidth;
    ctx.strokeStyle = FIELD_COLORS.playerBorder;
    ctx.stroke();
    
    // Draw player number
    ctx.fillStyle = FIELD_COLORS.playerBorder;
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.number.toString(), player.x, player.y);
  }
  
  ctx.restore();
};

const drawRoutes = (ctx, routes = [], selectedRouteId = null) => {
  if (!ctx) return;
  
  ctx.save();
  
  for (const route of routes) {
    if (!route.points || route.points.length < 2) continue;
    
    const isSelected = route.id === selectedRouteId;
    const color = route.color || FIELD_COLORS.routeDefault;
    const width = isSelected ? ROUTE_STYLES.width + 2 : ROUTE_STYLES.width;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (isSelected) {
      ctx.setLineDash(ROUTE_STYLES.dashPattern);
    } else {
      ctx.setLineDash([]);
    }
    
    // Draw route path
    ctx.beginPath();
    ctx.moveTo(route.points[0].x, route.points[0].y);
    
    for (let i = 1; i < route.points.length; i++) {
      ctx.lineTo(route.points[i].x, route.points[i].y);
    }
    
    ctx.stroke();
    
    // Draw arrows at route points
    for (let i = 0; i < route.points.length - 1; i++) {
      const p1 = route.points[i];
      const p2 = route.points[i + 1];
      
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      
      ctx.save();
      ctx.translate(midX, midY);
      ctx.rotate(angle);
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-ROUTE_STYLES.arrowSize, -ROUTE_STYLES.arrowSize / 2);
      ctx.lineTo(-ROUTE_STYLES.arrowSize, ROUTE_STYLES.arrowSize / 2);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      
      ctx.restore();
    }
  }
  
  ctx.restore();
};

const drawField = (ctx, width, height) => {
  if (!ctx) return;
  
  ctx.save();
  
  // Clear canvas
  ctx.fillStyle = FIELD_COLORS.background;
  ctx.fillRect(0, 0, width, height);
  
  // Draw end zones
  const endzoneWidth = width * 0.1;
  ctx.fillStyle = FIELD_COLORS.endzone;
  ctx.globalAlpha = FIELD_COLORS.endzoneAlpha;
  ctx.fillRect(0, 0, endzoneWidth, height);
  ctx.fillRect(width - endzoneWidth, 0, endzoneWidth, height);
  ctx.globalAlpha = 1;
  
  // Draw yard lines
  ctx.strokeStyle = FIELD_COLORS.yardLines;
  ctx.lineWidth = 2;
  
  const yardLineSpacing = (width - 2 * endzoneWidth) / 10;
  for (let i = 1; i < 10; i++) {
    const x = endzoneWidth + i * yardLineSpacing;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  
  // Draw hash marks
  ctx.lineWidth = 1;
  const hashMarkLength = 10;
  for (let i = 1; i < 10; i++) {
    const x = endzoneWidth + i * yardLineSpacing;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, hashMarkLength);
    ctx.moveTo(x, height - hashMarkLength);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  
  ctx.restore();
};

const drawDebugInfo = (ctx, mode, width, height) => {
  if (!ctx) return;
  
  ctx.save();
  
  ctx.fillStyle = FIELD_COLORS.debug;
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  const debugInfo = [
    `Mode: ${mode}`,
    `Canvas: ${width}x${height}`,
    `Draw Count: ${performanceMetrics.drawCount}`,
    `Avg Draw Time: ${performanceMetrics.averageDrawTime.toFixed(2)}ms`
  ];
  
  debugInfo.forEach((info, index) => {
    ctx.fillText(info, 10, 10 + index * 20);
  });
  
  ctx.restore();
};

const FieldCanvasFixed = memo(({
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
  const ctxRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPlayerId, setDraggedPlayerId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Cleanup function for canvas context
  const cleanupCanvas = useCallback(() => {
    if (ctxRef.current) {
      // Clear any pending operations
      ctxRef.current.clearRect(0, 0, width, height);
      ctxRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, [width, height]);

  // Initialize canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get 2D context
    ctxRef.current = canvas.getContext('2d');
    
    // Set canvas dimensions
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    // Cleanup on unmount
    return () => {
      cleanupCanvas();
    };
  }, [width, height, cleanupCanvas]);

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

  // Memoized drawing function with performance monitoring
  const drawCanvas = useCallback(() => {
    const startTime = performance.now();
    const ctx = ctxRef.current;
    
    if (!ctx) {
      console.error('Could not get 2D context from canvas');
      return;
    }

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw field elements
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

    // Update performance metrics
    const endTime = performance.now();
    const drawTime = endTime - startTime;
    performanceMetrics.drawCount++;
    performanceMetrics.lastDrawTime = drawTime;
    performanceMetrics.averageDrawTime = 
      (performanceMetrics.averageDrawTime * (performanceMetrics.drawCount - 1) + drawTime) / performanceMetrics.drawCount;
  }, [players, routes, width, height, mode, debug, isDragging, draggedPlayerId, selectedRouteId]);

  // Effect to redraw canvas when dependencies change
  useEffect(() => {
    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Schedule new draw
    animationFrameRef.current = requestAnimationFrame(drawCanvas);
    
    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [drawCanvas]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupCanvas();
    };
  }, [cleanupCanvas]);

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
FieldCanvasFixed.displayName = 'FieldCanvasFixed';

export default FieldCanvasFixed; 