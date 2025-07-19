// src/utils/featureGating.ts
import { FootballLevel } from '../types/football';

// ============================================
// FEATURE DEFINITIONS
// ============================================

export type Feature = 
  // Core features available to all levels
  | 'roster_management'
  | 'attendance_tracking'
  | 'basic_plays'
  | 'practice_plans'
  | 'team_dashboard'
  
  // Youth-specific features
  | 'parent_portal'
  | 'safety_tracking'
  | 'skill_development'
  | 'fun_activities'
  | 'simplified_plays'
  
  // Middle school features
  | 'basic_analytics'
  | 'player_progress'
  | 'team_stats'
  | 'game_schedule'
  
  // High school features
  | 'advanced_analytics'
  | 'video_analysis'
  | 'opponent_scouting'
  | 'advanced_plays'
  | 'performance_metrics'
  
  // College/Professional features
  | 'ai_insights'
  | 'advanced_scouting'
  | 'recruitment_tools'
  | 'professional_analytics'
  | 'team_comparison';

// ============================================
// FEATURE GATING CONFIGURATION
// ============================================

const FEATURE_MAP: Record<FootballLevel, Feature[]> = {
  [FootballLevel.YOUTH_6U]: [
    'roster_management',
    'attendance_tracking',
    'basic_plays',
    'practice_plans',
    'team_dashboard',
    'parent_portal',
    'safety_tracking',
    'fun_activities',
    'simplified_plays'
  ],
  [FootballLevel.YOUTH_8U]: [
    'roster_management',
    'attendance_tracking',
    'basic_plays',
    'practice_plans',
    'team_dashboard',
    'parent_portal',
    'safety_tracking',
    'fun_activities',
    'simplified_plays'
  ],
  [FootballLevel.YOUTH_10U]: [
    'roster_management',
    'attendance_tracking',
    'basic_plays',
    'practice_plans',
    'team_dashboard',
    'parent_portal',
    'safety_tracking',
    'skill_development',
    'fun_activities',
    'simplified_plays'
  ],
  [FootballLevel.YOUTH_12U]: [
    'roster_management',
    'attendance_tracking',
    'basic_plays',
    'practice_plans',
    'team_dashboard',
    'parent_portal',
    'safety_tracking',
    'skill_development',
    'fun_activities',
    'simplified_plays',
    'basic_analytics'
  ],
  [FootballLevel.YOUTH_14U]: [
    'roster_management',
    'attendance_tracking',
    'basic_plays',
    'practice_plans',
    'team_dashboard',
    'parent_portal',
    'safety_tracking',
    'skill_development',
    'fun_activities',
    'simplified_plays',
    'basic_analytics',
    'player_progress',
    'team_stats'
  ],
  [FootballLevel.MIDDLE_SCHOOL]: [
    'roster_management',
    'attendance_tracking',
    'basic_plays',
    'practice_plans',
    'team_dashboard',
    'parent_portal',
    'safety_tracking',
    'skill_development',
    'basic_analytics',
    'player_progress',
    'team_stats',
    'game_schedule'
  ],
  [FootballLevel.JV]: [
    'roster_management',
    'attendance_tracking',
    'basic_plays',
    'practice_plans',
    'team_dashboard',
    'skill_development',
    'basic_analytics',
    'player_progress',
    'team_stats',
    'game_schedule',
    'advanced_analytics',
    'performance_metrics'
  ],
  [FootballLevel.VARSITY]: [
    'roster_management',
    'attendance_tracking',
    'basic_plays',
    'practice_plans',
    'team_dashboard',
    'skill_development',
    'basic_analytics',
    'player_progress',
    'team_stats',
    'game_schedule',
    'advanced_analytics',
    'video_analysis',
    'opponent_scouting',
    'advanced_plays',
    'performance_metrics'
  ],
  [FootballLevel.COLLEGE]: [
    'roster_management',
    'attendance_tracking',
    'basic_plays',
    'practice_plans',
    'team_dashboard',
    'skill_development',
    'basic_analytics',
    'player_progress',
    'team_stats',
    'game_schedule',
    'advanced_analytics',
    'video_analysis',
    'opponent_scouting',
    'advanced_plays',
    'performance_metrics',
    'ai_insights',
    'advanced_scouting',
    'recruitment_tools',
    'professional_analytics'
  ],
  [FootballLevel.SEMI_PRO]: [
    'roster_management',
    'attendance_tracking',
    'basic_plays',
    'practice_plans',
    'team_dashboard',
    'skill_development',
    'basic_analytics',
    'player_progress',
    'team_stats',
    'game_schedule',
    'advanced_analytics',
    'video_analysis',
    'opponent_scouting',
    'advanced_plays',
    'performance_metrics',
    'ai_insights',
    'advanced_scouting',
    'recruitment_tools',
    'professional_analytics',
    'team_comparison'
  ],
  [FootballLevel.PROFESSIONAL]: [
    'roster_management',
    'attendance_tracking',
    'basic_plays',
    'practice_plans',
    'team_dashboard',
    'skill_development',
    'basic_analytics',
    'player_progress',
    'team_stats',
    'game_schedule',
    'advanced_analytics',
    'video_analysis',
    'opponent_scouting',
    'advanced_plays',
    'performance_metrics',
    'ai_insights',
    'advanced_scouting',
    'recruitment_tools',
    'professional_analytics',
    'team_comparison'
  ]
};

// ============================================
// FEATURE GATING UTILITIES
// ============================================

export class FeatureGating {
  /**
   * Check if a feature is available for a given level
   */
  static isFeatureAvailable(feature: Feature, level: FootballLevel): boolean {
    const availableFeatures = FEATURE_MAP[level] || [];
    return availableFeatures.includes(feature);
  }

