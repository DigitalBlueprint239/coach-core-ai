/**
 * Toolbar.js – Main toolbar for Smart Playbook
 * - Mode switching (view, player, route, delete)
 * - Undo/Redo controls
 * - Clear field action
 */

import React, { memo } from 'react';
import { 
  Eye, 
  UserPlus, 
  Route, 
  Trash2, 
  RotateCcw, 
  RotateCw, 
  Trash,
  MousePointer,
  HelpCircle
} from 'lucide-react';

const TOOLBAR_MODES = [
  { id: 'view', label: 'View', icon: Eye, description: 'Select and view players' },
  { id: 'player', label: 'Add Player', icon: UserPlus, description: 'Add new players to field' },
  { id: 'route', label: 'Draw Route', icon: Route, description: 'Draw routes for players' },
  { id: 'delete', label: 'Delete', icon: Trash2, description: 'Delete players and routes' }
];

const Toolbar = memo(({
  mode = 'view',
  onModeChange,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  undoStack = [],
  onClear,
  onShowHelp
}) => {
  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'z' && !event.shiftKey && canUndo) {
          event.preventDefault();
          onUndo();
        } else if ((event.key === 'y' || (event.key === 'z' && event.shiftKey)) && canRedo) {
          event.preventDefault();
          onRedo();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onUndo, onRedo, canUndo, canRedo]);
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
      <h3 className="font-semibold text-gray-800 text-sm">Tools</h3>
      
      {/* Mode Selection */}
      <div className="space-y-2">
        {TOOLBAR_MODES.map((toolMode) => {
          const Icon = toolMode.icon;
          const isActive = mode === toolMode.id;
          
          return (
            <button
              key={toolMode.id}
              onClick={() => onModeChange(toolMode.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
              }`}
              title={toolMode.description}
            >
              <Icon size={16} />
              <span>{toolMode.label}</span>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200"></div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <RotateCcw size={14} />
            <span className="text-xs">Undo</span>
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <RotateCw size={14} />
            <span className="text-xs">Redo</span>
          </button>
        </div>
        
        {/* Undo/Redo Status */}
        <div className="text-xs text-gray-500 text-center">
          {canUndo ? `${undoStack.length} actions available` : 'No actions to undo'}
        </div>
        
        <button
          onClick={onClear}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
          title="Clear all players and routes"
        >
          <Trash size={14} />
          <span className="text-sm">Clear Field</span>
        </button>
        
        <button
          onClick={onShowHelp}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          title="Show help and tutorial"
        >
          <HelpCircle size={14} />
          <span className="text-sm">Help</span>
        </button>
      </div>

      {/* Current Mode Indicator */}
      <div className="pt-2 border-t border-gray-200">
        <div className="text-xs text-gray-500 mb-1">Current Mode:</div>
        <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 rounded text-xs text-blue-700">
          <MousePointer size={12} />
          <span className="capitalize">{mode}</span>
        </div>
      </div>
    </div>
  );
});

Toolbar.displayName = 'Toolbar';

export default Toolbar; 