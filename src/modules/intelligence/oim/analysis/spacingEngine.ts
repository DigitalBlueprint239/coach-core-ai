import type { CanonicalPlay } from '../../domains/canonicalPlay';
import type { IntelligenceIssue } from '../../contracts/intelligence';

const MIN_HORIZONTAL_SPACING = 3;

export const evaluateSpacing = (play: CanonicalPlay): IntelligenceIssue[] => {
  const sorted = [...play.alignments].sort((a, b) => a.x - b.x);
  const issues: IntelligenceIssue[] = [];

  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1];
    const current = sorted[i];
    const spacing = current.x - previous.x;

    if (spacing < MIN_HORIZONTAL_SPACING) {
      issues.push({
        id: `spacing-${previous.entityId}-${current.entityId}`,
        severity: spacing < 2 ? 'critical' : 'caution',
        confidence: spacing < 2 ? 0.9 : 0.82,
        type: 'spacing-compression',
        affectedEntities: [previous.entityId, current.entityId],
        explanation: `Horizontal spacing between ${previous.entityId} and ${current.entityId} is ${spacing.toFixed(1)} yards.`,
        quickFixes: ['Widen split by 1-2 yards', 'Adjust reduced split landmark'],
        coachOnlyDetails: 'Compression may cap route stem leverage against match coverage.',
      });
    }
  }

  return issues;
};
