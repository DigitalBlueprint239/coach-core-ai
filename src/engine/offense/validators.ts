// Offensive Engine Validators
// DO NOT MODIFY

import { Route, Formation, Concept, TimingRule, SpacingRule } from './schema';

export function validateRoute(route: Route): string[] {
  const errors: string[] = [];

  if (!route.route_id || typeof route.route_id !== 'string') {
    errors.push('route_id is required and must be a string');
  }
  if (typeof route.route_number !== 'number') {
    errors.push('route_number must be a number');
  }
  if (!route.route_name || typeof route.route_name !== 'string') {
    errors.push('route_name is required and must be a string');
  }
  if (typeof route.depth_yards !== 'number' || route.depth_yards < 0) {
    errors.push('depth_yards must be a non-negative number');
  }
  if (!route.break_direction || typeof route.break_direction !== 'string') {
    errors.push('break_direction is required');
  }
  if (!route.stem || typeof route.stem !== 'string') {
    errors.push('stem is required');
  }
  if (typeof route.timing_second !== 'number' || route.timing_second <= 0) {
    errors.push('timing_second must be a positive number');
  }
  if (!route.release_type || typeof route.release_type !== 'string') {
    errors.push('release_type is required');
  }
  if (!Array.isArray(route.key_coaching_points)) {
    errors.push('key_coaching_points must be an array');
  }
  if (!Array.isArray(route.effective_vs_coverage)) {
    errors.push('effective_vs_coverage must be an array');
  }
  if (!Array.isArray(route.weak_vs_coverage)) {
    errors.push('weak_vs_coverage must be an array');
  }
  if (!Array.isArray(route.tags)) {
    errors.push('tags must be an array');
  }

  return errors;
}

export function validateFormation(formation: Formation): string[] {
  const errors: string[] = [];

  if (!formation.formation_id || typeof formation.formation_id !== 'string') {
    errors.push('formation_id is required and must be a string');
  }
  if (!formation.formation_name || typeof formation.formation_name !== 'string') {
    errors.push('formation_name is required and must be a string');
  }
  if (!formation.personnel || typeof formation.personnel !== 'string') {
    errors.push('personnel is required');
  }
  if (!formation.alignment || typeof formation.alignment !== 'object') {
    errors.push('alignment is required');
  } else {
    if (!Array.isArray(formation.alignment.left_side)) {
      errors.push('alignment.left_side must be an array');
    }
    if (!Array.isArray(formation.alignment.right_side)) {
      errors.push('alignment.right_side must be an array');
    }
    if (!Array.isArray(formation.alignment.backfield)) {
      errors.push('alignment.backfield must be an array');
    }
  }
  if (!formation.spacing || typeof formation.spacing !== 'object') {
    errors.push('spacing is required');
  } else {
    if (!Array.isArray(formation.spacing.wr_splits)) {
      errors.push('spacing.wr_splits must be an array');
    }
    if (!Array.isArray(formation.spacing.ol_splits)) {
      errors.push('spacing.ol_splits must be an array');
    }
    if (typeof formation.spacing.rb_depth !== 'number') {
      errors.push('spacing.rb_depth must be a number');
    }
  }
  if (!formation.strength || typeof formation.strength !== 'string') {
    errors.push('strength is required');
  }
  if (!Array.isArray(formation.coverage_stress_points)) {
    errors.push('coverage_stress_points must be an array');
  }

  return errors;
}

export function validateConcept(concept: Concept): string[] {
  const errors: string[] = [];

  if (!concept.concept_id || typeof concept.concept_id !== 'string') {
    errors.push('concept_id is required and must be a string');
  }
  if (!concept.concept_name || typeof concept.concept_name !== 'string') {
    errors.push('concept_name is required and must be a string');
  }
  if (!Array.isArray(concept.core_routes) || concept.core_routes.length === 0) {
    errors.push('core_routes must be a non-empty array');
  } else {
    concept.core_routes.forEach((cr, i) => {
      if (!cr.player) errors.push(`core_routes[${i}].player is required`);
      if (!cr.route) errors.push(`core_routes[${i}].route is required`);
      if (typeof cr.depth !== 'number') errors.push(`core_routes[${i}].depth must be a number`);
    });
  }
  if (!concept.spacing || typeof concept.spacing !== 'object') {
    errors.push('spacing is required');
  }
  if (!Array.isArray(concept.read_progression)) {
    errors.push('read_progression must be an array');
  }
  if (!Array.isArray(concept.key_defenders)) {
    errors.push('key_defenders must be an array');
  }
  if (!Array.isArray(concept.best_vs)) {
    errors.push('best_vs must be an array');
  }
  if (!Array.isArray(concept.weak_vs)) {
    errors.push('weak_vs must be an array');
  }
  if (!concept.qb_key || typeof concept.qb_key !== 'string') {
    errors.push('qb_key is required');
  }
  if (!concept.coaching_cue || typeof concept.coaching_cue !== 'string') {
    errors.push('coaching_cue is required');
  }

  return errors;
}

export function validateTimingRule(rule: TimingRule): string[] {
  const errors: string[] = [];

  if (!rule.timing_id || typeof rule.timing_id !== 'string') {
    errors.push('timing_id is required');
  }
  if (!rule.drop_type || typeof rule.drop_type !== 'string') {
    errors.push('drop_type is required');
  }
  if (typeof rule.drop_duration_seconds !== 'number' || rule.drop_duration_seconds <= 0) {
    errors.push('drop_duration_seconds must be a positive number');
  }
  if (!Array.isArray(rule.route_numbers_allowed)) {
    errors.push('route_numbers_allowed must be an array');
  }

  return errors;
}

export function validateSpacingRule(rule: SpacingRule): string[] {
  const errors: string[] = [];

  if (!rule.rule_id || typeof rule.rule_id !== 'string') {
    errors.push('rule_id is required');
  }
  if (!rule.rule_type || typeof rule.rule_type !== 'string') {
    errors.push('rule_type is required');
  }
  if (!rule.parameter || typeof rule.parameter !== 'string') {
    errors.push('parameter is required');
  }
  if (typeof rule.min_value !== 'number') {
    errors.push('min_value must be a number');
  }
  if (typeof rule.max_value !== 'number') {
    errors.push('max_value must be a number');
  }
  if (!rule.violation_outcome || typeof rule.violation_outcome !== 'string') {
    errors.push('violation_outcome is required');
  }
  if (!rule.correction || typeof rule.correction !== 'string') {
    errors.push('correction is required');
  }

  return errors;
}
