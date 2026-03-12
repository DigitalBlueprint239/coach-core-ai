import type { CanonicalPlay } from '../../domains/canonicalPlay';
import type { IntelligenceIssue } from '../../contracts/intelligence';

const TIMING_THRESHOLD_MS = 600;

export const evaluateTiming = (play: CanonicalPlay): IntelligenceIssue[] => {
  return play.routeDefinitions
    .filter((route) => (route.timingWindowMs ?? TIMING_THRESHOLD_MS) > TIMING_THRESHOLD_MS)
    .map((route) => ({
      id: `timing-${route.entityId}`,
      severity: 'caution' as const,
      confidence: 0.79,
      type: 'timing-late-break',
      affectedEntities: [route.entityId],
      explanation: `${route.entityId} has a late break timing window of ${route.timingWindowMs}ms.`,
      quickFixes: ['Reduce stem depth', 'Sync with QB hitch count'],
      coachOnlyDetails: 'Late break can break progression rhythm in mirrored concepts.',
    }));
};
