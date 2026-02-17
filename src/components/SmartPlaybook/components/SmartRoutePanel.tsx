/**
 * SmartRoutePanel.tsx - Context-aware route recommendations
 *
 * Shows route options sorted by relevance for the selected player's position.
 * Recommended routes are highlighted with a blue accent; all routes remain available.
 * Supports hover preview and click-to-assign.
 */

import React, { memo, useMemo } from 'react';
import { Star, Route } from 'lucide-react';
import { getSmartRouteRecommendations, RecommendedRoute } from '../../../engine/offense/smartRouting';
import { routes as routeDefinitions } from '../../../engine/offense/data.moderate';
import { RouteIcon } from './icons/RouteIcons';

// Preset route point data (matches RouteEditor PRESET_ROUTES)
const PRESET_POINTS: Record<string, Array<{ x: number; y: number }>> = {
  'screen_0': [{ x: 0, y: 0 }, { x: 25, y: 2 }],
  'flat_1': [{ x: 0, y: 0 }, { x: 5, y: -3 }, { x: 30, y: -6 }],
  'slant_2': [{ x: 0, y: 0 }, { x: 0, y: -10 }, { x: -25, y: -25 }],
  'comeback_3': [{ x: 0, y: 0 }, { x: 0, y: -45 }, { x: 12, y: -38 }],
  'curl_4': [{ x: 0, y: 0 }, { x: 0, y: -35 }, { x: 0, y: -30 }],
  'out_5': [{ x: 0, y: 0 }, { x: 0, y: -30 }, { x: 30, y: -30 }],
  'dig_6': [{ x: 0, y: 0 }, { x: 0, y: -35 }, { x: -30, y: -35 }],
  'corner_7': [{ x: 0, y: 0 }, { x: 0, y: -25 }, { x: 25, y: -45 }],
  'post_8': [{ x: 0, y: 0 }, { x: 0, y: -28 }, { x: -20, y: -50 }],
  'go_9': [{ x: 0, y: 0 }, { x: 0, y: -60 }],
  'hitch_5': [{ x: 0, y: 0 }, { x: 0, y: -15 }, { x: 0, y: -12 }],
  'shallow_cross_5': [{ x: 0, y: 0 }, { x: -5, y: -8 }, { x: -40, y: -10 }],
};

interface SmartRoutePanelProps {
  selectedPlayer: any | null;
  onApplyRoute: (routeId: string, presetPoints: Array<{ x: number; y: number }>) => void;
  onPreviewRoute: (routeDef: any) => void;
  onClearPreview: () => void;
}

const SmartRoutePanel: React.FC<SmartRoutePanelProps> = memo(({
  selectedPlayer,
  onApplyRoute,
  onPreviewRoute,
  onClearPreview,
}) => {
  const recommendations = useMemo(() => {
    if (!selectedPlayer) return [];
    return getSmartRouteRecommendations(
      selectedPlayer.position || 'WR',
      selectedPlayer.x || 300,
      selectedPlayer.y || 150,
    );
  }, [selectedPlayer]);

  if (!selectedPlayer) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="font-semibold text-gray-800 text-sm mb-3">Smart Routes</h3>
        <div className="text-center py-6 text-gray-500">
          <Route size={28} className="mx-auto mb-2 opacity-50" />
          <p className="text-xs">Select a player to see route recommendations</p>
        </div>
      </div>
    );
  }

  const recommendedRoutes = recommendations.filter(r => r.recommended);
  const otherRoutes = recommendations.filter(r => !r.recommended);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="font-semibold text-gray-800 text-sm mb-1">Smart Routes</h3>
      <p className="text-xs text-gray-500 mb-3">
        For {selectedPlayer.position} #{selectedPlayer.number}
      </p>

      {/* Recommended Routes */}
      {recommendedRoutes.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1 mb-2">
            <Star size={12} className="text-blue-500" />
            <span className="text-xs font-medium text-blue-700">Recommended</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {recommendedRoutes.map(route => (
              <button
                key={route.route_id}
                onClick={() => {
                  const points = PRESET_POINTS[route.route_id];
                  if (points) onApplyRoute(route.route_id, points);
                }}
                onMouseEnter={() => onPreviewRoute(route)}
                onMouseLeave={onClearPreview}
                className="flex flex-col items-center gap-0.5 p-1.5 rounded text-xs
                  bg-blue-50 border border-blue-200 text-blue-800
                  hover:bg-blue-100 transition-colors"
                title={route.reason}
                aria-label={`Assign ${route.route_name} route - ${route.reason}`}
              >
                <RouteIcon routeId={route.route_id} />
                <span className="font-medium text-[10px]">{route.route_name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Other Routes */}
      {otherRoutes.length > 0 && (
        <div>
          <span className="text-xs font-medium text-gray-500 mb-2 block">All Routes</span>
          <div className="grid grid-cols-4 gap-1.5">
            {otherRoutes.map(route => (
              <button
                key={route.route_id}
                onClick={() => {
                  const points = PRESET_POINTS[route.route_id];
                  if (points) onApplyRoute(route.route_id, points);
                }}
                onMouseEnter={() => onPreviewRoute(route)}
                onMouseLeave={onClearPreview}
                className="flex flex-col items-center gap-0.5 p-1.5 rounded text-xs
                  bg-gray-50 border border-gray-200 text-gray-700
                  hover:bg-gray-100 transition-colors"
                aria-label={`Assign ${route.route_name} route`}
              >
                <RouteIcon routeId={route.route_id} />
                <span className="font-medium text-[10px]">{route.route_name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

SmartRoutePanel.displayName = 'SmartRoutePanel';

export default SmartRoutePanel;
