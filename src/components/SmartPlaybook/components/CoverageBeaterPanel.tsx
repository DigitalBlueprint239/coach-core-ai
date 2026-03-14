/**
 * CoverageBeaterPanel — ranks plays from the coach's playbook
 * against a selected defensive coverage shell.
 * Works 100% offline — no AI proxy, no network request.
 */
import React, { memo, useState, useMemo } from 'react';
import { Shield, ChevronDown } from 'lucide-react';
import { getPlaysVsCoverage, COVERAGE_SHELLS } from '../../../services/coverageBeater';
import { savedPlaysToEngine, SmartPlaybookSavedPlay } from '../../../utils/playbookBridge';
import { CoverageShell } from '../../../types/playbook';

interface CoverageBeaterPanelProps {
  savedPlays: SmartPlaybookSavedPlay[];
}

function scoreToStars(score: number): string {
  if (score >= 80) return '\u2605\u2605\u2605';
  if (score >= 50) return '\u2605\u2605';
  if (score >= 20) return '\u2605';
  return '';
}

const CoverageBeaterPanel = memo(({ savedPlays }: CoverageBeaterPanelProps) => {
  const [selectedCoverage, setSelectedCoverage] = useState<CoverageShell>('cover_2');
  const [isOpen, setIsOpen] = useState(true);

  const enginePlays = useMemo(() => savedPlaysToEngine(savedPlays), [savedPlays]);

  const recommendations = useMemo(
    () => getPlaysVsCoverage(enginePlays, selectedCoverage),
    [enginePlays, selectedCoverage],
  );

  const coverageLabel = COVERAGE_SHELLS.find((c) => c.id === selectedCoverage)?.label ?? selectedCoverage;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4" data-testid="coverage-beater-panel">
      <button
        className="w-full flex items-center justify-between mb-3"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
          <Shield size={16} className="text-blue-600" />
          Coverage Beater
        </h3>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div className="mb-3">
            <label className="block text-xs text-gray-500 mb-1">Opponent is showing:</label>
            <select
              value={selectedCoverage}
              onChange={(e) => setSelectedCoverage(e.target.value as CoverageShell)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              data-testid="coverage-select"
            >
              {COVERAGE_SHELLS.map((cov) => (
                <option key={cov.id} value={cov.id}>
                  {cov.label}
                </option>
              ))}
            </select>
          </div>

          {recommendations.length > 0 ? (
            <>
              <p className="text-xs text-gray-500 mb-2">Best plays from your playbook:</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recommendations.slice(0, 8).map((rec) => (
                  <div
                    key={rec.play.id}
                    className="p-2 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-yellow-500 text-xs font-mono">
                        {scoreToStars(rec.coverageBeaterScore)}
                      </span>
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {rec.play.name}
                      </span>
                    </div>
                    <div className="text-xs text-blue-600 font-medium mb-0.5">
                      {rec.detectedConcept}
                    </div>
                    {rec.reasoning && (
                      <p className="text-xs text-gray-500 italic leading-snug">
                        "{rec.reasoning}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-400">
                {recommendations.length} play{recommendations.length !== 1 ? 's' : ''} attack{' '}
                {coverageLabel}
              </p>
            </>
          ) : (
            <div className="text-center py-4 text-gray-400">
              <p className="text-sm">No plays in your playbook attack {coverageLabel}.</p>
              <p className="text-xs mt-1">Try adding Smash or Flood concepts.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
});

CoverageBeaterPanel.displayName = 'CoverageBeaterPanel';

export default CoverageBeaterPanel;
