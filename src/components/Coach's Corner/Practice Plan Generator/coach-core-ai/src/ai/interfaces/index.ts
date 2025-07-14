/**
 * AI Interfaces - TypeScript types for AI logic and business rules
 * 
 * This module defines the core interfaces used throughout the AI system:
 * - TeamProfile: Team composition and characteristics
 * - PracticeGoal: Objectives and constraints for practice sessions
 * - AISuggestion: AI-generated recommendations
 * - ConfidenceScore: AI confidence metrics
 */

export interface TeamProfile {
  id: string;
  name: string;
  sport: SportType;
  level: TeamLevel;
  players: Player[];
  strengths: string[];
  weaknesses: string[];
  recentPerformance: PerformanceMetrics;
  practiceHistory: PracticeSession[];
}

export interface Player {
  id: string;
  name: string;
  position: string;
  grade: string;
  skillLevel: SkillLevel;
  strengths: string[];
  areasForImprovement: string[];
  recentPerformance: PlayerPerformance;
}

export interface PracticeGoal {
  id: string;
  title: string;
  description: string;
  focusAreas: string[];
  duration: number; // minutes
  intensity: IntensityLevel;
  constraints: PracticeConstraint[];
  targetOutcomes: string[];
}

export interface AISuggestion {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  confidence: number; // 0-1
  reasoning: string;
  implementation: string[];
  estimatedImpact: ImpactLevel;
  prerequisites: string[];
}

export interface ConfidenceScore {
  overall: number; // 0-1
  factors: {
    dataQuality: number;
    modelAccuracy: number;
    contextRelevance: number;
    historicalSuccess: number;
  };
  explanation: string;
}

// Enums and supporting types
export enum SportType {
  FOOTBALL = 'football',
  BASKETBALL = 'basketball',
  SOCCER = 'soccer',
  BASEBALL = 'baseball',
  VOLLEYBALL = 'volleyball'
}

export enum TeamLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  ELITE = 'elite'
}

export enum SkillLevel {
  NOVICE = 'novice',
  DEVELOPING = 'developing',
  COMPETENT = 'competent',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

export enum IntensityLevel {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  EXTREME = 'extreme'
}

export enum SuggestionType {
  DRILL_SELECTION = 'drill_selection',
  SCHEDULE_OPTIMIZATION = 'schedule_optimization',
  SKILL_DEVELOPMENT = 'skill_development',
  TEAM_STRATEGY = 'team_strategy',
  CONDITIONING = 'conditioning'
}

export enum ImpactLevel {
  MINIMAL = 'minimal',
  MODERATE = 'moderate',
  SIGNIFICANT = 'significant',
  TRANSFORMATIVE = 'transformative'
}

export interface PerformanceMetrics {
  wins: number;
  losses: number;
  ties: number;
  averageScore: number;
  defensiveEfficiency: number;
  offensiveEfficiency: number;
}

export interface PlayerPerformance {
  recentGames: GamePerformance[];
  practiceAttendance: number;
  skillImprovements: SkillImprovement[];
}

export interface PracticeConstraint {
  type: 'time' | 'equipment' | 'facility' | 'weather' | 'player_availability';
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface PracticeSession {
  id: string;
  date: Date;
  duration: number;
  drills: Drill[];
  outcomes: string[];
  feedback: SessionFeedback;
}

export interface Drill {
  id: string;
  name: string;
  category: DrillCategory;
  duration: number;
  intensity: IntensityLevel;
  equipment: string[];
  description: string;
  objectives: string[];
}

export interface SessionFeedback {
  overallRating: number; // 1-5
  drillRatings: Record<string, number>;
  notes: string;
  improvements: string[];
}

export interface GamePerformance {
  date: Date;
  opponent: string;
  result: 'win' | 'loss' | 'tie';
  playerStats: PlayerStats;
}

export interface PlayerStats {
  points?: number;
  assists?: number;
  rebounds?: number;
  tackles?: number;
  goals?: number;
  [key: string]: any;
}

export interface SkillImprovement {
  skill: string;
  improvement: number; // percentage
  timeframe: string;
}

export enum DrillCategory {
  WARMUP = 'warmup',
  SKILLS = 'skills',
  TEAM = 'team',
  CONDITIONING = 'conditioning',
  SPECIAL_TEAMS = 'special_teams',
  RECOVERY = 'recovery'
} 