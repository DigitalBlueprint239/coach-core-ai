// @ts-nocheck
// src/components/offline/ConflictResolutionUI.tsx
import React, { useState, useEffect } from 'react';
import {
  offlineQueueManager,
  ConflictResolution,
} from '../../services/offline/OfflineQueueManager';

interface ConflictResolutionUIProps {
  userId: string;
  className?: string;
}

export const ConflictResolutionUI: React.FC<ConflictResolutionUIProps> = ({
  userId,
  className = '',
}) => {
  const [conflicts, setConflicts] = useState<ConflictResolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConflict, setSelectedConflict] =
    useState<ConflictResolution | null>(null);
  const [resolutionStrategy, setResolutionStrategy] = useState<
    'SERVER_WINS' | 'CLIENT_WINS' | 'MERGE'
  >('SERVER_WINS');
  const [mergedData, setMergedData] = useState<any>(null);

  useEffect(() => {
    loadConflicts();
    const interval = setInterval(loadConflicts, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadConflicts = async () => {
    try {
      setLoading(true);
      const conflictsList = await offlineQueueManager.getConflicts();
      setConflicts(conflictsList);
    } catch (error) {
      console.error('Failed to load conflicts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveConflict = async (conflict: ConflictResolution) => {
    try {
      let finalData = null;

      switch (resolutionStrategy) {
        case 'SERVER_WINS':
          finalData = conflict.serverData;
          break;
        case 'CLIENT_WINS':
          finalData = conflict.clientData;
          break;
        case 'MERGE':
          finalData = mergedData || conflict.clientData;
          break;
      }

      await offlineQueueManager.resolveConflict(
        conflict.itemId,
        resolutionStrategy,
        finalData,
        userId
      );

      // Reload conflicts
      await loadConflicts();
      setSelectedConflict(null);
      setMergedData(null);
      setResolutionStrategy('SERVER_WINS');
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  };

  const handleAutoResolveAll = async (
    strategy: 'SERVER_WINS' | 'CLIENT_WINS'
  ) => {
    try {
      for (const conflict of conflicts) {
        await offlineQueueManager.resolveConflict(
          conflict.itemId,
          strategy,
          strategy === 'SERVER_WINS'
            ? conflict.serverData
            : conflict.clientData,
          userId
        );
      }
      await loadConflicts();
    } catch (error) {
      console.error('Failed to auto-resolve conflicts:', error);
    }
  };

  const getConflictDescription = (conflict: ConflictResolution) => {
    const serverKeys = Object.keys(conflict.serverData || {});
    const clientKeys = Object.keys(conflict.clientData || {});
    const conflictingKeys = serverKeys.filter(
      key =>
        clientKeys.includes(key) &&
        JSON.stringify(conflict.serverData[key]) !==
          JSON.stringify(conflict.clientData[key])
    );

    return {
      totalFields: Math.max(serverKeys.length, clientKeys.length),
      conflictingFields: conflictingKeys.length,
      conflictingKeys,
    };
  };

  const renderDataComparison = (conflict: ConflictResolution) => {
    const serverData = conflict.serverData || {};
    const clientData = conflict.clientData || {};
    const allKeys = [
      ...new Set([...Object.keys(serverData), ...Object.keys(clientData)]),
    ];

    return (
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Field Comparison</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="font-medium text-gray-700">Field</div>
          <div className="font-medium text-gray-700">Server Version</div>
          <div className="font-medium text-gray-700">Local Version</div>

          {allKeys.map(key => {
            const serverValue = serverData[key];
            const clientValue = clientData[key];
            const isConflicting =
              JSON.stringify(serverValue) !== JSON.stringify(clientValue);

            return (
              <React.Fragment key={key}>
                <div
                  className={`font-medium ${isConflicting ? 'text-red-600' : 'text-gray-900'}`}
                >
                  {key}
                  {isConflicting && (
                    <span className="ml-1 text-red-500">*</span>
                  )}
                </div>
                <div
                  className={`p-2 bg-gray-50 rounded ${isConflicting ? 'border border-red-200' : ''}`}
                >
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(serverValue, null, 2)}
                  </pre>
                </div>
                <div
                  className={`p-2 bg-gray-50 rounded ${isConflicting ? 'border border-red-200' : ''}`}
                >
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(clientValue, null, 2)}
                  </pre>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMergeEditor = (conflict: ConflictResolution) => {
    const serverData = conflict.serverData || {};
    const clientData = conflict.clientData || {};
    const allKeys = [
      ...new Set([...Object.keys(serverData), ...Object.keys(clientData)]),
    ];

    const handleMergeFieldChange = (key: string, value: any) => {
      setMergedData(prev => ({
        ...prev,
        [key]: value,
      }));
    };

    return (
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Merge Data</h4>
        <div className="space-y-3">
          {allKeys.map(key => {
            const serverValue = serverData[key];
            const clientValue = clientData[key];
            const currentValue = mergedData?.[key] ?? clientValue;
            const isConflicting =
              JSON.stringify(serverValue) !== JSON.stringify(clientValue);

            return (
              <div key={key} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {key}
                  {isConflicting && (
                    <span className="ml-1 text-red-500">*</span>
                  )}
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleMergeFieldChange(key, serverValue)}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Use Server
                  </button>
                  <button
                    onClick={() => handleMergeFieldChange(key, clientValue)}
                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    Use Local
                  </button>
                </div>
                <textarea
                  value={JSON.stringify(currentValue, null, 2)}
                  onChange={e => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      handleMergeFieldChange(key, parsed);
                    } catch (error) {
                      // Invalid JSON, ignore
                    }
                  }}
                  className="w-full p-2 text-xs border border-gray-300 rounded resize-none"
                  rows={3}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Conflict Resolution
          </h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {conflicts.length} conflicts
            </span>
            {conflicts.length > 0 && (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleAutoResolveAll('SERVER_WINS')}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Server Wins All
                </button>
                <button
                  onClick={() => handleAutoResolveAll('CLIENT_WINS')}
                  className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Local Wins All
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading conflicts...</p>
        </div>
      ) : conflicts.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No conflicts to resolve
        </div>
      ) : (
        <div className="p-4">
          {/* Conflict List */}
          <div className="space-y-4">
            {conflicts.map(conflict => {
              const description = getConflictDescription(conflict);

              return (
                <div
                  key={conflict.itemId}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        Conflict #{conflict.itemId.slice(-8)}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {description.conflictingFields} of{' '}
                        {description.totalFields} fields have conflicts
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() =>
                          setSelectedConflict(
                            selectedConflict?.itemId === conflict.itemId
                              ? null
                              : conflict
                          )
                        }
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        {selectedConflict?.itemId === conflict.itemId
                          ? 'Hide'
                          : 'View'}{' '}
                        Details
                      </button>
                    </div>
                  </div>

                  {/* Conflict Details */}
                  {selectedConflict?.itemId === conflict.itemId && (
                    <div className="space-y-6">
                      {/* Data Comparison */}
                      {renderDataComparison(conflict)}

                      {/* Resolution Strategy */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">
                          Resolution Strategy
                        </h4>
                        <div className="space-y-3">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="SERVER_WINS"
                              checked={resolutionStrategy === 'SERVER_WINS'}
                              onChange={e =>
                                setResolutionStrategy(e.target.value as any)
                              }
                              className="mr-2"
                            />
                            <span className="text-sm">
                              Server Wins (Use server version)
                            </span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="CLIENT_WINS"
                              checked={resolutionStrategy === 'CLIENT_WINS'}
                              onChange={e =>
                                setResolutionStrategy(e.target.value as any)
                              }
                              className="mr-2"
                            />
                            <span className="text-sm">
                              Local Wins (Use local version)
                            </span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="MERGE"
                              checked={resolutionStrategy === 'MERGE'}
                              onChange={e =>
                                setResolutionStrategy(e.target.value as any)
                              }
                              className="mr-2"
                            />
                            <span className="text-sm">
                              Merge (Combine both versions)
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Merge Editor */}
                      {resolutionStrategy === 'MERGE' &&
                        renderMergeEditor(conflict)}

                      {/* Resolution Actions */}
                      <div className="flex space-x-3 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => handleResolveConflict(conflict)}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Resolve Conflict
                        </button>
                        <button
                          onClick={() => {
                            setSelectedConflict(null);
                            setMergedData(null);
                            setResolutionStrategy('SERVER_WINS');
                          }}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
