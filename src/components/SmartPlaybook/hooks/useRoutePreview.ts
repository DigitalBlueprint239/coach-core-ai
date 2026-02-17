/**
 * useRoutePreview.ts - Manages route hover preview state and point generation
 *
 * When a coach hovers over a route button, this generates a ghost route path
 * from the selected player's position using the route definition's depth,
 * break direction, and stem.
 *
 * COORDINATE SYSTEM (matching existing Field.js):
 * - x: 0 = left edge, 600 = right edge, 300 = center
 * - y: 0 = top of field, 300 = bottom
 * - Routes go "upfield" which means DECREASING y (toward top of canvas)
 *
 * MIRRORING: Routes that break "inside" go toward center (x→300).
 * Routes that break "outside" go toward the nearest sideline.
 * For players on the left side (x < 300), outside = left (negative x).
 * For players on the right side (x > 300), outside = right (positive x).
 */

import { useState, useCallback, useMemo } from 'react';

// Approximate pixels per yard on the 600x300 canvas
const PX_PER_YARD_X = 6;   // 600px / ~100 yards
const PX_PER_YARD_Y = 5.6; // 300px / ~53 yards

export interface PreviewRouteData {
  points: Array<{ x: number; y: number }>;
  routeName: string;
}

export interface RouteDefForPreview {
  route_id: string;
  route_name: string;
  depth_yards: number;
  break_direction: 'inside' | 'outside' | 'vertical' | 'stop';
  stem: string;
}

interface PlayerPosition {
  x: number;
  y: number;
}

/**
 * Generates canvas-space preview points from a route definition and player position.
 * Returns an array of {x, y} points that can be drawn as a dashed line on the canvas.
 */
export function generatePreviewPoints(
  route: RouteDefForPreview,
  playerPos: PlayerPosition,
  fieldCenterX: number = 300,
): Array<{ x: number; y: number }> {
  const isLeftSide = playerPos.x < fieldCenterX;
  // flipX: +1 for right-side players (outside = right), -1 for left-side (outside = left)
  const flipX = isLeftSide ? -1 : 1;

  const depthPx = route.depth_yards * PX_PER_YARD_Y;
  const breakWidthPx = 5 * PX_PER_YARD_X; // 5-yard lateral break

  const points: Array<{ x: number; y: number }> = [];

  // Start at player position
  points.push({ x: playerPos.x, y: playerPos.y });

  switch (route.break_direction) {
    case 'inside': {
      // Vertical stem to ~70% depth, then break inside (toward center)
      const stemEndY = playerPos.y - depthPx * 0.7;
      points.push({ x: playerPos.x, y: stemEndY });
      // Break toward center
      const breakX = playerPos.x - breakWidthPx * flipX;
      points.push({ x: breakX, y: playerPos.y - depthPx });
      break;
    }
    case 'outside': {
      // Vertical stem to ~70% depth, then break outside (toward sideline)
      const stemEndY = playerPos.y - depthPx * 0.7;
      points.push({ x: playerPos.x, y: stemEndY });
      // Break toward sideline
      const breakX = playerPos.x + breakWidthPx * flipX;
      points.push({ x: breakX, y: playerPos.y - depthPx });
      break;
    }
    case 'vertical': {
      // Straight vertical
      points.push({ x: playerPos.x, y: playerPos.y - depthPx });
      break;
    }
    case 'stop': {
      // Go to depth, then come back slightly (curl/hitch)
      points.push({ x: playerPos.x, y: playerPos.y - depthPx });
      points.push({ x: playerPos.x, y: playerPos.y - depthPx + PX_PER_YARD_Y * 1.5 });
      break;
    }
    default: {
      // Fallback: vertical
      points.push({ x: playerPos.x, y: playerPos.y - depthPx });
      break;
    }
  }

  // Handle special stem types
  if (route.stem === 'lateral_release' || route.stem === 'lateral_cross') {
    // Screen / shallow cross: mostly lateral movement
    const lateralDir = route.break_direction === 'inside' ? -flipX : flipX;
    const points2: Array<{ x: number; y: number }> = [
      { x: playerPos.x, y: playerPos.y },
    ];
    if (route.stem === 'lateral_cross') {
      // Cross: slight upfield then lateral across
      points2.push({ x: playerPos.x - 5 * flipX, y: playerPos.y - depthPx * 0.5 });
      points2.push({ x: playerPos.x - 40 * flipX, y: playerPos.y - depthPx });
    } else {
      // Screen: lateral release
      points2.push({ x: playerPos.x + 25 * lateralDir, y: playerPos.y + 2 });
    }
    return points2;
  }

  // Handle immediate_outside stem (flat route)
  if (route.stem === 'immediate_outside') {
    return [
      { x: playerPos.x, y: playerPos.y },
      { x: playerPos.x + 5 * flipX, y: playerPos.y - depthPx * 0.3 },
      { x: playerPos.x + breakWidthPx * flipX, y: playerPos.y - depthPx },
    ];
  }

  return points;
}

/**
 * Hook for managing route hover preview state.
 */
export function useRoutePreview() {
  const [previewRoute, setPreviewRoute] = useState<RouteDefForPreview | null>(null);
  const [previewPlayerId, setPreviewPlayerId] = useState<string | null>(null);

  const setPreview = useCallback((route: RouteDefForPreview | null, playerId: string | null) => {
    setPreviewRoute(route);
    setPreviewPlayerId(playerId);
  }, []);

  const clearPreview = useCallback(() => {
    setPreviewRoute(null);
    setPreviewPlayerId(null);
  }, []);

  return {
    previewRoute,
    previewPlayerId,
    setPreview,
    clearPreview,
  };
}
