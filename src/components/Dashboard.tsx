import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTeam } from '../contexts/TeamContext';
import { TeamManagement } from './TeamManagement';
import { LoadingSpinner, useToast } from './index';
import PracticePlanner from '../features/practice-planner/PracticePlanner';
import SmartPlaybook from './SmartPlaybook/SmartPlaybook';
import ErrorBoundary from './common/ErrorBoundary';
import { addBreadcrumb } from '../utils/breadcrumbs';
import { completeScreenRenderTiming, getRecentScreenTimings, startScreenRenderTiming } from '../utils/performanceInstrumentation';
import { env } from '../config/env';
import { generateHealthSignals } from '../health/generateHealthSignals';
import SeasonHealthDashboard from '../health/SeasonHealthDashboard';
import { dispatchHealthAction, filterResolvedSignals } from '../health/healthActions';
import { HealthSignal, HealthSignalAction } from '../health/healthTypes';
import { getSeasonHealthSelectorBundle, readHealthAuxData } from '../selectors/seasonHealthSelectors';

const Dashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { currentTeam, userTeams } = useTeam();
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [diagnosticsVersion, setDiagnosticsVersion] = useState(0);
  const [composerDraft, setComposerDraft] = useState<{ teamId?: string; message: string } | null>(null);
  const [refreshSignalsVersion, setRefreshSignalsVersion] = useState(0);

  useEffect(() => {
    addBreadcrumb({ at: Date.now(), category: 'navigation', message: `dashboard_tab:${activeTab}` });

    if (!['schedule', 'chat', 'practice', 'season-health'].includes(activeTab)) return;

    const marker = startScreenRenderTiming(activeTab);
    const frame = requestAnimationFrame(() => {
      completeScreenRenderTiming(marker);
      setDiagnosticsVersion(Date.now());
    });

    return () => cancelAnimationFrame(frame);
  }, [activeTab]);

  const recentTimings = useMemo(() => getRecentScreenTimings().slice(0, 6), [diagnosticsVersion]);

  const seasonHealth = useMemo(() => {
    const auxDataResult = readHealthAuxData();
    const bundle = getSeasonHealthSelectorBundle(currentTeam?.id, userTeams, auxDataResult);

    const rawSignals = generateHealthSignals({
      teams: bundle.teams,
      roster: bundle.roster,
      attendance: bundle.attendance,
      schedule: bundle.schedule
    });

    return {
      signals: filterResolvedSignals(rawSignals),
      dataStatus: bundle.dataStatus
    };
  }, [currentTeam?.id, userTeams, refreshSignalsVersion]);

  const handleHealthAction = (signal: HealthSignal, action: HealthSignalAction) => {
    const ok = dispatchHealthAction(action, signal, {
      navigate: (target) => setActiveTab(target),
      setComposerDraft,
      showSuccess,
      showError
    });

    if (ok) setRefreshSignalsVersion((x) => x + 1);
  };

  if (authLoading) {
    return <LoadingSpinner text="Loading your coaching dashboard..." />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-6">Coach Core AI</h1>
          <p className="text-gray-600 text-center mb-8">The ultimate sports coaching platform. Sign in to get started.</p>
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

  const tabs = [
    { id: 'overview', name: 'Home', icon: '🏠' },
    { id: 'schedule', name: 'Schedule', icon: '🗓️' },
    { id: 'chat', name: 'Chat', icon: '💬' },
    { id: 'practice', name: 'Practice Plans', icon: '📋' },
    { id: 'season-health', name: 'Season Health', icon: '🩺' },
    { id: 'attendance', name: 'Attendance', icon: '✅' },
    { id: 'teams', name: 'Teams', icon: '👥' },
    { id: 'playbook', name: 'Smart Playbook', icon: '🏈' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Coach Core AI</h1>
              {currentTeam && <span className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">{currentTeam.name}</span>}
            </div>
            <span className="text-sm text-gray-600">Welcome, {user.email}</span>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto">
          <div className="flex space-x-6 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {activeTab === 'overview' && (
          <div className="px-4 sm:px-0">
            <div className="mt-2">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <button data-testid="qa-schedule" onClick={() => setActiveTab('schedule')} className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors text-left">
                  <div className="text-2xl mb-2">🗓️</div><div className="font-medium">Today's Schedule</div><div className="text-sm opacity-90">View and adjust sessions</div>
                </button>
                <button data-testid="qa-message" onClick={() => setActiveTab('chat')} className="bg-indigo-600 text-white p-4 rounded-lg hover:bg-indigo-700 transition-colors text-left">
                  <div className="text-2xl mb-2">💬</div><div className="font-medium">Send Message</div><div className="text-sm opacity-90">Team communication</div>
                </button>
                <button data-testid="qa-practice" onClick={() => setActiveTab('practice')} className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition-colors text-left">
                  <div className="text-2xl mb-2">📋</div><div className="font-medium">Start Practice Plan</div><div className="text-sm opacity-90">Coach-aware AI plan</div>
                </button>
                <button data-testid="qa-attendance" onClick={() => setActiveTab('attendance')} className="bg-emerald-600 text-white p-4 rounded-lg hover:bg-emerald-700 transition-colors text-left">
                  <div className="text-2xl mb-2">✅</div><div className="font-medium">Take Attendance</div><div className="text-sm opacity-90">Check players in fast</div>
                </button>
                <button data-testid="qa-season-health" onClick={() => setActiveTab('season-health')} className="bg-rose-600 text-white p-4 rounded-lg hover:bg-rose-700 transition-colors text-left">
                  <div className="text-2xl mb-2">🩺</div><div className="font-medium">Season Health</div><div className="text-sm opacity-90">Find and fix anomalies</div>
                </button>
              </div>

              <div className="mt-6 bg-white rounded-lg shadow p-4" data-testid="diagnostics-panel">
                <h3 className="font-semibold text-gray-900 mb-2">Diagnostics</h3>
                <p className="text-xs text-gray-500 mb-2">Latest Schedule/Chat/Practice/Season Health render timings.</p>
                {recentTimings.length === 0 ? (
                  <p className="text-sm text-gray-500">No timings recorded yet.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {recentTimings.map((t, idx) => (
                      <li key={`${t.screen}-${idx}`} className="flex items-center justify-between">
                        <span className="capitalize">{t.screen}</span>
                        <span className="text-xs text-gray-500">target {t.targetMs}ms</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${t.status === 'green' ? 'bg-green-100 text-green-700' : t.status === 'yellow' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{t.status.toUpperCase()}</span>
                        <span>{t.durationMs.toFixed(1)}ms</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="mt-2 text-[11px] text-gray-400">commit: {env.VITE_COMMIT_HASH || 'local'} • {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && <div className="px-4 sm:px-0"><div className="bg-white rounded-lg shadow p-6"><h2 className="text-lg font-semibold mb-2">Today's Schedule</h2><p className="text-gray-600">No sessions scheduled yet. Add your first session to get started.</p></div></div>}
        {activeTab === 'chat' && (
          <div className="px-4 sm:px-0">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-2">Team Chat</h2>
              {composerDraft ? (
                <p className="text-gray-700 text-sm" data-testid="chat-draft-preview">Draft ready: {composerDraft.message}</p>
              ) : (
                <p className="text-gray-600">Messaging is ready. Start a team update in one tap.</p>
              )}
            </div>
          </div>
        )}
        {activeTab === 'attendance' && <div className="px-4 sm:px-0"><div className="bg-white rounded-lg shadow p-6"><h2 className="text-lg font-semibold mb-2">Attendance</h2><p className="text-gray-600">Attendance check-in will appear here for today's roster.</p></div></div>}
        {activeTab === 'teams' && <TeamManagement />}
        {activeTab === 'practice' && <PracticePlanner />}
        {activeTab === 'season-health' && (
          <SeasonHealthDashboard
            signals={seasonHealth.signals}
            dataStatus={seasonHealth.dataStatus}
            onAction={handleHealthAction}
          />
        )}
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
