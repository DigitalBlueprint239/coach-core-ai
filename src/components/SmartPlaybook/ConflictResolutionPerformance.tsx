import React, { useState, useEffect } from 'react';
import { updatePlay, getPlays, savePlay, type Play } from '../../../services/firestore';
import { useAuth } from '../../../hooks/useAuth';

interface PerformanceMetrics {
  transactionTime: number;
  conflictDetectionTime: number;
  mergeTime: number;
  totalOperations: number;
  conflictsDetected: number;
  averageResponseTime: number;
}

interface PerformanceTest {
  name: string;
  description: string;
  runTest: () => Promise<PerformanceMetrics>;
}

export const ConflictResolutionPerformance: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [running, setRunning] = useState(false);
  const [testResults, setTestResults] = useState<Array<{ test: string; metrics: PerformanceMetrics }>>([]);

  const generateTestPlay = (index: number): Omit<Play, 'id' | 'teamId' | 'createdAt' | 'updatedAt' | 'createdBy'> => ({
    name: `Performance Test Play ${index}`,
    formation: '4-3-3',
    description: `Test description for play ${index}`,
    routes: [],
    players: [],
    tags: [`test-${index}`, 'performance'],
    difficulty: 'intermediate',
    sport: 'football',
    level: 'varsity'
  });

  const performanceTests: PerformanceTest[] = [
    {
      name: 'Single Update Performance',
      description: 'Measure time for a single play update without conflicts',
      runTest: async (): Promise<PerformanceMetrics> => {
        const startTime = performance.now();
        let totalOperations = 0;
        let conflictsDetected = 0;

        // Create a test play
        const playData = generateTestPlay(1);
        const playId = await savePlay('test-team', playData);

        // Perform multiple updates
        for (let i = 0; i < 10; i++) {
          const updateStart = performance.now();
          try {
            await updatePlay('test-team', playId, {
              name: `Updated Play ${i}`,
              description: `Updated description ${i}`
            });
            totalOperations++;
          } catch (error) {
            if (error instanceof Error && error.message.includes('modified by another user')) {
              conflictsDetected++;
            }
          }
          const updateEnd = performance.now();
        }

        const endTime = performance.now();
        const totalTime = endTime - startTime;

        return {
          transactionTime: totalTime / totalOperations,
          conflictDetectionTime: 0,
          mergeTime: 0,
          totalOperations,
          conflictsDetected,
          averageResponseTime: totalTime / totalOperations
        };
      }
    },

    {
      name: 'Concurrent Update Simulation',
      description: 'Simulate concurrent updates to measure conflict detection performance',
      runTest: async (): Promise<PerformanceMetrics> => {
        const startTime = performance.now();
        let totalOperations = 0;
        let conflictsDetected = 0;
        let conflictDetectionTime = 0;
        let mergeTime = 0;

        // Create a test play
        const playData = generateTestPlay(2);
        const playId = await savePlay('test-team', playData);

        // Simulate concurrent updates
        const promises = Array.from({ length: 5 }, async (_, i) => {
          const updateStart = performance.now();
          try {
            await updatePlay('test-team', playId, {
              name: `Concurrent Update ${i}`,
              description: `Concurrent description ${i}`
            });
            totalOperations++;
          } catch (error) {
            if (error instanceof Error && error.message.includes('modified by another user')) {
              conflictsDetected++;
              const conflictStart = performance.now();
              // Simulate conflict resolution time
              await new Promise(resolve => setTimeout(resolve, 50));
              const conflictEnd = performance.now();
              conflictDetectionTime += conflictEnd - conflictStart;
            }
          }
          const updateEnd = performance.now();
        });

        await Promise.all(promises);
        const endTime = performance.now();
        const totalTime = endTime - startTime;

        return {
          transactionTime: totalTime / totalOperations,
          conflictDetectionTime: conflictDetectionTime / conflictsDetected || 0,
          mergeTime: mergeTime / conflictsDetected || 0,
          totalOperations,
          conflictsDetected,
          averageResponseTime: totalTime / totalOperations
        };
      }
    },

    {
      name: 'Bulk Operations Performance',
      description: 'Test performance with multiple plays and operations',
      runTest: async (): Promise<PerformanceMetrics> => {
        const startTime = performance.now();
        let totalOperations = 0;
        let conflictsDetected = 0;

        // Create multiple test plays
        const playIds: string[] = [];
        for (let i = 0; i < 5; i++) {
          const playData = generateTestPlay(i + 3);
          const playId = await savePlay('test-team', playData);
          playIds.push(playId);
        }

        // Perform bulk operations
        const operations = playIds.flatMap(playId => 
          Array.from({ length: 3 }, (_, i) => ({
            playId,
            update: {
              name: `Bulk Update ${i}`,
              description: `Bulk description ${i}`
            }
          }))
        );

        for (const operation of operations) {
          try {
            await updatePlay('test-team', operation.playId, operation.update);
            totalOperations++;
          } catch (error) {
            if (error instanceof Error && error.message.includes('modified by another user')) {
              conflictsDetected++;
            }
          }
        }

        const endTime = performance.now();
        const totalTime = endTime - startTime;

        return {
          transactionTime: totalTime / totalOperations,
          conflictDetectionTime: 0,
          mergeTime: 0,
          totalOperations,
          conflictsDetected,
          averageResponseTime: totalTime / totalOperations
        };
      }
    },

    {
      name: 'Merge Performance Test',
      description: 'Test performance of merge operations with complex data',
      runTest: async (): Promise<PerformanceMetrics> => {
        const startTime = performance.now();
        let totalOperations = 0;
        let conflictsDetected = 0;
        let mergeTime = 0;

        // Create a test play with complex data
        const playData = generateTestPlay(8);
        const playId = await savePlay('test-team', playData);

        // Simulate complex merge scenarios
        for (let i = 0; i < 10; i++) {
          const mergeStart = performance.now();
          try {
            await updatePlay('test-team', playId, {
              name: `Merge Test ${i}`,
              description: `Complex description with lots of text ${i}`.repeat(10),
              tags: Array.from({ length: 20 }, (_, j) => `tag-${i}-${j}`),
              difficulty: i % 2 === 0 ? 'beginner' : 'advanced'
            });
            totalOperations++;
          } catch (error) {
            if (error instanceof Error && error.message.includes('modified by another user')) {
              conflictsDetected++;
              // Simulate merge operation time
              await new Promise(resolve => setTimeout(resolve, 100));
              const mergeEnd = performance.now();
              mergeTime += mergeEnd - mergeStart;
            }
          }
        }

        const endTime = performance.now();
        const totalTime = endTime - startTime;

        return {
          transactionTime: totalTime / totalOperations,
          conflictDetectionTime: 0,
          mergeTime: mergeTime / conflictsDetected || 0,
          totalOperations,
          conflictsDetected,
          averageResponseTime: totalTime / totalOperations
        };
      }
    }
  ];

  const runAllTests = async () => {
    if (!user) return;

    setRunning(true);
    setTestResults([]);

    const results: Array<{ test: string; metrics: PerformanceMetrics }> = [];

    for (const test of performanceTests) {
      try {
        console.log(`Running test: ${test.name}`);
        const metrics = await test.runTest();
        results.push({ test: test.name, metrics });
        setTestResults([...results]);
      } catch (error) {
        console.error(`Test failed: ${test.name}`, error);
      }
    }

    setRunning(false);
  };

  const runSingleTest = async (test: PerformanceTest) => {
    if (!user) return;

    setRunning(true);
    try {
      const metrics = await test.runTest();
      setMetrics(metrics);
      setTestResults([{ test: test.name, metrics }]);
    } catch (error) {
      console.error(`Test failed: ${test.name}`, error);
    }
    setRunning(false);
  };

  const formatTime = (ms: number): string => {
    if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Conflict Resolution Performance Testing
        </h1>
        <p className="text-gray-600 mb-6">
          This utility measures the performance of the conflict resolution system
          and provides benchmarks for different scenarios.
        </p>
      </div>

      {/* Test Controls */}
      <div className="mb-8">
        <div className="flex space-x-4 mb-4">
          <button
            onClick={runAllTests}
            disabled={running || !user}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {running ? 'Running Tests...' : 'Run All Tests'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {performanceTests.map((test, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">{test.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{test.description}</p>
              <button
                onClick={() => runSingleTest(test)}
                disabled={running || !user}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 text-sm"
              >
                Run Test
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Results */}
      {testResults.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Test Results</h2>
          
          {testResults.map((result, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{result.test}</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatTime(result.metrics.averageResponseTime)}
                  </div>
                  <div className="text-sm text-gray-600">Avg Response Time</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {result.metrics.totalOperations}
                  </div>
                  <div className="text-sm text-gray-600">Total Operations</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {result.metrics.conflictsDetected}
                  </div>
                  <div className="text-sm text-gray-600">Conflicts Detected</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatTime(result.metrics.transactionTime)}
                  </div>
                  <div className="text-sm text-gray-600">Transaction Time</div>
                </div>
              </div>

              {result.metrics.conflictsDetected > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-orange-600">
                      {formatTime(result.metrics.conflictDetectionTime)}
                    </div>
                    <div className="text-sm text-gray-600">Conflict Detection Time</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-lg font-semibold text-indigo-600">
                      {formatTime(result.metrics.mergeTime)}
                    </div>
                    <div className="text-sm text-gray-600">Merge Operation Time</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Performance Guidelines */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Performance Guidelines</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <h4 className="font-medium mb-2">Target Metrics:</h4>
            <ul className="space-y-1">
              <li>• Average response time: &lt; 200ms</li>
              <li>• Transaction time: &lt; 100ms</li>
              <li>• Conflict detection: &lt; 50ms</li>
              <li>• Merge operations: &lt; 150ms</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Optimization Tips:</h4>
            <ul className="space-y-1">
              <li>• Use debouncing for rapid updates</li>
              <li>• Implement retry logic for network issues</li>
              <li>• Cache frequently accessed data</li>
              <li>• Monitor transaction overhead</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConflictResolutionPerformance; 