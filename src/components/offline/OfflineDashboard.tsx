// @ts-nocheck
// src/components/offline/OfflineDashboard.tsx
import React, { useState } from 'react';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { QueueViewer } from './QueueViewer';
import { ConflictResolutionUI } from './ConflictResolutionUI';
import { offlineQueueManager } from '../../services/offline/OfflineQueueManager';

interface OfflineDashboardProps {
  userId: string;
  className?: string;
}

type TabType = 'overview' | 'queue' | 'conflicts' | 'settings';

export const OfflineDashboard: React.FC<OfflineDashboardProps> = ({
  userId,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleClearQueue = async () => {
    if (
      window.confirm(
        'Are you sure you want to clear the entire offline queue? This action cannot be undone.'
      )
    ) {
      try {
        await offlineQueueManager.clearQueue();
        alert('Queue cleared successfully');
      } catch (error) {
        console.error('Failed to clear queue:', error);
        alert('Failed to clear queue');
      }
    }
  };

  const handleForceSync = async () => {
    try {
      await offlineQueueManager.processQueue();
      alert('Manual sync completed');
    } catch (error) {
      console.error('Manual sync failed:', error);
      alert('Manual sync failed');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'queue', label: 'Queue', icon: '📋' },
    { id: 'conflicts', label: 'Conflicts', icon: '⚠️' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className={`max-w-7xl mx-auto p-6 ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Offline Management Dashboard
        </h1>
        <p className="text-gray-600">
          Monitor and manage offline operations, sync status, and resolve
          conflicts
        </p>
      </div>

      {/* Sync Status Banner */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <SyncStatusIndicator userId={userId} showDetails={true} />
            <div className="flex space-x-3">
              <button
                onClick={handleForceSync}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Force Sync
              </button>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                {showAdvanced ? 'Hide' : 'Show'} Advanced
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Controls */}
      {showAdvanced && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-3">
            Advanced Controls
          </h3>
          <div className="flex space-x-3">
            <button
              onClick={handleClearQueue}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Clear Queue
            </button>
            <button
              onClick={() => offlineQueueManager['clearCache']()}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
            >
              Clear Cache
            </button>
            <button
              onClick={() => {
                const stats = offlineQueueManager.getCacheStats();
                console.log('Cache Stats:', stats);
                alert(`Cache Stats: ${JSON.stringify(stats, null, 2)}`);
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              View Cache Stats
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-8 border-b border-gray-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-lg">📊</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      Total Operations
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {/* This would be populated with actual stats */}-
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <span className="text-yellow-600 text-lg">⏳</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Pending</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {/* This would be populated with actual stats */}-
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <span className="text-red-600 text-lg">⚠️</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      Conflicts
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {/* This would be populated with actual stats */}-
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 text-lg">✅</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      Success Rate
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {/* This would be populated with actual stats */}-
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Network Status */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Network Status
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Connection Status</span>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      navigator.onLine
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {navigator.onLine ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Service Worker</span>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">IndexedDB</span>
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                    Available
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Activity
              </h3>
              <div className="text-gray-500 text-center py-8">
                Recent activity will be displayed here
              </div>
            </div>
          </div>
        )}

        {activeTab === 'queue' && <QueueViewer userId={userId} />}

        {activeTab === 'conflicts' && <ConflictResolutionUI userId={userId} />}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Offline Settings
            </h3>

            <div className="space-y-6">
              {/* Queue Settings */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Queue Settings
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">
                      Auto-sync on reconnect
                    </span>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-gray-300"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">
                      Retry failed operations
                    </span>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-gray-300"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">
                      Show sync notifications
                    </span>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-gray-300"
                    />
                  </div>
                </div>
              </div>

              {/* Conflict Resolution Settings */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Conflict Resolution
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default resolution strategy
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                      <option value="SERVER_WINS">Server Wins</option>
                      <option value="CLIENT_WINS">Local Wins</option>
                      <option value="MERGE">Merge</option>
                      <option value="USER_CHOICE">Ask User</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">
                      Auto-resolve simple conflicts
                    </span>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-gray-300"
                    />
                  </div>
                </div>
              </div>

              {/* Storage Settings */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Storage</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Max queue size</span>
                    <input
                      type="number"
                      defaultValue="1000"
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Cache TTL (minutes)</span>
                    <input
                      type="number"
                      defaultValue="5"
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t border-gray-200">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
