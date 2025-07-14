/**
 * DebugPanel.js – Debug console for Smart Playbook
 * - Displays test results and debug information
 * - Optimized with React.memo for performance
 * - Enhanced accessibility and error handling
 */

import React, { memo, useCallback, useMemo } from 'react';
import { Bug, CheckCircle, XCircle, Play, Eye, EyeOff } from 'lucide-react';

// Constants for better maintainability
const PANEL_STYLES = {
  position: 'fixed',
  bottom: 20,
  right: 20,
  zIndex: 9999,
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: 18,
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
  minWidth: 300,
  maxWidth: 400,
  maxHeight: '80vh',
  overflow: 'auto'
};

const BUTTON_STYLES = {
  runAll: 'bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg mr-2 text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
  toggle: 'bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-lg text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2'
};

const RESULT_COLORS = {
  passed: '#16a34a',
  failed: '#dc2626',
  pending: '#f59e0b'
};

/**
 * Validate debug result object
 * @param {Object} result - Result object to validate
 * @returns {boolean} True if valid
 */
const validateResult = (result) => {
  return result && 
         typeof result === 'object' && 
         typeof result.name === 'string' && 
         typeof result.passed === 'boolean' &&
         typeof result.category === 'string';
};

/**
 * DebugPanel component for displaying test results and debug information
 * @param {Object} props - Component props
 * @param {Array} props.results - Array of test results
 * @param {Function} props.onRunAll - Function to run all tests
 * @param {Function} props.onTogglePassed - Function to toggle passed results visibility
 * @param {boolean} props.showPassed - Whether to show passed results
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Additional inline styles
 */
const DebugPanel = memo(({ 
  results = [], 
  onRunAll, 
  onTogglePassed, 
  showPassed = false,
  className = '',
  style = {},
  'data-testid': testId = 'debug-panel'
}) => {
  // Validate props
  if (!Array.isArray(results)) {
    console.error('DebugPanel: results must be an array');
    return null;
  }

  if (typeof onRunAll !== 'function') {
    console.error('DebugPanel: onRunAll must be a function');
    return null;
  }

  if (typeof onTogglePassed !== 'function') {
    console.error('DebugPanel: onTogglePassed must be a function');
    return null;
  }

  if (typeof showPassed !== 'boolean') {
    console.error('DebugPanel: showPassed must be a boolean');
    return null;
  }

  // Memoized event handlers for better performance
  const handleRunAll = useCallback((event) => {
    try {
      event.preventDefault();
      onRunAll();
    } catch (error) {
      console.error('Error running all tests:', error);
    }
  }, [onRunAll]);

  const handleTogglePassed = useCallback((event) => {
    try {
      event.preventDefault();
      onTogglePassed();
    } catch (error) {
      console.error('Error toggling passed results:', error);
    }
  }, [onTogglePassed]);

  // Memoized filtered results
  const filteredResults = useMemo(() => {
    return showPassed ? results : results.filter(result => !result.passed);
  }, [results, showPassed]);

  // Memoized statistics
  const stats = useMemo(() => {
    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = total - passed;
    
    return { total, passed, failed };
  }, [results]);

  // Memoized panel styles
  const panelStyle = useMemo(() => ({
    ...PANEL_STYLES,
    ...style
  }), [style]);

  return (
    <div 
      style={panelStyle}
      className={className}
      data-testid={testId}
      role="region"
      aria-label="Debug console"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <Bug size={18} className="mr-2 text-gray-600" aria-hidden="true" />
          <h3 className="font-bold text-gray-800 text-sm">Debug Console</h3>
        </div>
        <div className="text-xs text-gray-500">
          {stats.passed}/{stats.total} passed
        </div>
      </div>

      {/* Controls */}
      <div className="mb-3 flex flex-wrap gap-2">
        <button 
          onClick={handleRunAll}
          className={BUTTON_STYLES.runAll}
          aria-label="Run all tests"
          disabled={results.length === 0}
        >
          <Play size={14} className="inline mr-1" aria-hidden="true" />
          Run All
        </button>
        <button 
          onClick={handleTogglePassed}
          className={BUTTON_STYLES.toggle}
          aria-label={showPassed ? 'Hide passed tests' : 'Show all tests'}
        >
          {showPassed ? (
            <>
              <EyeOff size={14} className="inline mr-1" aria-hidden="true" />
              Hide Passed
            </>
          ) : (
            <>
              <Eye size={14} className="inline mr-1" aria-hidden="true" />
              Show All
            </>
          )}
        </button>
      </div>

      {/* Results List */}
      <div className="space-y-1">
        {filteredResults.length === 0 ? (
          <div className="text-gray-500 text-sm italic py-2 text-center">
            {results.length === 0 ? 'No tests available.' : 'No results to display.'}
          </div>
        ) : (
          <ul role="list" aria-label="Test results">
            {filteredResults.map((result, index) => {
              // Validate result object
              if (!validateResult(result)) {
                console.warn('Invalid result object:', result);
                return null;
              }

              return (
                <li 
                  key={result.id || index} 
                  className="flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-50 transition-colors duration-150"
                  role="listitem"
                >
                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {result.passed ? (
                      <CheckCircle 
                        color={RESULT_COLORS.passed} 
                        size={16} 
                        aria-label="Test passed"
                      />
                    ) : (
                      <XCircle 
                        color={RESULT_COLORS.failed} 
                        size={16} 
                        aria-label="Test failed"
                      />
                    )}
                  </div>

                  {/* Result Details */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-800 truncate block">
                      {result.name}
                    </span>
                    <span className="text-xs text-gray-400 block">
                      {result.category}
                    </span>
                  </div>

                  {/* Additional Info */}
                  {result.duration && (
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {result.duration}ms
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer Stats */}
      {results.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-200 text-xs text-gray-500">
          <div className="flex justify-between">
            <span>Total: {stats.total}</span>
            <span>Passed: {stats.passed}</span>
            <span>Failed: {stats.failed}</span>
          </div>
          {stats.total > 0 && (
            <div className="mt-1">
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div 
                  className="bg-green-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${(stats.passed / stats.total) * 100}%` }}
                  role="progressbar"
                  aria-valuenow={stats.passed}
                  aria-valuemin={0}
                  aria-valuemax={stats.total}
                  aria-label={`${stats.passed} out of ${stats.total} tests passed`}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// Add display name for better debugging
DebugPanel.displayName = 'DebugPanel';

export default DebugPanel;
