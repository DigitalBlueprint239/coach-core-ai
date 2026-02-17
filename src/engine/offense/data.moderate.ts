/**
 * data.moderate.ts - Route, concept, spacing, and timing definitions
 * All 12 core routes, 9 concepts, spacing rules, and timing rules.
 * Football data sourced from 124+ coaching resources.
 */

import { RouteDef, ConceptDef, SpacingRule, TimingRule } from './schema';

// ============================================
// ROUTE DEFINITIONS (12 Core Routes)
// ============================================

export const routes: RouteDef[] = [
  // Route 0 - Screen/Bubble
  {
    route_id: 'screen_0',
    route_number: 0,
    route_name: 'Screen',
    depth_yards: 0,
    break_direction: 'outside',
    stem: 'lateral_release',
    timing_second: 1.5,
    release_type: 'lateral',
    key_coaching_points: ['eyes_to_qb_immediately', 'get_width_before_depth', 'set_up_blockers'],
    effective_vs_coverage: ['man', 'blitz'],
    tags: ['quick', 'screen', 'rpo_eligible'],
  },
  // Route 1 - Flat
  {
    route_id: 'flat_1',
    route_number: 1,
    route_name: 'Flat',
    depth_yards: 2,
    break_direction: 'outside',
    stem: 'immediate_outside',
    timing_second: 1.5,
    release_type: 'outside_quick',
    key_coaching_points: ['quick_break_no_drift_upfield', 'aim_bottom_of_numbers', 'rb_te_escape_route'],
    effective_vs_coverage: ['zone', 'blitz'],
    weak_vs_coverage: ['man_press'],
    tags: ['quick', 'short', 'rb_route', 'te_route'],
  },
  // Route 2 - Slant
  {
    route_id: 'slant_2',
    route_number: 2,
    route_name: 'Slant',
    depth_yards: 5,
    break_direction: 'inside',
    stem: 'vertical_3_steps',
    timing_second: 2.0,
    release_type: 'inside',
    key_coaching_points: ['three_step_break', 'inside_shoulder_target', 'run_through_the_catch'],
    effective_vs_coverage: ['man', 'off_coverage'],
    weak_vs_coverage: ['press_man', 'pattern_match'],
    tags: ['quick', 'man_beater'],
  },
  // Route 3 - Comeback
  {
    route_id: 'comeback_3',
    route_number: 3,
    route_name: 'Comeback',
    depth_yards: 14,
    break_direction: 'outside',
    stem: 'vertical_7_steps',
    timing_second: 3.2,
    release_type: 'outside_stem',
    key_coaching_points: ['sell_vertical_threat', 'break_back_to_sideline', 'timing_dependent', 'db_leverage_win'],
    effective_vs_coverage: ['off_man', 'cover_3'],
    weak_vs_coverage: ['press_man'],
    tags: ['intermediate', 'timing', 'boundary_route'],
  },
  // Route 4 - Curl
  {
    route_id: 'curl_4',
    route_number: 4,
    route_name: 'Curl',
    depth_yards: 12,
    break_direction: 'stop',
    stem: 'vertical_5_steps',
    timing_second: 2.8,
    release_type: 'vertical',
    key_coaching_points: ['push_to_landmark_snap_down', 'come_back_downhill', 'work_away_from_lb_zone_eyes', 'feel_soft_spot_in_zone'],
    effective_vs_coverage: ['zone', 'cover_3', 'cover_4'],
    weak_vs_coverage: ['man_trail'],
    tags: ['intermediate', 'zone_beater'],
  },
  // Route 5 - Out
  {
    route_id: 'out_5',
    route_number: 5,
    route_name: 'Out',
    depth_yards: 10,
    break_direction: 'outside',
    stem: 'vertical_5_steps',
    timing_second: 2.6,
    release_type: 'vertical',
    key_coaching_points: ['vertical_stem_dont_drift', 'break_flat_90_degrees', 'landmark_top_of_numbers', 'speed_cut_vs_square_cut'],
    effective_vs_coverage: ['zone', 'cover_2'],
    weak_vs_coverage: ['press_man', 'cover_4'],
    tags: ['intermediate', 'sideline_route'],
  },
  // Route 6 - Dig/In
  {
    route_id: 'dig_6',
    route_number: 6,
    route_name: 'Dig',
    depth_yards: 12,
    break_direction: 'inside',
    stem: 'vertical_5_steps',
    timing_second: 2.8,
    release_type: 'outside',
    key_coaching_points: ['push_vertical_to_safety', 'keep_shoulders_downfield', 'flatten_vs_man_sit_vs_zone', 'middle_breaker_deep_slant'],
    effective_vs_coverage: ['cover_1', 'cover_3', 'single_high'],
    weak_vs_coverage: ['cover_2_tampa', 'pattern_match'],
    tags: ['intermediate', 'man_beater', 'crosser'],
  },
  // Route 7 - Corner
  {
    route_id: 'corner_7',
    route_number: 7,
    route_name: 'Corner',
    depth_yards: 12,
    break_direction: 'outside',
    stem: 'vertical_5_steps',
    timing_second: 3.0,
    release_type: 'vertical',
    key_coaching_points: ['sell_post_before_corner_break', 'push_vertical_stem', 'corner_flag_landmark'],
    effective_vs_coverage: ['cover_2', 'two_high'],
    weak_vs_coverage: ['cover_3', 'single_high'],
    tags: ['deep', 'man_beater'],
  },
  // Route 8 - Post
  {
    route_id: 'post_8',
    route_number: 8,
    route_name: 'Post',
    depth_yards: 16,
    break_direction: 'inside',
    stem: 'vertical_7_steps',
    timing_second: 3.5,
    release_type: 'outside',
    key_coaching_points: ['outside_release_vs_single_high', 'inside_vs_2_high', 'landmark_goal_posts_or_near_hash', 'middle_seam_attacker'],
    effective_vs_coverage: ['cover_3', 'single_high', 'cover_1'],
    weak_vs_coverage: ['cover_2', 'two_high'],
    tags: ['deep', 'man_beater', 'big_play'],
  },
  // Route 9 - Go/Fade
  {
    route_id: 'go_9',
    route_number: 9,
    route_name: 'Go',
    depth_yards: 20,
    break_direction: 'vertical',
    stem: 'vertical_release',
    timing_second: 3.8,
    release_type: 'outside',
    key_coaching_points: ['outside_release_win_leverage', 'stack_the_db', 'track_the_ball_over_shoulder'],
    effective_vs_coverage: ['off_man', 'single_high'],
    weak_vs_coverage: ['press_man', 'two_high_safety'],
    tags: ['deep', 'big_play'],
  },
  // Hitch (classic 0-route variant at 5 yards)
  {
    route_id: 'hitch_5',
    route_number: 0,
    route_name: 'Hitch',
    depth_yards: 5,
    break_direction: 'stop',
    stem: 'vertical_3_steps',
    timing_second: 2.0,
    release_type: 'vertical',
    key_coaching_points: ['three_step_stop_turn_back', 'sit_in_zone_window', 'timing_route'],
    effective_vs_coverage: ['off_coverage', 'zone'],
    weak_vs_coverage: ['press_man'],
    tags: ['quick', 'zone_beater'],
  },
  // Shallow Cross
  {
    route_id: 'shallow_cross_5',
    route_number: 2,
    route_name: 'Shallow Cross',
    depth_yards: 4,
    break_direction: 'inside',
    stem: 'lateral_cross',
    timing_second: 2.2,
    release_type: 'inside',
    key_coaching_points: ['run_across_formation', 'stay_shallow_under_lbs', 'pick_up_speed_across'],
    effective_vs_coverage: ['zone', 'man'],
    weak_vs_coverage: ['pattern_match'],
    tags: ['quick', 'crosser', 'man_beater'],
  },
];

