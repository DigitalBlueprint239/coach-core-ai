// src/components/OptimisticLockingDemo.tsx
import React, { useState, useEffect } from 'react';
import { optimisticLockingTestManager, OptimisticLockingTestResult } from '../utils/optimistic-locking-test';
import { useAuth } from '../hooks/useAuth';

interface OptimisticLockingDemoProps {
  teamId: string;
}

export const OptimisticLockingDemo: React.FC<OptimisticLockingDemoProps> = ({ teamId }) => {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<OptimisticLockingTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedEntityType, setSelectedEntityType] = useState<'play' | 'practicePlan' | 'player' | 'team' | 'user'>('play');
  const [testReport, setTestReport] = useState<string>('');
  const [error, setError] = useState<string>('');

  const entityTypes = [
    { value: 'play', label: 'Play' },
    { value: 'practicePlan', label: 'Practice Plan' },
    { value: 'player', label: 'Player' },
    { value: 'team', label: 'Team' },
    { value: 'user', label: 'User Profile' }
  ];

  const runSingleEntityTest = async () => {
    if (!user) {
      setError('User must be authenticated to run tests');
      return;
    }

    setIsRunning(true);
    setError('');

    try {
      // Create a test entity first
      const testEntities = await optimisticLockingTestManager['createTestEntities'](teamId);
      const entityId = testEntities[selectedEntityType];

      if (!entityId) {
        throw new Error(`Failed to create test ${selectedEntityType}`);
      }

      const result = await optimisticLockingTestManager.testEntityOptimisticLocking(
        selectedEntityType,
        teamId,
        entityId
      );

      setTestResults([result]);
      setTestReport(optimisticLockingTestManager.generateTestReport());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsRunning(false);
    }
  };

  const runAllEntityTests = async () => {
    if (!user) {
      setError('User must be authenticated to run tests');
      return;
    }

    setIsRunning(true);
    setError('');

    try {
      const results = await optimisticLockingTestManager.testAllEntities(teamId);
      setTestResults(results);
      setTestReport(optimisticLockingTestManager.generateTestReport());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsRunning(false);
    }
  };

  const runConflictResolutionTests = async () => {
    if (!user) {
      setError('User must be authenticated to run tests');
      return;
    }

    setIsRunning(true);
    setError('');

    try {
      const results = await optimisticLockingTestManager.testConflictResolutionStrategies(teamId);
      setTestResults(results);
      setTestReport(optimisticLockingTestManager.generateTestReport());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
    setTestReport('');
    setError('');
    optimisticLockingTestManager.clearTestResults();
  };

  const getStatusColor = (success: boolean) => {
    return success ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (success: boolean) => {
    return success ? '✅' : '❌';
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Optimistic Locking Demo
        </h1>
        <p className="text-gray-600 mb-6">
          This demo tests the optimistic locking implementation across all entity types.
          Optimistic locking prevents data loss when multiple users edit the same document simultaneously.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">How Optimistic Locking Works:</h3>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• Each document has a version number that increments with each edit</li>
            <li>• When updating, the client must provide the expected version</li>
            <li>• If versions don't match, the update is rejected with a conflict error</li>
            <li>• This prevents silent overwrites of other users' changes</li>
            <li>• The system provides clear error messages for conflict resolution</li>
          </ul>
        </div>
      </div>

      {/* Test Controls */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Controls</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entity Type
            </label>
            <select
              value={selectedEntityType}
              onChange={(e) => setSelectedEntityType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isRunning}
            >
              {entityTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <button
            onClick={runSingleEntityTest}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? 'Running...' : 'Test Single Entity'}
          </button>
          
          <button
            onClick={runAllEntityTests}
            disabled={isRunning}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? 'Running...' : 'Test All Entities'}
          </button>
          
          <button
            onClick={runConflictResolutionTests}
            disabled={isRunning}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? 'Running...' : 'Test Conflict Resolution'}
          </button>
          
          <button
            onClick={clearResults}
            disabled={isRunning}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear Results
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-red-900 mb-2">Error</h3>
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Results</h2>
          
          <div className="space-y-4">
            {testResults.map((result, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{result.testName}</h3>
                  <span className={`font-semibold ${getStatusColor(result.success)}`}>
                    {getStatusIcon(result.success)} {result.success ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Duration:</span> {result.duration}ms
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Entity Type:</span> {result.details.entityType}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Operation:</span> {result.details.operation}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Conflict Detected:</span> 
                    <span className={result.details.conflictDetected ? 'text-green-600' : 'text-red-600'}>
                      {result.details.conflictDetected ? ' Yes' : ' No'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Resolution Strategy:</span> {result.details.resolutionStrategy}
                  </div>
                </div>
                
                {result.error && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                    <span className="font-medium text-red-800">Error:</span> {result.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Report */}
      {testReport && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Report</h2>
          <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
            {testReport}
          </pre>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
        <h3 className="font-semibold text-yellow-900 mb-2">Testing Instructions:</h3>
        <ol className="text-yellow-800 text-sm space-y-1 list-decimal list-inside">
          <li>Select an entity type to test optimistic locking for that specific entity</li>
          <li>Click "Test Single Entity" to test optimistic locking for the selected entity</li>
          <li>Click "Test All Entities" to test optimistic locking across all entity types</li>
          <li>Click "Test Conflict Resolution" to test different conflict resolution strategies</li>
          <li>Review the test results to see how conflicts are detected and handled</li>
          <li>Use "Clear Results" to reset the test state</li>
        </ol>
      </div>
    </div>
  );
}; 