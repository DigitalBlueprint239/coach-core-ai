import React from 'react';
import {
  RosterPlayer,
  AVAILABILITY_COLORS,
  AVAILABILITY_LABELS,
  EXPERIENCE_COLORS,
  EXPERIENCE_LABELS,
} from '../../types/roster';

interface PlayerCardProps {
  player: RosterPlayer;
  onSelect: (player: RosterPlayer) => void;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, onSelect }) => {
  return (
    <button
      onClick={() => onSelect(player)}
      className="w-full text-left bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md hover:border-blue-300 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0">
          {/* Jersey number */}
          <div className="flex-shrink-0 w-10 h-10 bg-gray-900 text-white rounded-lg flex items-center justify-center font-bold text-sm">
            {player.number}
          </div>
          {/* Name + position */}
          <div className="min-w-0">
            <div className="font-medium text-gray-900 truncate text-sm">
              {player.name}
            </div>
            <div className="text-xs text-gray-500">{player.position}</div>
          </div>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          {/* Experience badge */}
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${EXPERIENCE_COLORS[player.experienceLevel]}`}
          >
            {EXPERIENCE_LABELS[player.experienceLevel]}
          </span>
          {/* Availability dot */}
          <div className="relative group">
            <div
              className={`w-3 h-3 rounded-full ${AVAILABILITY_COLORS[player.availabilityStatus]}`}
            />
            <span className="absolute bottom-full right-0 mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
              {AVAILABILITY_LABELS[player.availabilityStatus]}
              {player.injuryNote ? `: ${player.injuryNote}` : ''}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};

export default PlayerCard;
