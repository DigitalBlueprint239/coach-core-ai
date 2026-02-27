import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTeam } from '../contexts/TeamContext';
import { useRoster } from '../contexts/RosterContext';
import { TeamManagement } from './TeamManagement';
import { LoadingSpinner } from './index';
import PracticePlanner from '../features/practice-planner/PracticePlanner';
import PlayerRoster from '../features/roster/PlayerRoster';
import SmartPlaybook from './SmartPlaybook/SmartPlaybook';
import ErrorBoundary from './common/ErrorBoundary';
// WHY: usePracticePlans subscribes to Firestore in real-time via onSnapshot so the
// count stays accurate without needing a manual refresh.
import { usePracticePlans } from '../hooks/useFirestore';

const Dashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { currentTeam } = useTeam();
  const { summary } = useRoster();
  const [activeTab, setActiveTab] = useState('overview');

  // Connect Practice Plans count to real Firestore data.
  // Pass undefined when no team is selected so the hook skips the query.
  const { plans } = usePracticePlans(currentTeam?.id);

  if (authLoading) {
    return <LoadingSpinner text="Loading your coaching dashboard..." />;
  }

  // This guard is a safety net. App.tsx's auth gate means this component only
  // mounts when user is authenticated. If it somehow renders without a user,
  // return null rather than a misleading sign-in stub.
  if (!user) {
    return null;
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'teams', name: 'Teams', icon: '👥' },
    { id: 'roster', name: 'Roster', icon: '🏈' },
    { id: 'practice', name: 'Practice Plans', icon: '📋' },
    { id: 'playbook', name: 'Smart Playbook', icon: '📖' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Coach Core AI</h1>
              {currentTeam && (
                <span className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {currentTeam.name}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user.email}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation — horizontal scroll on mobile */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-6 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {activeTab === 'overview' && (
          <div className="px-4 sm:px-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Active Teams */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm">👥</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Active Teams
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {currentTeam ? '1' : '0'}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Roster — real data */}
              <button
                onClick={() => setActiveTab('roster')}
                className="bg-white overflow-hidden shadow rounded-lg text-left hover:shadow-md transition-shadow"
              >
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm">🏈</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Roster
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {summary.totalPlayers}
                          {summary.totalPlayers > 0 && (
                            <span className="text-sm font-normal text-green-600 ml-1">
                              {summary.availableCount} avail
                            </span>
                          )}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </button>

              {/* Practice Plans */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm">📋</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Practice Plans
                        </dt>
                        {/* Real count from Firestore — updates live as plans are saved/deleted */}
                        <dd className="text-lg font-medium text-gray-900">
                          {currentTeam ? plans.length : '—'}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Plays Created */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm">📖</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Plays Created
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">0</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => setActiveTab('teams')}
                  className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <div className="text-2xl mb-2">👥</div>
                  <div className="font-medium">Manage Teams</div>
                  <div className="text-sm opacity-90">Create or join teams</div>
                </button>

                <button
                  onClick={() => setActiveTab('roster')}
                  className="bg-orange-600 text-white p-4 rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <div className="text-2xl mb-2">🏈</div>
                  <div className="font-medium">Player Roster</div>
                  <div className="text-sm opacity-90">Manage your players</div>
                </button>

                <button
                  onClick={() => setActiveTab('practice')}
                  className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <div className="text-2xl mb-2">📋</div>
                  <div className="font-medium">Create Practice Plan</div>
                  <div className="text-sm opacity-90">AI-powered planning</div>
                </button>

                <button
                  onClick={() => setActiveTab('playbook')}
                  className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <div className="text-2xl mb-2">📖</div>
                  <div className="font-medium">Smart Playbook</div>
                  <div className="text-sm opacity-90">Design plays visually</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'teams' && <TeamManagement />}
        {activeTab === 'roster' && <PlayerRoster />}
        {activeTab === 'practice' && <PracticePlanner />}
        {activeTab === 'playbook' && (
          <ErrorBoundary>
            <SmartPlaybook />
          </ErrorBoundary>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
