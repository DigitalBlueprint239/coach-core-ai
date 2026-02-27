import React, { useState, useEffect } from 'react';
import {
  RosterPlayer,
  FootballPosition,
  POSITION_LABELS,
  POSITION_TO_GROUP,
  PositionGroup,
  ExperienceLevel,
  AvailabilityStatus,
  AVAILABILITY_LABELS,
  EXPERIENCE_LABELS,
} from '../../types/roster';
import { useRoster } from '../../contexts/RosterContext';
import { useToast } from '../../components/ToastManager';

interface PlayerDetailProps {
  player: RosterPlayer | null;
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

const PlayerDetail: React.FC<PlayerDetailProps> = ({ player, onClose }) => {
  const { updatePlayer, deletePlayer, isJerseyNumberTaken } = useRoster();
  const { showSuccess, showError } = useToast();

  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [position, setPosition] = useState<FootballPosition>(FootballPosition.QB);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('backup');
  const [availability, setAvailability] = useState<AvailabilityStatus>('available');
  const [injuryNote, setInjuryNote] = useState('');
  const [coachNotes, setCoachNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [jerseyError, setJerseyError] = useState('');

  useEffect(() => {
    if (player) {
      setName(player.name);
      setNumber(String(player.number));
      setPosition(player.position);
      setExperienceLevel(player.experienceLevel);
      setAvailability(player.availabilityStatus);
      setInjuryNote(player.injuryNote || '');
      setCoachNotes(player.coachNotes || '');
      setShowDeleteConfirm(false);
      setJerseyError('');
    }
  }, [player]);

  const handleSave = async () => {
    if (!player) return;
    const jerseyNum = parseInt(number, 10);
    if (isNaN(jerseyNum) || jerseyNum < 0 || jerseyNum > 99) {
      setJerseyError('Jersey number must be 0-99');
      return;
    }

    setSaving(true);
    setJerseyError('');

    try {
      if (jerseyNum !== player.number) {
        const taken = await isJerseyNumberTaken(jerseyNum, player.id);
        if (taken) {
          setJerseyError(`Jersey #${jerseyNum} is already taken`);
          setSaving(false);
          return;
        }
      }

      await updatePlayer(player.id, {
        name: name.trim(),
        number: jerseyNum,
        position,
        experienceLevel,
        availabilityStatus: availability,
        injuryNote: availability !== 'available' ? injuryNote : undefined,
        coachNotes: coachNotes || undefined,
      });
      showSuccess(`${name.trim()} updated`);
      onClose();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update player');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!player) return;
    setDeleting(true);
    try {
      await deletePlayer(player.id);
      showSuccess(`${player.name} removed from roster`);
      onClose();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete player');
    } finally {
      setDeleting(false);
    }
  };

  if (!player) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-40 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Edit Player</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
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
            >
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
                  {EXPERIENCE_LABELS[level]}
                </button>
              ))}
            </div>
          </div>
          {/* Availability Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
            <div className="grid grid-cols-2 gap-2">
              {(['available', 'limited', 'injured', 'out'] as AvailabilityStatus[]).map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setAvailability(status)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                      availability === status
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {AVAILABILITY_LABELS[status]}
                  </button>
                )
              )}
            </div>
          </div>
          {/* Injury Note (shown when not fully available) */}
          {availability !== 'available' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Injury Note</label>
              <input
                type="text"
                value={injuryNote}
                onChange={(e) => setInjuryNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief injury description"
              />
            </div>
          )}
          {/* Coach Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Coach Notes</label>
            <textarea
              value={coachNotes}
              onChange={(e) => setCoachNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="Observations, reminders..."
            />
          </div>
          {/* Delete */}
          <div className="border-t pt-4">
            {showDeleteConfirm ? (
              <div className="space-y-2">
                <p className="text-sm text-red-600 font-medium">
                  Remove {player.name} from the roster?
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? 'Removing...' : 'Yes, Remove'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full text-red-600 text-sm font-medium py-2 hover:text-red-700"
              >
                Remove Player
              </button>
            )}
          </div>
        </div>
        {/* Save button */}
        <div className="p-4 border-t">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !number}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <span className="flex items-center justify-center space-x-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                <span>Saving...</span>
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default PlayerDetail;
