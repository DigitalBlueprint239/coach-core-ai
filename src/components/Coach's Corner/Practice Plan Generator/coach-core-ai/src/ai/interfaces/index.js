"use strict";
/**
 * AI Interfaces - TypeScript types for AI logic and business rules
 *
 * This module defines the core interfaces used throughout the AI system:
 * - TeamProfile: Team composition and characteristics
 * - PracticeGoal: Objectives and constraints for practice sessions
 * - AISuggestion: AI-generated recommendations
 * - ConfidenceScore: AI confidence metrics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrillCategory = exports.ImpactLevel = exports.SuggestionType = exports.IntensityLevel = exports.SkillLevel = exports.TeamLevel = exports.SportType = void 0;
// Enums and supporting types
var SportType;
(function (SportType) {
    SportType["FOOTBALL"] = "football";
    SportType["BASKETBALL"] = "basketball";
    SportType["SOCCER"] = "soccer";
    SportType["BASEBALL"] = "baseball";
    SportType["VOLLEYBALL"] = "volleyball";
})(SportType || (exports.SportType = SportType = {}));
var TeamLevel;
(function (TeamLevel) {
    TeamLevel["BEGINNER"] = "beginner";
    TeamLevel["INTERMEDIATE"] = "intermediate";
    TeamLevel["ADVANCED"] = "advanced";
    TeamLevel["ELITE"] = "elite";
})(TeamLevel || (exports.TeamLevel = TeamLevel = {}));
var SkillLevel;
(function (SkillLevel) {
    SkillLevel["NOVICE"] = "novice";
    SkillLevel["DEVELOPING"] = "developing";
    SkillLevel["COMPETENT"] = "competent";
    SkillLevel["ADVANCED"] = "advanced";
    SkillLevel["EXPERT"] = "expert";
})(SkillLevel || (exports.SkillLevel = SkillLevel = {}));
var IntensityLevel;
(function (IntensityLevel) {
    IntensityLevel["LOW"] = "low";
    IntensityLevel["MODERATE"] = "moderate";
    IntensityLevel["HIGH"] = "high";
    IntensityLevel["EXTREME"] = "extreme";
})(IntensityLevel || (exports.IntensityLevel = IntensityLevel = {}));
var SuggestionType;
(function (SuggestionType) {
    SuggestionType["DRILL_SELECTION"] = "drill_selection";
    SuggestionType["SCHEDULE_OPTIMIZATION"] = "schedule_optimization";
    SuggestionType["SKILL_DEVELOPMENT"] = "skill_development";
    SuggestionType["TEAM_STRATEGY"] = "team_strategy";
    SuggestionType["CONDITIONING"] = "conditioning";
})(SuggestionType || (exports.SuggestionType = SuggestionType = {}));
var ImpactLevel;
(function (ImpactLevel) {
    ImpactLevel["MINIMAL"] = "minimal";
    ImpactLevel["MODERATE"] = "moderate";
    ImpactLevel["SIGNIFICANT"] = "significant";
    ImpactLevel["TRANSFORMATIVE"] = "transformative";
})(ImpactLevel || (exports.ImpactLevel = ImpactLevel = {}));
var DrillCategory;
(function (DrillCategory) {
    DrillCategory["WARMUP"] = "warmup";
    DrillCategory["SKILLS"] = "skills";
    DrillCategory["TEAM"] = "team";
    DrillCategory["CONDITIONING"] = "conditioning";
    DrillCategory["SPECIAL_TEAMS"] = "special_teams";
    DrillCategory["RECOVERY"] = "recovery";
})(DrillCategory || (exports.DrillCategory = DrillCategory = {}));
