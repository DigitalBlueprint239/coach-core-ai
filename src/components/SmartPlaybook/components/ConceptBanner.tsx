import React, { useMemo } from 'react';
import { detectConcept } from '../../../engine/offense';
import { loadOffensiveEngineData } from '../../../engine/offense';
import type { PlayRouteInstance } from '../../../engine/offense';

interface RouteShape {
  id: string;
  playerId: string;
  label?: string;
  type?: string;
}

interface ConceptBannerProps {
  routes: RouteShape[];
}

const ConceptBanner: React.FC<ConceptBannerProps> = ({ routes }) => {
  const detected = useMemo(() => {
    if (routes.length === 0) return null;

    // Build PlayRouteInstance list from labeled routes
    const playRoutes: PlayRouteInstance[] = routes
      .filter(r => r.label)
      .map(r => ({ playerId: r.playerId, routeName: r.label! }));

    if (playRoutes.length === 0) return null;

    const { concepts } = loadOffensiveEngineData();
    return detectConcept(playRoutes, concepts);
  }, [routes]);

  if (!detected) return null;

  const { concept } = detected;

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🏈</span>
        <div>
          <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
            Concept Detected
          </span>
          <span className="ml-2 text-sm font-semibold text-indigo-900">
            {concept.concept_name}
          </span>
        </div>
      </div>
      <p className="text-xs text-indigo-700 mt-1">{concept.coaching_cue}</p>
    </div>
  );
};

export default ConceptBanner;
