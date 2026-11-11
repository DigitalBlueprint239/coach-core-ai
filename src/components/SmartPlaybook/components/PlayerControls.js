/**
 * PlayerControls.js – Player editing interface
 * - Edit selected player position and number
 * - Delete selected player
 * - Player information display
 */

import React, { memo, useState } from 'react';
import { User, Edit3, Trash2, Save, X, AlertTriangle } from 'lucide-react';

const POSITIONS = {
  OFFENSE: ['QB', 'RB', 'WR', 'TE', 'FB', 'LT', 'LG', 'C', 'RG', 'RT'],
  DEFENSE: ['DE', 'DT', 'NT', 'MLB', 'OLB', 'CB', 'FS', 'SS', 'NB', 'LB']
};

const PlayerControls = memo(({
  selectedPlayer,
  players,
  onUpdatePlayer,
  onDeletePlayer
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editPosition, setEditPosition] = useState('');
  const [editNumber, setEditNumber] = useState('');

  // Initialize edit form when player is selected
  React.useEffect(() => {
    if (selectedPlayer) {
      setEditPosition(selectedPlayer.position || '');
      setEditNumber(selectedPlayer.number?.toString() || '');
      setIsEditing(false);
    }
  }, [selectedPlayer]);

  const handleSave = () => {
    if (!selectedPlayer) return;
    
    const updates = {};
    let hasErrors = false;
    
    if (editPosition && editPosition !== selectedPlayer.position) {
      // Check for duplicate position
      const hasDuplicate = players.some(p => 
        p.position === editPosition && p.id !== selectedPlayer.id
      );
      if (hasDuplicate) {
        alert(`Another player already has position ${editPosition}. Please choose a different position.`);
        hasErrors = true;
      } else {
        updates.position = editPosition;
      }
    }
    
    if (editNumber && parseInt(editNumber) !== selectedPlayer.number) {
      // Check for duplicate number
      const hasDuplicate = players.some(p => 
        p.number === parseInt(editNumber) && p.id !== selectedPlayer.id
      );
      if (hasDuplicate) {
        alert(`Another player already has number ${editNumber}. Please choose a different number.`);
        hasErrors = true;
      } else {
        updates.number = parseInt(editNumber);
      }
    }
    
    if (hasErrors) return;
    
    if (Object.keys(updates).length > 0) {
      onUpdatePlayer(updates);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditPosition(selectedPlayer?.position || '');
    setEditNumber(selectedPlayer?.number?.toString() || '');
    setIsEditing(false);
  };

  if (!selectedPlayer) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="font-semibold text-gray-800 text-sm mb-3">Player Controls</h3>
        <div className="text-center py-8 text-gray-500">
          <User size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select a player to edit</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="font-semibold text-gray-800 text-sm mb-3">Player Controls</h3>
      
      {/* Player Info */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {selectedPlayer.number || '?'}
          </div>
          <div>
            <div className="font-medium text-blue-900">{selectedPlayer.position}</div>
            <div className="text-xs text-blue-700">
              Position: ({selectedPlayer.x.toFixed(0)}, {selectedPlayer.y.toFixed(0)})
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Position
            </label>
            <select
              value={editPosition}
              onChange={(e) => setEditPosition(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select position...</option>
              <optgroup label="Offense">
                {POSITIONS.OFFENSE.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </optgroup>
              <optgroup label="Defense">
                {POSITIONS.DEFENSE.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </optgroup>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Number
            </label>
            <input
              type="number"
              min="0"
              max="99"
              value={editNumber}
              onChange={(e) => setEditNumber(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0-99"
            />
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
            Edit Player
          </button>
          
          <button
            onClick={onDeletePlayer}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 size={14} />
            Delete Player
          </button>
        </div>
      )}
    </div>
  );
});

PlayerControls.displayName = 'PlayerControls';

export default PlayerControls; 