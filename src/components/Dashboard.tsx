import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTeam } from '../contexts/TeamContext';
import { LoadingSpinner, useToast } from './index';
import PracticePlanner from '../features/practice-planner/PracticePlanner';
import SmartPlaybook from './SmartPlaybook/SmartPlaybook';
import { useFeatureGating } from '../utils/featureGating';
import { Feature } from '../utils/featureGating';
import { FootballLevel } from '../types/football';
// TODO: Fix import path for AnalyticsDashboard if file exists
// import AnalyticsDashboard from '../features/analytics/AnalyticsDashboard';

const Dashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { currentTeam } = useTeam();
  const { showSuccess } = useToast();
  const [activeTab, setActiveTab] = useState('overview');

  // Get team level for feature gating
   const teamLevel = (currentTeam?.level as FootballLevel) || FootballLevel.VARSITY;
  const { canAccess, availableFeatures, isYouth, isAdvanced } = useFeatureGating(teamLevel);

  if (authLoading) {
    return <LoadingSpinner text="Loading your coaching dashboard..." />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-6">
            Coach Core AI
          </h1>
          <p className="text-gray-600 text-center mb-8">
            The ultimate sports coaching platform. Sign in to get started.
          </p>
          <button
            onClick={() => showSuccess('Authentication coming soon!')}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Filter tabs based on available features
  const allTabs: { id: string; name: string; icon: string; feature: Feature }[] = [
    { id: 'overview', name: 'Overview', icon: '📊', feature: 'team_dashboard' },
    { id: 'teams', name: 'Teams', icon: '👥', feature: 'roster_management' },
    { id: 'practice', name: 'Practice Plans', icon: '📋', feature: 'practice_plans' },
    { id: 'playbook', name: 'Smart Playbook', icon: '🏈', feature: 'basic_plays' },
    { id: 'analytics', name: 'Analytics', icon: '📈', feature: 'basic_analytics' },
  ];

  const availableTabs = allTabs.filter(tab => canAccess(tab.feature));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Coach Core AI Dashboard
              </h1>
              <p className="text-sm text-gray-600">
                {currentTeam ? `${currentTeam.name} - ${teamLevel}` : 'No team selected'}
              </p>
            </div>
            
            {/* Level indicator */}
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {isYouth ? 'Youth Level' : isAdvanced ? 'Advanced Level' : 'Standard Level'}
              </span>
            </div>
          </div>

          {/* Navigation tabs */}
          <nav className="flex space-x-8">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div>
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Welcome back, {user.displayName || 'Coach'}!
              </h2>
              
              {/* Level-specific welcome message */}
              {isYouth && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-blue-900 mb-2">Youth Coaching Focus</h3>
                  <p className="text-blue-700 text-sm">
                    Your dashboard is optimized for youth development with safety tracking, 
                    parent communication, and age-appropriate activities.
                  </p>
                </div>
              )}
              
              {isAdvanced && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-purple-900 mb-2">Advanced Coaching Tools</h3>
                  <p className="text-purple-700 text-sm">
                    Access to advanced analytics, video analysis, and professional-grade 
                    play design tools.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {canAccess('roster_management') && (
                  <button
                    onClick={() => setActiveTab('teams')}
                    className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <div className="text-2xl mb-2">👥</div>
                    <div className="font-medium">Manage Teams</div>
                    <div className="text-sm opacity-90">Create or join teams</div>
                  </button>
                )}

                {canAccess('practice_plans') && (
                  <button
                    onClick={() => setActiveTab('practice')}
                    className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <div className="text-2xl mb-2">📋</div>
                    <div className="font-medium">Create Practice Plan</div>
                    <div className="text-sm opacity-90">AI-powered planning</div>
                  </button>
                )}

                {canAccess('basic_plays') && (
                  <button
                    onClick={() => setActiveTab('playbook')}
                    className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <div className="text-2xl mb-2">🏈</div>
                    <div className="font-medium">Smart Playbook</div>
                    <div className="text-sm opacity-90">
                      {isYouth ? 'Design simple plays' : 'Design advanced plays'}
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Feature availability notice */}
            {availableFeatures.length < allTabs.length && (
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-medium text-yellow-900 mb-2">Feature Availability</h3>
                <p className="text-yellow-700 text-sm">
                  Some features are not available at your current level. 
                  {isYouth ? ' Upgrade to access advanced tools.' : ' Contact your administrator for access.'}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'teams' && canAccess('roster_management') && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Management</h2>
            <p className="text-gray-600">Team management features coming soon!</p>
          </div>
        )}

        {activeTab === 'practice' && canAccess('practice_plans') && (
          <PracticePlanner />
        )}

        {activeTab === 'playbook' && canAccess('basic_plays') && (
          <SmartPlaybook teamLevel={teamLevel} />
        )}

        {activeTab === 'analytics' && canAccess('basic_analytics') && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Analytics Dashboard</h2>
            <p className="text-gray-600">Analytics features coming soon!</p>
            {/* {activeTab === 'analytics' && <AnalyticsDashboard teamLevel={teamLevel} />} */}
          </div>
        )}

        {/* Show message for unavailable features */}
        {(() => {
          const feature = allTabs.find(tab => tab.id === activeTab)?.feature;
          return feature && !canAccess(feature) ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Feature Not Available</h3>
              <p className="text-gray-600">
                This feature is not available at your current level ({teamLevel}).
              </p>
            </div>
          ) : null;
        })()}
      </main>
    </div>
  );
};

export default Dashboard;
