"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useFeatureGating = exports.FeatureGating = void 0;
// src/utils/featureGating.ts
const football_1 = require("../types/football");
// ============================================
// FEATURE GATING CONFIGURATION
// ============================================
const FEATURE_MAP = {
    [football_1.FootballLevel.YOUTH_6U]: [
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
    [football_1.FootballLevel.YOUTH_8U]: [
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
    [football_1.FootballLevel.YOUTH_10U]: [
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
    [football_1.FootballLevel.YOUTH_12U]: [
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
    [football_1.FootballLevel.YOUTH_14U]: [
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
    [football_1.FootballLevel.MIDDLE_SCHOOL]: [
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
    [football_1.FootballLevel.JV]: [
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
    [football_1.FootballLevel.VARSITY]: [
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
    [football_1.FootballLevel.COLLEGE]: [
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
    [football_1.FootballLevel.SEMI_PRO]: [
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
    [football_1.FootballLevel.PROFESSIONAL]: [
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
class FeatureGating {
    /**
     * Check if a feature is available for a given level
     */
    static isFeatureAvailable(feature, level) {
        const availableFeatures = FEATURE_MAP[level] || [];
        return availableFeatures.includes(feature);
    }
    /**
     * Get all available features for a given level
     */
    static getAvailableFeatures(level) {
        return FEATURE_MAP[level] || [];
    }
    /**
     * Get features that are available at a level but not at lower levels
     */
    static getNewFeaturesAtLevel(level) {
        const currentFeatures = this.getAvailableFeatures(level);
        const lowerLevelFeatures = this.getFeaturesForLowerLevels(level);
        return currentFeatures.filter(feature => !lowerLevelFeatures.includes(feature));
    }
    /**
     * Get all features available at the current level and below
     */
    static getFeaturesForLowerLevels(level) {
        const allLevels = Object.values(football_1.FootballLevel);
        const currentLevelIndex = allLevels.indexOf(level);
        const lowerLevels = allLevels.slice(0, currentLevelIndex);
        const allFeatures = new Set();
        lowerLevels.forEach(lowerLevel => {
            const features = this.getAvailableFeatures(lowerLevel);
            features.forEach(feature => allFeatures.add(feature));
        });
        return Array.from(allFeatures);
    }
    /**
     * Check if a user can access a feature based on their team level
     */
    static canAccessFeature(feature, teamLevel) {
        return this.isFeatureAvailable(feature, teamLevel);
    }
    /**
     * Get the minimum level required to access a feature
     */
    static getMinimumLevelForFeature(feature) {
        for (const [level, features] of Object.entries(FEATURE_MAP)) {
            if (features.includes(feature)) {
                return level;
            }
        }
        return null;
    }
    /**
     * Validate if a play is appropriate for a given level
     */
    static validatePlayForLevel(play, level) {
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
    static isYouthLevel(level) {
        return [
            football_1.FootballLevel.YOUTH_6U,
            football_1.FootballLevel.YOUTH_8U,
            football_1.FootballLevel.YOUTH_10U,
            football_1.FootballLevel.YOUTH_12U,
            football_1.FootballLevel.YOUTH_14U
        ].includes(level);
    }
    /**
     * Check if a level is considered advanced level
     */
    static isAdvancedLevel(level) {
        return [
            football_1.FootballLevel.VARSITY,
            football_1.FootballLevel.COLLEGE,
            football_1.FootballLevel.SEMI_PRO,
            football_1.FootballLevel.PROFESSIONAL
        ].includes(level);
    }
    /**
     * Get level-specific constraints
     */
    static getLevelConstraints(level) {
        const constraints = {
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
        }
        else if (this.isAdvancedLevel(level)) {
            constraints.maxPlayers = 11;
            constraints.allowedFormations = ['shotgun', 'i_formation', 'spread', 'wildcat', 'pistol'];
            constraints.contactRules = { maxContact: 'full', fullContact: true };
            constraints.timingRestrictions = { maxPracticeTime: 180, requiredBreaks: false };
            constraints.equipmentRequirements = ['helmet', 'shoulder_pads', 'mouthguard', 'cleats'];
        }
        return constraints;
    }
}
exports.FeatureGating = FeatureGating;
// ============================================
// REACT HOOKS FOR FEATURE GATING
// ============================================
const react_1 = require("react");
const useFeatureGating = (level) => {
    const availableFeatures = (0, react_1.useMemo)(() => FeatureGating.getAvailableFeatures(level), [level]);
    const newFeatures = (0, react_1.useMemo)(() => FeatureGating.getNewFeaturesAtLevel(level), [level]);
    const constraints = (0, react_1.useMemo)(() => FeatureGating.getLevelConstraints(level), [level]);
    const isYouth = (0, react_1.useMemo)(() => FeatureGating.isYouthLevel(level), [level]);
    const isAdvanced = (0, react_1.useMemo)(() => FeatureGating.isAdvancedLevel(level), [level]);
    const canAccess = (0, react_1.useMemo)(() => (feature) => FeatureGating.canAccessFeature(feature, level), [level]);
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
exports.useFeatureGating = useFeatureGating;
