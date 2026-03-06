import React, { useMemo } from 'react';
import { loadOffensiveEngineData } from '../../../engine/offense';
import type { EngineRoute } from '../../../engine/offense';

interface Player {
  id: string;
  x: number;
  y: number;
  position: string;
  number?: number;
}

interface Route {
  id: string;
  playerId: string;
  points: Array<{ x: number; y: number }>;
  type: string;
  color: string;
  label?: string;
}

interface RouteLibraryProps {
  selectedPlayer: Player | null | undefined;
  onAssignRoute: (route: Route) => void;
}

// Field coordinate constants (matching FieldCanvas/SmartPlaybook)
// Field: 600px wide × 300px tall
const FIELD_CENTER_X = 300;
const YARDS_TO_PX_V = 8; // 1 yard ≈ 8px vertically
const YARDS_TO_PX_H = 10; // 1 yard ≈ 10px horizontally for horizontal breaks

function buildWaypoints(
  player: Player,
  route: EngineRoute
): Array<{ x: number; y: number }> {
  const sx = player.x;
  const sy = player.y;
  const depthPx = route.depth_yards * YARDS_TO_PX_V;
  const isLeftSide = sx < FIELD_CENTER_X;

  let endX = sx;
  const endY = sy - depthPx; // routes go upfield (lower y = toward opponent endzone)

  switch (route.break_direction) {
    case 'inside':
      // toward field center
      endX = isLeftSide ? sx + depthPx * 0.7 : sx - depthPx * 0.7;
      break;
    case 'outside':
      // away from field center
      endX = isLeftSide ? sx - depthPx * 0.4 : sx + depthPx * 0.4;
      break;
    case 'diagonal-in': // Post
      endX = isLeftSide ? sx + depthPx * 0.6 : sx - depthPx * 0.6;
      break;
    case 'diagonal-out': // Corner
      endX = isLeftSide ? sx - depthPx * 0.5 : sx + depthPx * 0.5;
      break;
    case 'stop':
    case 'vertical':
    default:
      endX = sx; // straight up
      break;
  }

  // For routes with a stem + break, add an intermediate point
  if (['outside', 'inside', 'diagonal-in', 'diagonal-out'].includes(route.break_direction)) {
    const stemPx = Math.max(depthPx * 0.6, depthPx - 2 * YARDS_TO_PX_V);
    return [
      { x: sx, y: sy },
      { x: sx, y: sy - stemPx }, // stem straight up
      { x: endX, y: endY }, // break point
    ];
  }

  return [
    { x: sx, y: sy },
    { x: endX, y: endY },
  ];
}

const ROUTE_COLOR = '#ef4444'; // red — matches default route color

const GROUPS = [
  { label: 'Quick', numbers: [0, 1, 2] },
  { label: 'Intermediate', numbers: [3, 4, 5, 6] },
  { label: 'Deep', numbers: [7, 8, 9] },
  { label: 'Specialty', numbers: [-1] },
] as const;

const RouteLibrary: React.FC<RouteLibraryProps> = ({ selectedPlayer, onAssignRoute }) => {
  const engineRoutes = useMemo(() => loadOffensiveEngineData().routes, []);

  if (!selectedPlayer) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="font-semibold text-gray-800 text-sm mb-2">Route Library</h3>
        <p className="text-xs text-gray-500 text-center py-4">
          Select a player to assign routes
        </p>
      </div>
    );
  }

  const handleClick = (engineRoute: EngineRoute) => {
    const points = buildWaypoints(selectedPlayer, engineRoute);
    const newRoute: Route = {
      id: `route-${selectedPlayer.id}-${Date.now()}`,
      playerId: selectedPlayer.id,
      points,
      type: engineRoute.route_name.toLowerCase().replace(/\s+/g, '-'),
      color: ROUTE_COLOR,
      label: engineRoute.route_name,
    };
    onAssignRoute(newRoute);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="font-semibold text-gray-800 text-sm mb-3">
        Route Library
        <span className="ml-2 text-xs font-normal text-gray-500">
          #{selectedPlayer.number ?? '?'} {selectedPlayer.position}
        </span>
      </h3>

      <div className="space-y-3">
        {GROUPS.map(group => {
          const groupRoutes = engineRoutes.filter(r =>
            group.numbers.includes(r.route_number as never)
          );
          if (groupRoutes.length === 0) return null;

          return (
            <div key={group.label}>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                {group.label}
              </p>
              <div className="grid grid-cols-3 gap-1">
                {groupRoutes.map(r => (
                  <button
                    key={r.route_id}
                    onClick={() => handleClick(r)}
                    title={r.description}
                    className="px-1.5 py-1 text-xs rounded border border-gray-200 bg-gray-50
                               text-gray-700 hover:bg-blue-600 hover:text-white hover:border-blue-600
                               transition-colors truncate"
                  >
                    {r.route_name}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 pt-3 border-t border-gray-100 text-[10px] text-gray-400">
        Clicking a route replaces existing routes for this player
      </p>
    </div>
  );
};

export default RouteLibrary;
