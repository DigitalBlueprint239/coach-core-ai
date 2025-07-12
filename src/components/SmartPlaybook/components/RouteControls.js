/**
 * RouteControls.js – Route drawing interface
 * - Start route drawing for selected player
 * - Select route type and color
 * - Finish or cancel route drawing
 */

import React, { memo, useState } from 'react';
import { Route, Palette, Play, Square, X } from 'lucide-react';

const ROUTE_TYPES = [
  { id: 'custom', name: 'Custom', description: 'Draw your own route' },
  { id: 'slant', name: 'Slant', description: 'Diagonal route inward' },
  { id: 'post', name: 'Post', description: 'Deep route to middle' },
  { id: 'corner', name: 'Corner', description: 'Deep route to corner' },
  { id: 'out', name: 'Out', description: 'Route toward sideline' },
  { id: 'in', name: 'In', description: 'Route toward middle' },
  { id: 'hitch', name: 'Hitch', description: 'Short route with return' },
  { id: 'go', name: 'Go', description: 'Straight deep route' }
];

const ROUTE_COLORS = [
  { id: '#ef4444', name: 'Red', class: 'bg-red-500' },
  { id: '#3b82f6', name: 'Blue', class: 'bg-blue-500' },
  { id: '#10b981', name: 'Green', class: 'bg-green-500' },
  { id: '#f59e0b', name: 'Orange', class: 'bg-orange-500' },
  { id: '#8b5cf6', name: 'Purple', class: 'bg-purple-500' },
  { id: '#ec4899', name: 'Pink', class: 'bg-pink-500' },
  { id: '#f97316', name: 'Amber', class: 'bg-amber-500' },
  { id: '#06b6d4', name: 'Cyan', class: 'bg-cyan-500' }
];

const RouteControls = memo(({
  selectedPlayer,
  isDrawingRoute,
  routeType,
  routeColor,
  onStartDrawing,
  onFinishDrawing,
  onCancelDrawing,
  onRouteTypeChange,
  onRouteColorChange
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  if (!selectedPlayer) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="font-semibold text-gray-800 text-sm mb-3">Route Controls</h3>
        <div className="text-center py-8 text-gray-500">
          <Route size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select a player to draw routes</p>
        </div>
      </div>
    );
  }

  if (isDrawingRoute) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="font-semibold text-gray-800 text-sm mb-3">Drawing Route</h3>
        
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {selectedPlayer.number || '?'}
            </div>
            <span className="text-sm font-medium text-blue-900">
              {selectedPlayer.position}
            </span>
          </div>
          <p className="text-xs text-blue-700">
            Click on the field to add route points
          </p>
        </div>

        <div className="space-y-2">
          <button
            onClick={onFinishDrawing}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
          >
            <Play size={14} />
            Finish Route
          </button>
          
          <button
            onClick={onCancelDrawing}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-400 transition-colors"
          >
            <X size={14} />
            Cancel Drawing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="font-semibold text-gray-800 text-sm mb-3">Route Controls</h3>
      
      {/* Selected Player Info */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {selectedPlayer.number || '?'}
          </div>
          <span className="text-sm font-medium text-blue-900">
            {selectedPlayer.position}
          </span>
        </div>
        <p className="text-xs text-blue-700">
          Ready to draw routes for this player
        </p>
      </div>

      {/* Route Type Selection */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Route Type
        </label>
        <select
          value={routeType}
          onChange={(e) => onRouteTypeChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {ROUTE_TYPES.map(type => (
            <option key={type.id} value={type.id}>
              {type.name} - {type.description}
            </option>
          ))}
        </select>
      </div>

      {/* Route Color Selection */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Route Color
        </label>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg border-2 border-gray-300 cursor-pointer"
            style={{ backgroundColor: routeColor }}
            onClick={() => setShowColorPicker(!showColorPicker)}
          />
          <span className="text-sm text-gray-600">
            {ROUTE_COLORS.find(c => c.id === routeColor)?.name || 'Custom'}
          </span>
        </div>
        
        {showColorPicker && (
          <div className="mt-2 grid grid-cols-4 gap-2">
            {ROUTE_COLORS.map(color => (
              <button
                key={color.id}
                onClick={() => {
                  onRouteColorChange(color.id);
                  setShowColorPicker(false);
                }}
                className={`w-8 h-8 rounded-lg border-2 transition-all ${
                  routeColor === color.id 
                    ? 'border-gray-800 scale-110' 
                    : 'border-gray-300 hover:border-gray-500'
                }`}
                style={{ backgroundColor: color.id }}
                title={color.name}
              />
            ))}
          </div>
        )}
      </div>

      {/* Start Drawing Button */}
      <button
        onClick={() => onStartDrawing(selectedPlayer.id)}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Route size={14} />
        Start Drawing Route
      </button>

      {/* Instructions */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Click "Start Drawing Route" then click on the field to create route points. 
          Double-click or use "Finish Route" to complete.
        </p>
      </div>
    </div>
  );
});

RouteControls.displayName = 'RouteControls';

export default RouteControls; 