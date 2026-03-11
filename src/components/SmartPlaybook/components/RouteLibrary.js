/**
 * RouteLibrary.js – Route selection grid with SVG micro-icons and ghost preview
 *
 * Features:
 * - Icon grid showing all available route types
 * - Ghost preview tooltip on hover (Task 2)
 * - Route selection triggers callback to parent
 */

import React, { useState, memo } from 'react';
import { getRouteIcon } from './RouteIcons';

const ROUTES = [
  { id: 'hitch',  name: 'Hitch',  description: 'Short curl toward LOS' },
  { id: 'slant',  name: 'Slant',  description: 'Diagonal inside break' },
  { id: 'post',   name: 'Post',   description: 'Deep inside break' },
  { id: 'corner', name: 'Corner', description: 'Deep outside break' },
  { id: 'out',    name: 'Out',    description: 'Flat break to sideline' },
  { id: 'in',     name: 'In',     description: 'Flat inside break' },
  { id: 'go',     name: 'Go',     description: 'Straight deep route' },
  { id: 'custom', name: 'Custom', description: 'Draw your own route' },
];

/**
 * Ghost preview tooltip shown on route button hover.
 * Renders a brief route description and a larger icon.
 */
const GhostPreview = memo(({ route }) => {
  if (!route) return null;
  const Icon = getRouteIcon(route.id);
  return (
    <div
      className="absolute z-50 left-full top-0 ml-2 bg-gray-900 text-white rounded-lg shadow-xl p-3 w-44 pointer-events-none"
      role="tooltip"
      aria-label={`Preview: ${route.name}`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="text-yellow-300 flex-shrink-0">
          <Icon size={36} />
        </div>
        <div>
          <div className="font-bold text-sm">{route.name}</div>
          <div className="text-xs text-gray-300">{route.description}</div>
        </div>
      </div>
      <p className="text-xs text-gray-400 italic">Hover preview — click to select</p>
    </div>
  );
});

GhostPreview.displayName = 'GhostPreview';

/**
 * A single route button with icon + label.
 */
const RouteButton = memo(({ route, isSelected, onSelect, onHoverEnter, onHoverLeave }) => {
  const Icon = getRouteIcon(route.id);
  return (
    <button
      onClick={() => onSelect(route.id)}
      onMouseEnter={() => onHoverEnter(route)}
      onMouseLeave={onHoverLeave}
      className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all duration-150 ${
        isSelected
          ? 'border-blue-500 bg-blue-50 text-blue-700'
          : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600'
      }`}
      title={route.description}
      aria-label={`${route.name} route`}
      aria-pressed={isSelected}
    >
      <Icon size={24} />
      <span className="text-xs font-medium leading-tight">{route.name}</span>
    </button>
  );
});

RouteButton.displayName = 'RouteButton';

/**
 * RouteLibrary – grid of route buttons with icon + ghost preview.
 *
 * @param {{ selectedRouteType: string, onRouteTypeChange: (type: string) => void }} props
 */
const RouteLibrary = memo(({ selectedRouteType = 'custom', onRouteTypeChange }) => {
  const [previewRoute, setPreviewRoute] = useState(null);

  const handleHoverEnter = (route) => {
    setPreviewRoute(route);
  };

  const handleHoverLeave = () => {
    setPreviewRoute(null);
  };

  return (
    <div className="relative">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Route Type
      </h4>

      <div className="relative grid grid-cols-4 gap-1">
        {ROUTES.map(route => (
          <RouteButton
            key={route.id}
            route={route}
            isSelected={selectedRouteType === route.id}
            onSelect={onRouteTypeChange}
            onHoverEnter={handleHoverEnter}
            onHoverLeave={handleHoverLeave}
          />
        ))}

        {/* Ghost preview tooltip anchored to the grid */}
        {previewRoute && <GhostPreview route={previewRoute} />}
      </div>
    </div>
  );
});

RouteLibrary.displayName = 'RouteLibrary';

export { ROUTES };
export default RouteLibrary;