// ============================================
// CONCEPT DEFINITIONS (9 Concepts)
// ============================================

export const concepts: ConceptDef[] = [
  // Mesh - Crossing routes underneath
  {
    concept_id: 'mesh_core',
    concept_name: 'Mesh',
    core_routes: [
      { player: 'slot_left', route: 'shallow_cross_5', depth: 4 },
      { player: 'slot_right', route: 'shallow_cross_5', depth: 5 },
      { player: 'outside_wr', route: 'go_9', depth: 20 },
    ],
    spacing: { vertical_separation: [4, 5, 20] },
    read_progression: ['shallow_crossers', 'go_clear'],
    key_defenders: ['underneath_zone_defenders', 'man_coverage_trail'],
    best_vs: ['man', 'cover_1'],
    weak_vs: ['zone_with_good_pattern_match'],
    coaching_cue: 'Two shallow crossers create natural picks in man coverage. Go route clears the deep defender.',
  },
  // Smash - Hitch + Corner
  {
    concept_id: 'smash_core',
    concept_name: 'Smash',
    core_routes: [
      { player: 'outside_wr', route: 'hitch_5', depth: 5 },
      { player: 'slot_wr', route: 'corner_7', depth: 12 },
    ],
    spacing: { vertical_separation: [5, 12] },
    read_progression: ['corner', 'hitch'],
    key_defenders: ['flat_defender', 'deep_half_safety'],
    best_vs: ['cover_2', 'two_high'],
    weak_vs: ['cover_3', 'single_high'],
    coaching_cue: 'Hi-lo the corner/flat defender. If he sinks with the corner, hit the hitch. If he jumps the hitch, throw the corner.',
  },
  // Four Verts - 4 vertical routes
  {
    concept_id: 'four_verts',
    concept_name: 'Four Verts',
    core_routes: [
      { player: 'outside_wr_left', route: 'go_9', depth: 20 },
      { player: 'slot_left', route: 'go_9', depth: 18 },
      { player: 'slot_right', route: 'go_9', depth: 18 },
      { player: 'outside_wr_right', route: 'go_9', depth: 20 },
    ],
    spacing: { horizontal_separation: [12, 6, 12] },
    read_progression: ['seam_read', 'boundary_fade', 'field_fade'],
    key_defenders: ['safeties', 'deep_third_corners'],
    best_vs: ['cover_3', 'single_high'],
    weak_vs: ['cover_2', 'cover_4', 'two_high'],
    coaching_cue: 'Four vertical threats stretch the deep coverage. Read the safety — throw away from his leverage.',
  },
  // Flood/Sail - Three-level sideline stretch
  {
    concept_id: 'flood_core',
    concept_name: 'Flood',
    core_routes: [
      { player: 'rb_or_te', route: 'flat_1', depth: 2 },
      { player: 'slot_wr', route: 'out_5', depth: 10 },
      { player: 'outside_wr', route: 'go_9', depth: 20 },
    ],
    spacing: { vertical_separation: [2, 10, 20] },
    read_progression: ['out', 'flat', 'go'],
    key_defenders: ['flat_defender', 'deep_third_corner'],
    best_vs: ['cover_3', 'cover_4'],
    weak_vs: ['cover_2', 'pattern_match'],
    coaching_cue: 'Three-level stretch to the sideline. Read flat defender: if he sinks, hit the flat. If he squats, throw the out. Go route clears.',
  },
  // Stick - Triangle on curl/flat defender
  {
    concept_id: 'stick_core',
    concept_name: 'Stick',
    core_routes: [
      { player: 'te_or_slot', route: 'hitch_5', depth: 5 },
      { player: 'outside_wr', route: 'flat_1', depth: 2 },
      { player: 'backside_wr', route: 'slant_2', depth: 5 },
    ],
    spacing: { triangle_concept: true },
    read_progression: ['stick_hitch', 'flat', 'slant'],
    key_defenders: ['curl_flat_defender'],
    best_vs: ['cover_3', 'cover_4', 'soft_zone'],
    weak_vs: ['man_press'],
    coaching_cue: 'Quick triangle on the curl/flat defender. If he widens to flat, hit the stick. If he stays inside, throw the flat.',
  },
  // Shallow/Drive - Hi-lo on hook/curl LBs
  {
    concept_id: 'shallow_drive',
    concept_name: 'Shallow Cross',
    core_routes: [
      { player: 'any_receiver', route: 'shallow_cross_5', depth: 4 },
      { player: 'backside_receiver', route: 'dig_6', depth: 12 },
      { player: 'outside_wr', route: 'go_9', depth: 20 },
    ],
    spacing: { vertical_separation: [4, 12, 20] },
    read_progression: ['shallow', 'dig', 'go'],
    key_defenders: ['hook_curl_lb', 'mike_linebacker'],
    best_vs: ['cover_3', 'cover_1', 'single_high'],
    weak_vs: ['pattern_match_with_good_underneath'],
    coaching_cue: 'Hi-lo on hook/curl LBs. Shallow first in progression, dig second. Go route clears the deep defender.',
  },
  // Snag - Triangle concept with sit route
  {
    concept_id: 'snag_core',
    concept_name: 'Snag',
    core_routes: [
      { player: 'slot_wr', route: 'hitch_5', depth: 6 },
      { player: 'rb', route: 'flat_1', depth: 2 },
      { player: 'outside_wr', route: 'corner_7', depth: 12 },
    ],
    spacing: { triangle_concept: true },
    read_progression: ['snag_sit', 'flat', 'corner'],
    key_defenders: ['mike_linebacker', 'flat_defender'],
    best_vs: ['zone', 'cover_3', 'cover_4'],
    weak_vs: ['man_with_underneath_help', 'safety_rotation_to_snag'],
    coaching_cue: 'Snag finds the grass - adjust route to open window. Triangle creates 2-defender conflict.',
  },
  // Curl/Flat - Classic Cover 3 beater
  {
    concept_id: 'curl_flat_core',
    concept_name: 'Curl/Flat',
    core_routes: [
      { player: 'outside_wr', route: 'curl_4', depth: 12 },
      { player: 'slot_or_rb', route: 'flat_1', depth: 2 },
    ],
    spacing: { vertical_separation: [2, 12] },
    read_progression: ['curl', 'flat'],
    key_defenders: ['hook_curl_defender'],
    best_vs: ['cover_3'],
    weak_vs: ['cover_2', 'man'],
    coaching_cue: 'Hi-lo the hook/curl defender. If he sinks with the curl, hit the flat. If he squats on the flat, throw the curl.',
  },
  // Spacing - Spot-drop zone beater
  {
    concept_id: 'spacing_core',
    concept_name: 'Spacing',
    core_routes: [
      { player: 'slot_left', route: 'hitch_5', depth: 5 },
      { player: 'center_field', route: 'hitch_5', depth: 6 },
      { player: 'slot_right', route: 'hitch_5', depth: 5 },
    ],
    spacing: { horizontal_separation: [6, 6] },
    read_progression: ['middle_hitch', 'field_hitch', 'boundary_hitch'],
    key_defenders: ['underneath_zone_defenders'],
    best_vs: ['soft_zone', 'cover_2', 'cover_4'],
    weak_vs: ['man', 'aggressive_zone'],
    coaching_cue: 'Multiple hitches spaced 5-6 yards apart horizontally. Find the void between zone defenders. QB reads grass, not routes.',
  },
];

