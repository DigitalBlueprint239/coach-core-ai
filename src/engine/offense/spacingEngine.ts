// Offensive Engine Spacing Engine
// DO NOT MODIFY

import { SpacingRule, Formation } from './schema';

export interface SpacingViolation {
  rule_id: string;
  parameter: string;
  actual_value: number;
  violation_outcome: string;
  correction: string;
}

export function checkSpacingViolations(
  formation: Formation,
  spacingRules: SpacingRule[],
): SpacingViolation[] {
  const violations: SpacingViolation[] = [];

  for (const rule of spacingRules) {
    if (rule.parameter === 'horizontal_separation_yards') {
      const splits = formation.spacing.wr_splits;
      for (let i = 0; i < splits.length - 1; i++) {
        const separation = Math.abs(splits[i + 1] - splits[i]);
        if (separation < rule.min_value || separation > rule.max_value) {
          violations.push({
            rule_id: rule.rule_id,
            parameter: rule.parameter,
            actual_value: separation,
            violation_outcome: rule.violation_outcome,
            correction: rule.correction,
          });
          break; // Report once per rule
        }
      }
    }
  }

  return violations;
}

export function getOptimalSplits(
  receiverCount: number,
  fieldWidth: number = 53.3,
): number[] {
  const splits: number[] = [];
  const baseWidth = fieldWidth / (receiverCount + 1);
  for (let i = 0; i < receiverCount; i++) {
    splits.push(Math.round(baseWidth * 10) / 10);
  }
  return splits;
}
