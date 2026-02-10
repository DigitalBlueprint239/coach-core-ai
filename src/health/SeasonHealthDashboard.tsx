import React, { useMemo, useState } from 'react';
import { HealthSignal, HealthSignalAction } from './healthTypes';

export type HealthFilter = 'all' | 'critical' | 'week';

interface SeasonHealthDashboardProps {
  signals: HealthSignal[];
  onAction: (signal: HealthSignal, action: HealthSignalAction) => void;
}

const severityBadgeClass: Record<HealthSignal['severity'], string> = {
  info: 'bg-blue-100 text-blue-700',
  warn: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700'
};

export const SeasonHealthDashboard: React.FC<SeasonHealthDashboardProps> = ({ signals, onAction }) => {
  const [filter, setFilter] = useState<HealthFilter>('all');

  const visibleSignals = useMemo(() => {
    if (filter === 'critical') return signals.filter((signal) => signal.severity === 'critical');
    if (filter === 'week') {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return signals.filter((signal) => signal.detectedAt >= weekAgo);
    }
    return signals;
  }, [filter, signals]);

  return (
    <section className="bg-white rounded-lg shadow p-4" data-testid="season-health-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Season Health</h2>
          <p className="text-sm text-gray-600">Top anomalies with one-click fixes.</p>
        </div>
        <div className="inline-flex rounded-md border overflow-hidden" role="group" aria-label="Season health filters">
          <button className={`px-3 py-1.5 text-sm ${filter === 'all' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700'}`} onClick={() => setFilter('all')}>All</button>
          <button className={`px-3 py-1.5 text-sm border-l ${filter === 'critical' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700'}`} onClick={() => setFilter('critical')}>Critical</button>
          <button className={`px-3 py-1.5 text-sm border-l ${filter === 'week' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700'}`} onClick={() => setFilter('week')}>This Week</button>
        </div>
      </div>

      {visibleSignals.length === 0 ? (
        <p className="text-sm text-gray-500">No signals for this filter.</p>
      ) : (
        <ul className="space-y-2" data-testid="season-health-list">
          {visibleSignals.slice(0, 12).map((signal) => (
            <li key={signal.id} className="border rounded-md p-3">
              <div className="flex flex-wrap gap-2 justify-between items-start">
                <div>
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${severityBadgeClass[signal.severity]}`}>{signal.severity.toUpperCase()}</span>
                  <h3 className="font-medium text-gray-900 mt-1">{signal.title}</h3>
                  <p className="text-sm text-gray-600">{signal.description}</p>
                </div>
                <div className="flex gap-2">
                  {signal.recommendedAction && (
                    <button
                      className="text-sm bg-blue-600 text-white rounded px-3 py-1.5 hover:bg-blue-700"
                      onClick={() => onAction(signal, signal.recommendedAction!)}
                    >
                      {signal.recommendedAction.label}
                    </button>
                  )}
                  <button
                    className="text-sm bg-gray-100 text-gray-700 rounded px-3 py-1.5 hover:bg-gray-200"
                    onClick={() => onAction(signal, { type: 'MARK_SIGNAL_RESOLVED', label: 'Mark resolved' })}
                  >
                    Mark resolved
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default SeasonHealthDashboard;