// ============================================
// SPACING RULES
// ============================================

export const spacingRules: SpacingRule[] = [
  {
    rule_id: 'vertical_spacing_standard',
    rule_type: 'spacing_constraint',
    parameter: 'vertical_separation_yards',
    min_value: 4,
    max_value: 20,
    violation_outcome: 'vertical_convergence',
    correction: 'increase_vertical_separation_to_4_yards',
  },
  {
    rule_id: 'horizontal_spacing_standard',
    rule_type: 'spacing_constraint',
    parameter: 'horizontal_separation_yards',
    min_value: 3,
    max_value: 10,
    violation_outcome: 'horizontal_overlap',
    correction: 'increase_lateral_separation_to_5_yards',
  },
];

// ============================================
// TIMING RULES
// ============================================

export const timingRules: TimingRule[] = [
  {
    timing_id: 'three_step_quick_game',
    drop_type: 'three_step',
    drop_duration_seconds: 2.0,
    route_numbers_allowed: [0, 1, 2], // Screen, Flat, Slant
  },
  {
    timing_id: 'five_step_intermediate',
    drop_type: 'five_step',
    drop_duration_seconds: 3.0,
    route_numbers_allowed: [0, 2, 4, 5, 6], // Hitch, Slant, Curl, Out, Dig
  },
  {
    timing_id: 'seven_step_deep',
    drop_type: 'seven_step',
    drop_duration_seconds: 3.8,
    route_numbers_allowed: [3, 4, 5, 6, 7, 8], // Comeback, Curl, Out, Dig, Corner, Post
  },
  {
    timing_id: 'play_action_deep',
    drop_type: 'play_action',
    drop_duration_seconds: 4.5,
    route_numbers_allowed: [7, 8, 9, 3], // Corner, Post, Go, Comeback
  },
];
