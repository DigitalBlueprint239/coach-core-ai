/**
 * RouteEditor.js – Route editing interface
 * - Edit selected route properties
 * - Delete selected route
 * - Apply preset routes to players
 */

import React, { memo, useState } from 'react';
import { Route, Trash2, Edit3, Palette, Save, X } from 'lucide-react';

const PRESET_ROUTES = [
  { id: 'slant', name: 'Slant', points: [{ x: 0, y: 0 }, { x: 30, y: -20 }] },
  { id: 'post', name: 'Post', points: [{ x: 0, y: 0 }, { x: 20, y: -10 }, { x: 40, y: -30 }] },
  { id: 'corner', name: 'Corner', points: [{ x: 0, y: 0 }, { x: 30, y: -10 }, { x: 50, y: -20 }] },
  { id: 'out', name: 'Out', points: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 40, y: 0 }] },
  { id: 'in', name: 'In', points: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 40, y: -20 }] },
  { id: 'hitch', name: 'Hitch', points: [{ x: 0, y: 0 }, { x: 15, y: 0 }, { x: 15, y: -10 }, { x: 0, y: -10 }] },
  { id: 'go', name: 'Go', points: [{ x: 0, y: 0 }, { x: 0, y: -50 }] }
];

const ROUTE_COLORS = [
  { id: '#ef4444', name: 'Red' },
  { id: '#3b82f6', name: 'Blue' },
  { id: '#10b981', name: 'Green' },
  { id: '#f59e0b', name: 'Orange' },
  { id: '#8b5cf6', name: 'Purple' },
  { id: '#ec4899', name: 'Pink' },
  { id: '#f97316', name: 'Amber' },
  { id: '#06b6d4', name: 'Cyan' }
];

const RouteEditor = memo(({
  selectedRoute,
  players,
  onUpdateRoute,
  onDeleteRoute,
  onApplyPreset,
  onClearSelection
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editType, setEditType] = useState('');
  const [editColor, setEditColor] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Initialize edit form when route is selected
  React.useEffect(() => {
    if (selectedRoute) {
      setEditType(selectedRoute.type || 'custom');
      setEditColor(selectedRoute.color || '#ef4444');
      setIsEditing(false);
    }
  }, [selectedRoute]);

  const handleSave = () => {
    if (!selectedRoute) return;
    
    const updates = {};
    if (editType !== selectedRoute.type) {
      updates.type = editType;
    }
    if (editColor !== selectedRoute.color) {
      updates.color = editColor;
    }
    
    if (Object.keys(updates).length > 0) {
      onUpdateRoute(selectedRoute.id, updates);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditType(selectedRoute?.type || 'custom');
    setEditColor(selectedRoute?.color || '#ef4444');
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (selectedRoute && window.confirm('Are you sure you want to delete this route?')) {
      onDeleteRoute(selectedRoute.id);
    }
  };

  const handleApplyPreset = (preset) => {
    if (selectedRoute) {
      onApplyPreset(selectedRoute.id, preset);
    }
  };

  if (!selectedRoute) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="font-semibold text-gray-800 text-sm mb-3">Route Editor</h3>
        <div className="text-center py-8 text-gray-500">
          <Route size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select a route to edit</p>
        </div>
      </div>
    );
  }

  const routePlayer = players.find(p => p.id === selectedRoute.playerId);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="font-semibold text-gray-800 text-sm mb-3">Route Editor</h3>
      
      {/* Route Info */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-4 h-4 rounded"
            style={{ backgroundColor: selectedRoute.color }}
          />
          <span className="text-sm font-medium text-blue-900">
            {selectedRoute.type} Route
          </span>
        </div>
        {routePlayer && (
          <div className="text-xs text-blue-700">
            Player: {routePlayer.position} #{routePlayer.number}
          </div>
        )}
        <div className="text-xs text-blue-700">
          Points: {selectedRoute.points?.length || 0}
        </div>
      </div>

      {/* Edit Form */}
      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Route Type
            </label>
            <select
              value={editType}
              onChange={(e) => setEditType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="custom">Custom</option>
              <option value="slant">Slant</option>
              <option value="post">Post</option>
              <option value="corner">Corner</option>
              <option value="out">Out</option>
              <option value="in">In</option>
              <option value="hitch">Hitch</option>
              <option value="go">Go</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Route Color
            </label>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg border-2 border-gray-300 cursor-pointer"
                style={{ backgroundColor: editColor }}
                onClick={() => setShowColorPicker(!showColorPicker)}
              />
              <span className="text-sm text-gray-600">
                {ROUTE_COLORS.find(c => c.id === editColor)?.name || 'Custom'}
              </span>
            </div>
            
            {showColorPicker && (
              <div className="mt-2 grid grid-cols-4 gap-2">
                {ROUTE_COLORS.map(color => (
                  <button
                    key={color.id}
                    onClick={() => {
                      setEditColor(color.id);
                      setShowColorPicker(false);
                    }}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${
                      editColor === color.id 
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

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save size={14} />
              Save
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-400 transition-colors"
            >
              <X size={14} />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            onClick={() => setIsEditing(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit3 size={14} />
            Edit Route
          </button>
          
          <button
            onClick={handleDelete}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 size={14} />
            Delete Route
          </button>
        </div>
      )}

      {/* Preset Routes */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <h4 className="text-xs font-medium text-gray-700 mb-2">Preset Routes</h4>
        <div className="grid grid-cols-2 gap-2">
          {PRESET_ROUTES.map(preset => (
            <button
              key={preset.id}
              onClick={() => handleApplyPreset(preset)}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              title={preset.name}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

RouteEditor.displayName = 'RouteEditor';

export default RouteEditor; 