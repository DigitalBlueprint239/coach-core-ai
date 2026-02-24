import React, { useState } from 'react';
import { useRoster } from '../../contexts/RosterContext';
import { useTeam } from '../../contexts/TeamContext';
import {
  RosterPlayer,
  PositionGroup,
  POSITION_GROUP_LABELS,
} from '../../types/roster';
import RosterSummaryBar from './RosterSummaryBar';
import PlayerCard from './PlayerCard';
import AddPlayerForm from './AddPlayerForm';
import PlayerDetail from './PlayerDetail';

const GROUP_ORDER: PositionGroup[] = [
  PositionGroup.OFFENSE,
  PositionGroup.DEFENSE,
  PositionGroup.SPECIAL_TEAMS,
];

const PlayerRoster: React.FC = () => {
  const { currentTeam } = useTeam();
  const { players, loading, error, summary } = useRoster();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<RosterPlayer | null>(null);

  if (!currentTeam) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Select a team to view its roster.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-3 text-gray-600">Loading roster...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Failed to load roster: {error}
      </div>
    );
  }

  // Group players by position group
  const grouped: Record<PositionGroup, RosterPlayer[]> = {
    [PositionGroup.OFFENSE]: [],
    [PositionGroup.DEFENSE]: [],
    [PositionGroup.SPECIAL_TEAMS]: [],
  };
  for (const p of players) {
    grouped[p.positionGroup]?.push(p);
  }

  return (
    <div className="relative pb-20">
      <RosterSummaryBar summary={summary} />

      {players.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <div className="text-4xl mb-3">&#127944;</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No players yet</h3>
          <p className="text-gray-500 mb-4 text-sm">
            Add your players to build an AI-powered roster.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Add First Player
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {GROUP_ORDER.map((group) => {
            const groupPlayers = grouped[group];
            if (groupPlayers.length === 0) return null;
            return (
              <div key={group}>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {POSITION_GROUP_LABELS[group]} ({groupPlayers.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {groupPlayers.map((player) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      onSelect={setSelectedPlayer}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FAB: Add Player */}
      <button
        onClick={() => setShowAddForm(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center z-30"
        aria-label="Add Player"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <AddPlayerForm isOpen={showAddForm} onClose={() => setShowAddForm(false)} />
      <PlayerDetail player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
    </div>
  );
};

export default PlayerRoster;
