import { Formation, Route, Concept, SpacingRule, TimingRule } from './schema';

export function validateFormation(f: Formation): string[] {
  const errors: string[] = [];
  if (!f.formation_id) errors.push('missing formation_id');
  if (!f.formation_name) errors.push('missing formation_name');
  if (!f.alignment.left_side && !f.alignment.right_side) {
    errors.push('formation has no receivers');
  }
  if (!f.spacing.wr_splits || f.spacing.wr_splits.length === 0) {
    errors.push('formation has no wr_splits');
  }
  return errors;
}

export function validateRoute(r: Route): string[] {
  const errors: string[] = [];
  if (!r.route_id) errors.push('missing route_id');
  if (r.route_number < 0 || r.route_number > 9) {
    errors.push('route_number must be 0–9');
  }
  if (r.depth_yards <= 0) {
    errors.push('depth_yards must be positive');
  }
  return errors;
}

export function validateConcept(c: Concept): string[] {
  const errors: string[] = [];
  if (!c.concept_id) errors.push('missing concept_id');
  if (!c.concept_name) errors.push('missing concept_name');
  if (!c.core_routes || c.core_routes.length === 0) {
    errors.push('concept has no core_routes');
  }
  return errors;
}

export function validateSpacingRule(rule: SpacingRule): string[] {
  const errors: string[] = [];
  if (rule.min_value < 0 || rule.max_value <= rule.min_value) {
    errors.push('invalid spacing range');
  }
  return errors;
}

export function validateTimingRule(rule: TimingRule): string[] {
  const errors: string[] = [];
  if (rule.drop_duration_seconds <= 0) {
    errors.push('invalid drop_duration_seconds');
  }
  return errors;
}
