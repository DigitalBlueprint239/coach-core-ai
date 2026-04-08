import type { CanonicalPlay } from '../../domains/canonicalPlay';
import type { IntelligenceIssue, IntelligenceRecommendation } from '../../contracts/intelligence';

export const rankSmartRouting = (
  play: CanonicalPlay,
  issues: IntelligenceIssue[],
): IntelligenceRecommendation[] => {
  const routeCount = play.routeDefinitions.length || 1;

  return issues
    .filter((issue) => issue.type === 'spacing-compression' || issue.type === 'timing-late-break')
    .map((issue, index) => ({
      id: `sr-${issue.id}`,
      type: 'route-adjustment',
      confidence: Math.min(0.95, issue.confidence + 0.05),
      action: issue.type === 'spacing-compression' ? 'Widen receiver split' : 'Shorten route stem',
      target: issue.affectedEntities[0] ?? 'offense',
      metadata: {
        priority: routeCount - index,
        sourceIssue: issue.id,
      },
    }))
    .sort((a, b) => Number((b.metadata.priority as number) ?? 0) - Number((a.metadata.priority as number) ?? 0));
};