  /**
   * Get all available features for a given level
   */
  static getAvailableFeatures(level: FootballLevel): Feature[] {
    return FEATURE_MAP[level] || [];
  }

  /**
   * Get features that are available at a level but not at lower levels
   */
  static getNewFeaturesAtLevel(level: FootballLevel): Feature[] {
    const currentFeatures = this.getAvailableFeatures(level);
    const lowerLevelFeatures = this.getFeaturesForLowerLevels(level);
    return currentFeatures.filter(feature => !lowerLevelFeatures.includes(feature));
  }

  /**
   * Get all features available at the current level and below
   */
  static getFeaturesForLowerLevels(level: FootballLevel): Feature[] {
    const allLevels = Object.values(FootballLevel);
    const currentLevelIndex = allLevels.indexOf(level);
    const lowerLevels = allLevels.slice(0, currentLevelIndex);
    
    const allFeatures = new Set<Feature>();
    lowerLevels.forEach(lowerLevel => {
      const features = this.getAvailableFeatures(lowerLevel);
      features.forEach(feature => allFeatures.add(feature));
    });
    
    return Array.from(allFeatures);
  }

  /**
   * Check if a user can access a feature based on their team level
   */
  static canAccessFeature(feature: Feature, teamLevel: FootballLevel): boolean {
    return this.isFeatureAvailable(feature, teamLevel);
  }

  /**
   * Get the minimum level required to access a feature
   */
  static getMinimumLevelForFeature(feature: Feature): FootballLevel | null {
    for (const [level, features] of Object.entries(FEATURE_MAP)) {
      if (features.includes(feature)) {
        return level as FootballLevel;
      }
    }
    return null;
  }

  /**
   * Validate if a play is appropriate for a given level
   */
  static validatePlayForLevel(play: any, level: FootballLevel): { isValid: boolean; reason?: string } {
    // Check if play has required level-specific fields
    if (!play.level) {
      return { isValid: false, reason: 'Play must have a level specified' };
    }

    // Check if play level matches team level
    if (play.level !== level) {
      return { isValid: false, reason: `Play level (${play.level}) does not match team level (${level})` };
    }

    // Check for youth-specific constraints
    if (this.isYouthLevel(level)) {
      if (play.complexity === 'advanced') {
        return { isValid: false, reason: 'Advanced plays are not suitable for youth levels' };
      }
      
      if (!play.safety_rating || play.safety_rating === 'low') {
        return { isValid: false, reason: 'Youth plays must have appropriate safety ratings' };
      }
    }

    return { isValid: true };
  }

  /**
   * Check if a level is considered youth level
   */
  static isYouthLevel(level: FootballLevel): boolean {
    return [
      FootballLevel.YOUTH_6U,
      FootballLevel.YOUTH_8U,
      FootballLevel.YOUTH_10U,
      FootballLevel.YOUTH_12U,
      FootballLevel.YOUTH_14U
    ].includes(level);
  }

  /**
   * Check if a level is considered advanced level
   */
  static isAdvancedLevel(level: FootballLevel): boolean {
    return [
      FootballLevel.VARSITY,
      FootballLevel.COLLEGE,
      FootballLevel.SEMI_PRO,
      FootballLevel.PROFESSIONAL
    ].includes(level);
  }

  /**
   * Get level-specific constraints
   */
  static getLevelConstraints(level: FootballLevel): any {
    const constraints: any = {
      maxPlayers: 11,
      fieldDimensions: { width: 53.3, length: 120 },
      allowedFormations: ['shotgun', 'i_formation', 'spread'],
      contactRules: {},
      timingRestrictions: {},
      equipmentRequirements: ['helmet', 'shoulder_pads', 'mouthguard']
    };

    if (this.isYouthLevel(level)) {
      constraints.maxPlayers = 11;
      constraints.allowedFormations = ['shotgun', 'i_formation'];
      constraints.contactRules = { maxContact: 'minimal', fullContact: false };
      constraints.timingRestrictions = { maxPracticeTime: 90, requiredBreaks: true };
      constraints.equipmentRequirements = ['helmet', 'shoulder_pads', 'mouthguard'];
    } else if (this.isAdvancedLevel(level)) {
      constraints.maxPlayers = 11;
      constraints.allowedFormations = ['shotgun', 'i_formation', 'spread', 'wildcat', 'pistol'];
      constraints.contactRules = { maxContact: 'full', fullContact: true };
      constraints.timingRestrictions = { maxPracticeTime: 180, requiredBreaks: false };
      constraints.equipmentRequirements = ['helmet', 'shoulder_pads', 'mouthguard', 'cleats'];
    }

    return constraints;
  }
}

// ============================================
// REACT HOOKS FOR FEATURE GATING
// ============================================

import { useMemo } from 'react';

export const useFeatureGating = (level: FootballLevel) => {
  const availableFeatures = useMemo(() => FeatureGating.getAvailableFeatures(level), [level]);
  const newFeatures = useMemo(() => FeatureGating.getNewFeaturesAtLevel(level), [level]);
  const constraints = useMemo(() => FeatureGating.getLevelConstraints(level), [level]);
  const isYouth = useMemo(() => FeatureGating.isYouthLevel(level), [level]);
  const isAdvanced = useMemo(() => FeatureGating.isAdvancedLevel(level), [level]);

  const canAccess = useMemo(() => (feature: Feature) => FeatureGating.canAccessFeature(feature, level), [level]);

  return {
    availableFeatures,
    newFeatures,
    constraints,
    isYouth,
    isAdvanced,
    canAccess,
    level
  };
}; 