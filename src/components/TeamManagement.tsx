import React, { useState, useEffect, useRef, useId } from 'react';
import { useTeam, JOIN_UNAVAILABLE_MESSAGE, TEAM_CODE_LENGTH } from '../contexts/TeamContext';
import { useToast } from './ToastManager';
import { useModalDialog } from './common/useModalDialog';

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

export const CreateTeamModal: React.FC<{ isOpen: boolean; onClose: () => void }> = props => {
  const {teamCreationAccount} = useTeam();
  return <CreateTeamForm key={teamCreationAccount || 'signed-out'} {...props}/>;
};

const CreateTeamForm: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen, 
  onClose 
}) => {
  const [teamName, setTeamName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { createTeam, teamCreation, confirmedTeams } = useTeam();
  const [separateName, setSeparateName] = useState<string | null>(null);
  const submitting = useRef(false);
  const { showToast } = useToast();
  const pending = teamCreation.operation !== null && teamCreation.phase !== 'confirmed';
  const saving = teamCreation.phase === 'saving';
  const mounted = useRef(true);
  const tracked = useRef<string | null>(null);
  const notified = useRef<string | null>(null);
  const dialog = useModalDialog(isOpen, onClose);
  const titleId = useId();
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const complete = (id: string) => {
    if (!mounted.current || notified.current === id) return;
    notified.current = id;
    showToast('Team created successfully!', 'success');
    setTeamName('');
    onClose();
  };
  useEffect(() => {
    if (!isOpen) return;
    if (pending) tracked.current = teamCreation.operation!.id;
    if (teamCreation.phase === 'confirmed' && tracked.current === teamCreation.operation?.id) {
      complete(teamCreation.operation!.id);
      tracked.current = null;
    }
  });
  const submit = async (name: string) => {
    if (!name || saving || submitting.current) return;
    submitting.current = true;
    setSeparateName(null);
    setSubmitError(null);
    setIsCreating(true);
    try {
      const id = await createTeam(name);
      complete(id);
    } catch (error) {
      if (mounted.current) setSubmitError(error instanceof Error ? error.message : 'Team creation not confirmed.');
    } finally {
      submitting.current = false;
      if (mounted.current) setIsCreating(false);
    }
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current || separateName !== null) return;
    const name = pending ? teamCreation.operation!.name : teamName.trim();
    // A journalled retry is the existing operation, never a second creation.
    if (!pending && confirmedTeams.some(team => team.name.trim() === name)) {
      setSeparateName(name);
      return;
    }
    void submit(name);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div ref={dialog.ref} onKeyDown={dialog.onKeyDown} role="dialog" aria-modal="true" aria-labelledby={titleId}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-200 ease-out">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 id={titleId} className="text-xl font-semibold text-gray-900">Create New Team</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {pending && <p role="status">{saving ? 'Saving your team. You may leave this dialog; the pending creation will be retained.' : 'Still saving. Check your connection. We are checking the server for this team; Check and retry uses the same team ID.'}</p>}
          {(submitError || teamCreation.error) && <p role="alert">{submitError || teamCreation.error}</p>}
          {separateName !== null && <div role="alertdialog" aria-label="Confirm separate team">
            <p>You already have a team named {separateName}. Do you intend to create a separate team?</p>
            <button type="button" onClick={() => setSeparateName(null)}>Go back</button>
            <button type="button" onClick={() => {void submit(separateName);}}>Create a separate team</button>
          </div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="team-name" className="block text-sm font-medium text-gray-700 mb-2">
                Team Name
              </label>
              <input
                type="text"
                id="team-name"
                value={pending ? teamCreation.operation!.name : teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter your team name"
                required
                maxLength={80}
                disabled={pending || isCreating}
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
                disabled={saving || isCreating || teamCreation.phase === 'blocked' || (!pending && !teamName.trim())}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {(saving || isCreating) ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </div>
                ) : (
                  pending ? 'Check and retry' : 'Create Team'
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
  const dialog = useModalDialog(isOpen, onClose);
  const titleId = useId();
  const noticeId = useId();

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
      <div ref={dialog.ref} onKeyDown={dialog.onKeyDown} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={noticeId}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-200 ease-out">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 id={titleId} className="text-xl font-semibold text-gray-900">Join Team</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Private beta: joinTeam always refuses; say so before the coach types a code. */}
          <p id={noticeId} className="mb-6 px-4 py-3 text-sm border bg-yellow-50 text-yellow-800">{JOIN_UNAVAILABLE_MESSAGE}</p>
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
                placeholder="ABCD2345"
                maxLength={TEAM_CODE_LENGTH}
                required
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Enter the {TEAM_CODE_LENGTH}-character team code provided by your coach
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

const monogram = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();

export const TeamManagement: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const { currentTeam, userTeams, leaveTeam, switchTeam, teamCreation } = useTeam();
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

  const members = (count: number) => `${count} member${count !== 1 ? 's' : ''}`;

  return (
    <div className="eb-teams">
      <div className="eb-hero">
        <div>
          <span className="eb-kicker" aria-hidden="true">Team operations</span>
          <h2 className="eb-title">Team Management</h2>
        </div>
        <div className="eb-actions">
          <button onClick={() => setShowCreateModal(true)} className="eb-btn eb-btn-primary">Create Team</button>
          <button onClick={() => setShowJoinModal(true)} className="eb-btn">Join Team</button>
        </div>
      </div>

      {teamCreation.operation && teamCreation.phase !== 'confirmed' && <div role="status" className="eb-pending">
        <p>Pending team: {teamCreation.operation.name}. {teamCreation.phase === 'saving' ? 'Waiting for server confirmation.' : 'Still saving; confirmation is unavailable.'}</p>
        <button type="button" className="eb-btn" onClick={() => setShowCreateModal(true)}>Resume team creation</button>
      </div>}
      <div className={`eb-teams-grid${userTeams.length > 1 ? '' : ' eb-teams-single'}`}>
        <section className="eb-current" aria-labelledby="eb-current-title">
          <div className="eb-current-top">
            <h3 id="eb-current-title" className="eb-chip-live">Current Team</h3>
            {currentTeam && userTeams.length > 1 && (
              <button onClick={handleLeaveTeam} className="eb-leave">Leave Team</button>
            )}
          </div>
          {currentTeam ? (
            <div className="eb-current-body">
              <span className="eb-monogram" aria-hidden="true">{monogram(currentTeam.name)}</span>
              <div>
                <h4 className="eb-current-name">{currentTeam.name}</h4>
                <div className="eb-current-meta">
                  <p>Code: {currentTeam.code}</p>
                  <p>{members(currentTeam.memberIds.length)}</p>
                </div>
              </div>
              <span className="eb-watermark" aria-hidden="true">{monogram(currentTeam.name)}</span>
            </div>
          ) : (
            <p className="eb-current-empty">No team selected</p>
          )}
        </section>

        {userTeams.length > 1 && (
          <section className="eb-panel eb-team-list" aria-labelledby="eb-your-teams">
            <div className="eb-panel-head"><h3 id="eb-your-teams">Your Teams</h3><span className="eb-count" aria-hidden="true">{userTeams.length}</span></div>
            <div>
              {userTeams.map((team) => (
                <div key={team.id} className={`eb-team-row${currentTeam?.id === team.id ? ' eb-team-row-current' : ''}`}>
                  <span className="eb-row-mono" aria-hidden="true">{monogram(team.name)}</span>
                  <div className="eb-row-text">
                    <h4>{team.name}</h4>
                    <p>Code: {team.code} • {members(team.memberIds.length)}</p>
                  </div>
                  {currentTeam?.id !== team.id ? (
                    <button onClick={() => switchTeam(team.id)} className="eb-btn eb-btn-small">Switch to</button>
                  ) : <span className="eb-tag">Current</span>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <CreateTeamModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
      <JoinTeamModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} />
    </div>
  );
};
