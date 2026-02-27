import React, { useState } from 'react';
import {
  FootballPosition,
  POSITION_LABELS,
  POSITION_TO_GROUP,
  PositionGroup,
  ExperienceLevel,
} from '../../types/roster';
import { useRoster } from '../../contexts/RosterContext';
import { useToast } from '../../components/ToastManager';

interface AddPlayerFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const orderedPositions = Object.values(FootballPosition);
const groupedPositions: Record<string, FootballPosition[]> = {
  Offense: orderedPositions.filter((p) => POSITION_TO_GROUP[p] === PositionGroup.OFFENSE),
  Defense: orderedPositions.filter((p) => POSITION_TO_GROUP[p] === PositionGroup.DEFENSE),
  'Special Teams': orderedPositions.filter(
    (p) => POSITION_TO_GROUP[p] === PositionGroup.SPECIAL_TEAMS
  ),
};

const AddPlayerForm: React.FC<AddPlayerFormProps> = ({ isOpen, onClose }) => {
  const { addPlayer, isJerseyNumberTaken } = useRoster();
  const { showSuccess, showError } = useToast();
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [position, setPosition] = useState<FootballPosition | ''>('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('backup');
  const [saving, setSaving] = useState(false);
  const [jerseyError, setJerseyError] = useState('');

  const resetForm = () => {
    setName('');
    setNumber('');
    setPosition('');
    setExperienceLevel('backup');
    setJerseyError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!position) return;

    const jerseyNum = parseInt(number, 10);
    if (isNaN(jerseyNum) || jerseyNum < 0 || jerseyNum > 99) {
      setJerseyError('Jersey number must be 0-99');
      return;
    }

    setSaving(true);
    setJerseyError('');

    try {
      const taken = await isJerseyNumberTaken(jerseyNum);
      if (taken) {
        setJerseyError(`Jersey #${jerseyNum} is already taken on this team`);
        setSaving(false);
        return;
      }

      await addPlayer({
        name: name.trim(),
        number: jerseyNum,
        position,
        experienceLevel,
      });

      showSuccess(`${name.trim()} added to roster`);
      resetForm();
      onClose();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to add player');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-40 z-40" onClick={onClose} />
      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Add Player</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Player name"
              required
              autoFocus
            />
          </div>
          {/* Jersey Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jersey Number</label>
            <input
              type="number"
              min={0}
              max={99}
              value={number}
              onChange={(e) => {
                setNumber(e.target.value);
                setJerseyError('');
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                jerseyError ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="0-99"
              required
            />
            {jerseyError && <p className="mt-1 text-sm text-red-600">{jerseyError}</p>}
          </div>
          {/* Position */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value as FootballPosition)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="" disabled>
                Select position
              </option>
              {Object.entries(groupedPositions).map(([group, positions]) => (
                <optgroup key={group} label={group}>
                  {positions.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos} - {POSITION_LABELS[pos]}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          {/* Experience Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
            <div className="grid grid-cols-3 gap-2">
              {(['starter', 'backup', 'developmental'] as ExperienceLevel[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setExperienceLevel(level)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    experienceLevel === level
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving || !name.trim() || !position || !number}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <span className="flex items-center justify-center space-x-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>Adding...</span>
                </span>
              ) : (
                'Add Player'
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default AddPlayerForm;
