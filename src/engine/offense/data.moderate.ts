import { Formation, Route, Concept, SpacingRule, TimingRule } from './schema';

export const formations: Formation[] = [
  {
    formation_id: 'trips_left_11_engine',
    formation_name: 'Trips Left (Engine)',
    personnel: '11',
    alignment: {
      left_side: ['Z', 'Y', 'H'],
      right_side: ['X'],
      backfield: ['RB'],
    },
    spacing: {
      wr_splits: [5, 7, 12],
      ol_splits: [1.2, 1.2, 1.2, 1.2],
      rb_depth: 5.5,
    },
    strength: 'left',
    coverage_stress_points: ['trips_overload', 'boundary_isolation'],
  },
  {
    formation_id: 'doubles_right_11_engine',
    formation_name: 'Doubles Right (Engine)',
    personnel: '11',
    alignment: {
      left_side: ['X', 'H'],
      right_side: ['Y', 'Z'],
      backfield: ['RB'],
    },
    spacing: {
      wr_splits: [6, 12, 6, 12],
      ol_splits: [1.2, 1.2, 1.2, 1.2],
      rb_depth: 5.5,
    },
    strength: 'balanced',
    coverage_stress_points: ['horizontal_stretch', 'middle_read'],
  },
  {
    formation_id: 'empty_right_10_engine',
    formation_name: 'Empty Right (Engine)',
    personnel: '10',
    alignment: {
      left_side: ['X', 'H'],
      right_side: ['Y', 'Z', 'RB'],
      backfield: [],
    },
    spacing: {
      wr_splits: [6, 12, 4, 8, 14],
      ol_splits: [1.2, 1.2, 1.2, 1.2],
      rb_depth: 0,
    },
    strength: 'right',
    coverage_stress_points: ['five_wide_spread', 'quick_game_isolation'],
  },
];

export const routes: Route[] = [
  {
    route_id: 'slant_5',
    route_number: 2,
    route_name: 'Slant',
    depth_yards: 5,
    break_direction: 'inside',
    stem: 'vertical_3_steps',
    timing_second: 1.8,
    release_type: 'inside_aggressive',
    key_coaching_points: ['attack_inside_leverage', 'flatten_at_5'],
    effective_vs_coverage: ['man', 'off_man'],
  },
  {
    route_id: 'hitch_5',
    route_number: 0,
    route_name: 'Hitch',
    depth_yards: 5,
    break_direction: 'stop',
    stem: 'vertical_3_steps',
    timing_second: 1.6,
    tags: ['quick', 'short'],
  },
  {
    route_id: 'go_9',
    route_number: 9,
    route_name: 'Go',
    depth_yards: 20,
    break_direction: 'vertical',
    stem: 'vertical_release',
    timing_second: 3.5,
    tags: ['deep', 'man_beater'],
  },
  {
    route_id: 'corner_10',
    route_number: 7,
    route_name: 'Corner',
    depth_yards: 10,
    break_direction: 'outside',
    stem: 'vertical_5_steps',
    timing_second: 2.8,
    tags: ['deep', 'zone_beater'],
  },
  {
    route_id: 'shallow_cross_5',
    route_name: 'Shallow Cross',
    route_number: 1,
    depth_yards: 3,
    break_direction: 'inside',
    stem: 'horizontal',
    timing_second: 2.5,
    tags: ['mesh', 'man_beater'],
  },
];

export const concepts: Concept[] = [
  {
    concept_id: 'mesh_core',
    concept_name: 'Mesh',
    core_routes: [
      { player: 'any_slot', route: 'shallow_cross_5', depth: 3 },
      { player: 'any_slot', route: 'shallow_cross_5', depth: 3 },
    ],
    spacing: { triangle_concept: true },
    read_progression: ['shallow', 'shallow', 'otb_route'],
    key_defenders: ['mike_linebacker', 'strong_safety'],
    best_vs: ['man_coverage', 'tampa_2'],
    coaching_cue:
      'Read the mesh: shallow cross vs man, sit in zone voids vs spot drops.',
  },
  {
    concept_id: 'smash_core',
    concept_name: 'Smash',
    core_routes: [
      { player: 'outside_wr', route: 'hitch_5', depth: 5 },
      { player: 'slot_wr', route: 'corner_10', depth: 10 },
    ],
    spacing: { vertical_separation: [5, 10] },
    key_defenders: ['cornerback'],
    coaching_cue:
      'High-Low the corner. If he sinks, hit the hitch. If he squats, throw the corner.',
  },
  {
    concept_id: 'four_verts',
    concept_name: 'Four Verticals',
    core_routes: [
      { player: 'any', route: 'go_9', depth: 20 },
      { player: 'any', route: 'go_9', depth: 20 },
      { player: 'any', route: 'go_9', depth: 20 },
      { player: 'any', route: 'go_9', depth: 20 },
    ],
    coaching_cue:
      'Stretch the defense vertically. Seam readers must identify safety rotation.',
  },
];

export const spacingRules: SpacingRule[] = [
  {
    rule_id: 'vertical_spacing_standard',
    rule_type: 'spacing_constraint',
    parameter: 'vertical_separation_yards',
    min_value: 4,
    max_value: 6,
    violation_outcome: 'route_convergence',
    correction: 'separate_routes_by_depth_4_to_6_yards',
  },
];

export const timingRules: TimingRule[] = [
  {
    timing_id: 'three_step_quick_game',
    drop_type: 'three_step',
    drop_duration_seconds: 2.0,
    route_numbers_allowed: [0, 1, 2, 5],
  },
];
