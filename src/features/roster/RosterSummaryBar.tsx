import React from 'react';
import { RosterSummary } from '../../types/roster';

interface RosterSummaryBarProps {
  summary: RosterSummary;
}

const RosterSummaryBar: React.FC<RosterSummaryBarProps> = ({ summary }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{summary.totalPlayers}</div>
          <div className="text-xs text-gray-500">Total Players</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{summary.availableCount}</div>
          <div className="text-xs text-gray-500">Available</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {summary.injuredCount + summary.limitedCount}
          </div>
          <div className="text-xs text-gray-500">Injured / Limited</div>
        </div>
        <div className="text-center">
          <div className="flex justify-center space-x-3 text-xs text-gray-600">
            <span>OFF {summary.positionGroups.offense.total}</span>
            <span>DEF {summary.positionGroups.defense.total}</span>
            <span>ST {summary.positionGroups.specialTeams.total}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">Position Groups</div>
        </div>
      </div>
    </div>
  );
};

export default RosterSummaryBar;
