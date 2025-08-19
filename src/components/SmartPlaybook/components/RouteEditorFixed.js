/**
 * RouteEditorFixed.js – Memory-leak-free Route editing interface
 * - Proper cleanup of event listeners and state
 * - WeakMap for object references to prevent memory leaks
 * - Performance monitoring integration
 * - Enhanced error handling and cleanup
 */

import React, { memo, useState, useEffect, useCallback, useRef } from 'react';
import { Route, Trash2, Edit3, Palette, Save, X } from 'lucide-react';

// Use WeakMap for storing preset routes to prevent memory leaks
const PRESET_ROUTES = new WeakMap();
const ROUTE_COLORS = new WeakMap();

// Initialize preset routes only once
const initializePresetRoutes = () => {
  if (!PRESET_ROUTES.has(window)) {
    const routes = [
      { id: 'slant', name: 'Slant', points: [{ x: 0, y: 0 }, { x: 30, y: -20 }] },
      { id: 'post', name: 'Post', points: [{ x: 0, y: 0 }, { x: 20, y: -10 }, { x: 40, y: -30 }] },
      { id: 'corner', name: 'Corner', points: [{ x: 0, y: 0 }, { x: 30, y: -10 }, { x: 50, y: -20 }] },
      { id: 'out', name: 'Out', points: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 40, y: 0 }] },
      { id: 'in', name: 'In', points: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 40, y: -20 }] },
      { id: 'hitch', name: 'Hitch', points: [{ x: 0, y: 0 }, { x: 15, y: 0 }, { x: 15, y: -10 }, { x: 0, y: -10 }] },
      { id: 'go', name: 'Go', points: [{ x: 0, y: 0 }, { x: 0, y: -50 }] }
    ];
    PRESET_ROUTES.set(window, routes);
  }
  return PRESET_ROUTES.get(window);
};

// Initialize route colors only once
const initializeRouteColors = () => {
  if (!ROUTE_COLORS.has(window)) {
    const colors = [
      { id: '#ef4444', name: 'Red' },
      { id: '#3b82f6', name: 'Blue' },
      { id: '#10b981', name: 'Green' },
      { id: '#f59e0b', name: 'Orange' },
      { id: '#8b5cf6', name: 'Purple' },
      { id: '#ec4899', name: 'Pink' },
      { id: '#f97316', name: 'Amber' },
      { id: '#06b6d4', name: 'Cyan' }
    ];
    ROUTE_COLORS.set(window, colors);
  }
  return ROUTE_COLORS.get(window);
};

// Performance monitoring
const performanceMetrics = {
  renderCount: 0,
  lastRenderTime: 0,
  averageRenderTime: 0
};

const RouteEditorFixed = memo(({
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
  
  // Refs for cleanup
  const colorPickerRef = useRef(null);
  const formRef = useRef(null);
  const cleanupRef = useRef(new Set());

  // Initialize data
  const presetRoutes = initializePresetRoutes();
  const routeColors = initializeRouteColors();

  // Initialize edit form when route is selected
  useEffect(() => {
    if (selectedRoute) {
      setEditType(selectedRoute.type || 'custom');
      setEditColor(selectedRoute.color || '#ef4444');
      setIsEditing(false);
    }
  }, [selectedRoute]);

  // Cleanup function for event listeners and resources
  const cleanup = useCallback(() => {
    cleanupRef.current.forEach(cleanupFn => {
      try {
        cleanupFn();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    });
    cleanupRef.current.clear();
  }, []);

  // Add cleanup function to registry
  const addCleanup = useCallback((cleanupFn) => {
    cleanupRef.current.add(cleanupFn);
  }, []);

  // Handle color picker click outside
  useEffect(() => {
    if (!showColorPicker) return;

    const handleClickOutside = (event) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
        setShowColorPicker(false);
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    // Add cleanup function
    addCleanup(() => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showColorPicker, addCleanup]);

  // Handle form submission
  useEffect(() => {
    if (!formRef.current) return;

    const handleFormSubmit = (event) => {
      event.preventDefault();
      handleSave();
    };

    const form = formRef.current;
    form.addEventListener('submit', handleFormSubmit);
    
    addCleanup(() => {
      form.removeEventListener('submit', handleFormSubmit);
    });

    return () => {
      form.removeEventListener('submit', handleFormSubmit);
    };
  }, [addCleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const handleSave = useCallback(() => {
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
  }, [selectedRoute, editType, editColor, onUpdateRoute]);

  const handleCancel = useCallback(() => {
    setEditType(selectedRoute?.type || 'custom');
    setEditColor(selectedRoute?.color || '#ef4444');
    setIsEditing(false);
  }, [selectedRoute]);

  const handleDelete = useCallback(() => {
    if (selectedRoute && window.confirm('Are you sure you want to delete this route?')) {
      onDeleteRoute(selectedRoute.id);
    }
  }, [selectedRoute, onDeleteRoute]);

  const handleApplyPreset = useCallback((preset) => {
    if (selectedRoute) {
      onApplyPreset(selectedRoute.id, preset);
    }
  }, [selectedRoute, onApplyPreset]);

  const handleColorSelect = useCallback((colorId) => {
    setEditColor(colorId);
    setShowColorPicker(false);
  }, []);

  const handleEditToggle = useCallback(() => {
    setIsEditing(prev => !prev);
  }, []);

  // Performance monitoring
  const renderStartTime = performance.now();
  performanceMetrics.renderCount++;
  performanceMetrics.lastRenderTime = renderStartTime;

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

  // Update performance metrics
  const renderEndTime = performance.now();
  const renderTime = renderEndTime - renderStartTime;
  performanceMetrics.averageRenderTime = 
    (performanceMetrics.averageRenderTime * (performanceMetrics.renderCount - 1) + renderTime) / performanceMetrics.renderCount;

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
        <form ref={formRef} className="space-y-3">
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
                {routeColors.find(c => c.id === editColor)?.name || 'Custom'}
              </span>
            </div>
            
            {showColorPicker && (
              <div ref={colorPickerRef} className="mt-2 grid grid-cols-4 gap-2">
                {routeColors.map(color => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => handleColorSelect(color.id)}
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
              type="submit"
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save size={14} />
              Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-400 transition-colors"
            >
              <X size={14} />
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleEditToggle}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit3 size={14} />
            Edit Route
          </button>
          
          <button
            type="button"
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
          {presetRoutes.map(preset => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              title={preset.name}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Performance Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 text-xs text-gray-400">
          Renders: {performanceMetrics.renderCount} | 
          Avg Time: {performanceMetrics.averageRenderTime.toFixed(2)}ms
        </div>
      )}
    </div>
  );
});

RouteEditorFixed.displayName = 'RouteEditorFixed';

export default RouteEditorFixed; 