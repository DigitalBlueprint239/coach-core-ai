/**
 * ConceptBanner — displays the detected passing concept for the current play.
 * Renders nothing when no concept is detected.
 * Derives entirely from current play state — no extra state needed.
 */
import React, { memo, useMemo } from 'react';
import { detectConcepts } from '../../../services/conceptDetection';
import { toEnginePlay, SmartPlaybookPlayer, SmartPlaybookRoute } from '../../../utils/playbookBridge';

interface ConceptBannerProps {
  players: SmartPlaybookPlayer[];
  routes: SmartPlaybookRoute[];
}

const ConceptBanner = memo(({ players, routes }: ConceptBannerProps) => {
  const detected = useMemo(() => {
    if (!players || players.length === 0 || !routes || routes.length === 0) return [];
    const enginePlay = toEnginePlay(players, routes);
    return detectConcepts(enginePlay);
  }, [players, routes]);

  if (detected.length === 0) return null;

  const top = detected[0];

  return (
    <div
      className="bg-green-50 border-l-4 border-green-500 rounded-r-lg p-3 transition-all duration-200"
      data-testid="concept-banner"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg" role="img" aria-label="football">🏈</span>
        <span className="font-bold text-green-900 text-sm uppercase tracking-wide">
          {top.conceptName}
        </span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-200 text-green-800 font-medium">
          {top.confidence}
        </span>
      </div>
      <div className="flex flex-wrap gap-1 mb-1.5">
        {top.coverageBeaters.map((cov) => (
          <span
            key={cov}
            className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700"
          >
            Beats {cov.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        ))}
      </div>
      <p className="text-xs text-green-700 italic leading-snug">
        "{top.coachingCue}"
      </p>
    </div>
  );
});

ConceptBanner.displayName = 'ConceptBanner';

export default ConceptBanner;
