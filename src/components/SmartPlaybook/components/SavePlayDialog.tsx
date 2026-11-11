import React from 'react';

interface SavePlayDialogProps {
  show: boolean;
  playName: string;
  playPhase: string;
  playType: string;
  onPlayNameChange: (v: string) => void;
  onPlayPhaseChange: (v: string) => void;
  onPlayTypeChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  canSave: boolean;
}

const SavePlayDialog: React.FC<SavePlayDialogProps> = ({
  show,
  playName,
  playPhase,
  playType,
  onPlayNameChange,
  onPlayPhaseChange,
  onPlayTypeChange,
  onSave,
  onCancel,
  canSave
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Save Play</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Play Name</label>
            <input
              type="text"
              value={playName}
              onChange={(e) => onPlayNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter play name..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phase</label>
              <select
                value={playPhase}
                onChange={(e) => onPlayPhaseChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="offense">Offense</option>
                <option value="defense">Defense</option>
                <option value="special">Special Teams</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={playType}
                onChange={(e) => onPlayTypeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="pass">Pass</option>
                <option value="run">Run</option>
                <option value="kick">Kick</option>
                <option value="punt">Punt</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onSave}
            disabled={!canSave}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Play
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(SavePlayDialog);
