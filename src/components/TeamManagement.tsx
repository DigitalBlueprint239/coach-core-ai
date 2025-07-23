import React, { useState } from 'react';
import { useTeam } from '../contexts/TeamContext';
import { useToast } from './ToastManager';

export const TeamSelector: React.FC = () => {
  const { currentTeam, userTeams, switchTeam, loading } = useTeam();
  const { showToast } = useToast();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span>Loading teams...</span>
      </div>
    );
  }

  if (userTeams.length === 0) {
    return (
      <div className="flex items-center space-x-2">
        <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-md">
          No teams available
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm hover:border-gray-400 transition-colors">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium text-gray-900">
            {currentTeam?.name || 'Select Team'}
          </span>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-2">
              Your Teams
            </div>
            {userTeams.map((team) => (
              <button
                key={team.id}
                onClick={() => {
                  switchTeam(team.id);
                  setShowDropdown(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  currentTeam?.id === team.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{team.name}</span>
                  {currentTeam?.id === team.id && (
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Code: {team.code} • {team.memberIds.length} member{team.memberIds.length !== 1 ? 's' : ''}
                </div>
              </button>
            ))}
            
            <div className="border-t border-gray-200 mt-2 pt-2">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-2">
                Quick Actions
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(true);
                  setShowDropdown(false);
                }}
                className="w-full text-left px-3 py-2 rounded-md text-sm text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Create New Team</span>
                </div>
              </button>
              <button
                onClick={() => {
                  setShowJoinModal(true);
                  setShowDropdown(false);
                }}
                className="w-full text-left px-3 py-2 rounded-md text-sm text-green-600 hover:bg-green-50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  <span>Join Team</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateTeamModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
      <JoinTeamModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} />

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export const CreateTeamModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ 
  isOpen, 
  onClose 
}) => {
  const [teamName, setTeamName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { createTeam } = useTeam();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    setIsCreating(true);
    try {
      await createTeam({ name: teamName.trim() });
      showToast('Team created successfully!', 'success');
      setTeamName('');
      onClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to create team', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-200 ease-out">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Create New Team</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="team-name" className="block text-sm font-medium text-gray-700 mb-2">
                Team Name
              </label>
              <input
                type="text"
                id="team-name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter your team name"
                required
                autoFocus
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || !teamName.trim()}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </div>
                ) : (
                  'Create Team'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export const JoinTeamModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ 
  isOpen, 
  onClose 
}) => {
  const [teamCode, setTeamCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const { joinTeam } = useTeam();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamCode.trim()) return;

    setIsJoining(true);
    try {
      await joinTeam(teamCode.trim().toUpperCase());
      showToast('Successfully joined team!', 'success');
      setTeamCode('');
      onClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to join team', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-200 ease-out">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Join Team</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="team-code" className="block text-sm font-medium text-gray-700 mb-2">
                Team Code
              </label>
              <input
                type="text"
                id="team-code"
                value={teamCode}
                onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center text-xl font-mono tracking-widest transition-colors"
                placeholder="ABC123"
                maxLength={6}
                required
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Enter the 6-character team code provided by your coach
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isJoining || !teamCode.trim()}
                className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isJoining ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Joining...</span>
                  </div>
                ) : (
                  'Join Team'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export const TeamManagement: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const { currentTeam, userTeams, leaveTeam, switchTeam } = useTeam();
  const { showToast } = useToast();

  const handleLeaveTeam = async () => {
    if (!currentTeam) return;
    
    if (userTeams.length === 1) {
      showToast('You must be a member of at least one team', 'error');
      return;
    }

    try {
      await leaveTeam(currentTeam.id);
      showToast('Successfully left team', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to leave team', 'error');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Team Management</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Create Team
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Join Team
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Current Team</h3>
          {currentTeam ? (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{currentTeam.name}</h4>
                  <p className="text-sm text-gray-600">Code: {currentTeam.code}</p>
                  <p className="text-sm text-gray-600">
                    {currentTeam.memberIds.length} member{currentTeam.memberIds.length !== 1 ? 's' : ''}
                  </p>
                </div>
                {userTeams.length > 1 && (
                  <button
                    onClick={handleLeaveTeam}
                    className="px-3 py-1 text-sm font-medium text-red-600 bg-red-100 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Leave Team
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No team selected</p>
          )}
        </div>

        {userTeams.length > 1 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Your Teams</h3>
            <div className="space-y-2">
              {userTeams.map((team) => (
                <div
                  key={team.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    currentTeam?.id === team.id
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div>
                    <h4 className="font-medium text-gray-900">{team.name}</h4>
                    <p className="text-sm text-gray-600">Code: {team.code}</p>
                  </div>
                  {currentTeam?.id !== team.id && (
                    <button
                      onClick={() => switchTeam(team.id)}
                      className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Switch to
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <CreateTeamModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
      <JoinTeamModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} />
    </div>
  );
}; 

export { useTeam };
