/**
 * SaveLoadPanel.js – Play save and load interface
 * - Save current play with metadata
 * - Load saved plays
 * - Play information management
 */

import React, { memo } from 'react';
import { Save, FolderOpen, FileText, Tag } from 'lucide-react';

const SaveLoadPanel = memo(({
  currentPlayName,
  currentPlayPhase,
  currentPlayType,
  onPlayNameChange,
  onPlayPhaseChange,
  onPlayTypeChange,
  onSave,
  onLoad,
  canSave = false
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="font-semibold text-gray-800 text-sm mb-3">Play Management</h3>
      
      {/* Current Play Info */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Current Play</span>
        </div>
        
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Play Name
            </label>
            <input
              type="text"
              value={currentPlayName}
              onChange={(e) => onPlayNameChange(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter play name..."
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Phase
              </label>
              <select
                value={currentPlayPhase}
                onChange={(e) => onPlayPhaseChange(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="offense">Offense</option>
                <option value="defense">Defense</option>
                <option value="special">Special Teams</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Type
              </label>
              <select
                value={currentPlayType}
                onChange={(e) => onPlayTypeChange(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="pass">Pass</option>
                <option value="run">Run</option>
                <option value="kick">Kick</option>
                <option value="punt">Punt</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={onSave}
          disabled={!canSave}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save size={14} />
          Save Play
        </button>
        
        <button
          onClick={onLoad}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FolderOpen size={14} />
          Load Play
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Save your current play setup or load previously saved plays from your library.
        </p>
      </div>
    </div>
  );
});

SaveLoadPanel.displayName = 'SaveLoadPanel';

export default SaveLoadPanel; 