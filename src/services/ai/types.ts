// TypeScript interfaces for AI Service in Coach Core AI

export interface TeamProfile {
  sport: string;
  playerCount: number;
  experienceLevel: string;
  preferredStyle: string;
  ageGroup: string;
  strengths: string[];
  weaknesses: string[];
  teamName: string;
}

export interface PlayRequirements {
  objective: string;
  difficulty: string;
  timeOnShotClock: number;
  specialSituations: string[];
  playerCount?: number;
}

export interface GeneratedPlay {
  id: string;
  name: string;
  description: string;
  positions?: PlayerPosition[];
  coachingPoints?: string[];
  variations?: string[];
  difficulty: string;
  objective: string;
  estimatedTokens?: number;
  createdAt: Date;
  teamProfile?: TeamProfile;
  playRequirements?: PlayRequirements;
}

export interface PlayGenerationUsage {
  tokensUsed: number;
  cost: number;
  remainingPlays: number;
}

export interface PlayGenerationResponse {
  success: boolean;
  data?: GeneratedPlay;
  usage?: PlayGenerationUsage;
  error?: string;
}

export interface PlayerPosition {
  position: string;
  movement: string;
  responsibility: string;
  keyPoints: string[];
}

export interface TeamStats {
  recentRecord: string; // e.g., "5-2"
  scoringStats: ScoringStats;
  defensiveStats: DefensiveStats;
  weaknesses: string[];
  strengths: string[];
  recentPerformance: string;
}

export interface ScoringStats {
  pointsPerGame: number;
  fieldGoalPercentage: number;
  threePointPercentage: number;
  freeThrowPercentage: number;
  assistsPerGame: number;
}

export interface DefensiveStats {
  pointsAllowedPerGame: number;
  stealsPerGame: number;
  blocksPerGame: number;
  reboundsPerGame: number;
  defensiveRating: number;
}

export interface PracticeGoals {
  duration: number; // minutes
  primaryFocus: string;
  secondaryFocus: string;
  gamePreparation: boolean;
  skillDevelopment: boolean;
  teamConcepts: boolean;
}

export interface PracticePlan {
  id: string;
  name: string;
  duration: number;
  focusAreas: string[];
  drills: Drill[];
  coachingPoints: string[];
  estimatedTokens?: number;
  createdAt: Date;
}

export interface PracticeSection {
  name: string;
  duration: number;
  focus: string;
  drills: string[];
  coachingPoints: string[];
}

export interface Drill {
  name: string;
  duration: number;
  description: string;
  equipment: string[];
  setup: string;
  execution: string[];
  coachingPoints: string[];
}

export interface PlayerStats {
  name: string;
  position: string;
  gamesPlayed: number;
  minutesPerGame: number;
  pointsPerGame: number;
  reboundsPerGame: number;
  assistsPerGame: number;
  stealsPerGame: number;
  blocksPerGame: number;
  fieldGoalPercentage: number;
  threePointPercentage: number;
  freeThrowPercentage: number;
  turnoversPerGame: number;
  foulsPerGame: number;
  plusMinus: number;
  recentTrend: 'improving' | 'declining' | 'stable';
}

export interface PlayerAnalysis {
  strengths: string[];
  weaknesses: string[];
  developmentPlan: DevelopmentStep[];
  recommendations: string[];
  progressMetrics: string[];
  positionAdvice: string[];
  mentalGameTips: string[];
}

export interface DevelopmentStep {
  area: string;
  specificDrills: string[];
  frequency: string;
  expectedTimeline: string;
  successIndicators: string[];
}

export interface GameContext {
  quarter: number;
  timeRemaining: string;
  score: string; // e.g., "65-62"
  possession: 'our-ball' | 'their-ball' | 'jump-ball';
  timeouts: number;
  fouls: number;
  teamStrengths: string[];
  teamWeaknesses: string[];
  opponentPatterns: string[];
  playerAvailability: string[];
}

export interface GameStrategy {
  id: string;
  name: string;
  opponent: string;
  gameType: string;
  offensiveStrategy: string;
  defensiveStrategy: string;
  keyMatchups: string[];
  adjustments: string[];
  estimatedTokens?: number;
  createdAt: Date;
}

export interface SeasonStats {
  overallRecord: string;
  homeRecord: string;
  awayRecord: string;
  conferenceRecord: string;
  scoringStats: ScoringStats;
  defensiveStats: DefensiveStats;
  playerStats: PlayerStats[];
  recentGames: GameResult[];
  trends: string[];
}

export interface GameResult {
  opponent: string;
  result: 'W' | 'L';
  score: string;
  date: string;
  keyStats: string[];
}

export interface TeamInsights {
  trends: string[];
  keyStats: string[];
  predictions: string[];
  recommendations: string[];
  futurePlanning: string[];
  playoffOutlook: string;
  strengthsToLeverage: string[];
  areasToImprove: string[];
}

export interface WarmupDrills {
  duration: number;
  drills: WarmupDrill[];
  progression: string[];
  safetyNotes: string[];
  sportSpecific: string[];
}

export interface WarmupDrill {
  name: string;
  description: string;
  duration: number;
  intensity: 'low' | 'medium' | 'high';
  playerCount: number;
  equipment: string[];
}

export interface OpponentData {
  teamName: string;
  record: string;
  recentGames: GameResult[];
  keyPlayers: OpponentPlayer[];
  offensiveStats: ScoringStats;
  defensiveStats: DefensiveStats;
  style: string;
  tendencies: string[];
  strengths: string[];
  weaknesses: string[];
}

export interface OpponentPlayer {
  name: string;
  position: string;
  keyStats: string[];
  tendencies: string[];
  howToDefend: string[];
}

export interface OpponentAnalysis {
  overview: string;
  keyPlayers: OpponentPlayer[];
  offensiveTendencies: string[];
  defensiveApproach: string;
  weaknesses: string[];
  gamePlan: string[];
  keyMatchups: string[];
  tempoPreferences: string;
}

// AI Response types for structured parsing
export interface AIResponse {
  success: boolean;
  data: any;
  error?: string;
  timestamp: Date;
}

export interface AIGenerationRequest {
  type: 'play' | 'practice' | 'analysis' | 'strategy' | 'insights' | 'drills' | 'scouting';
  parameters: any;
  userId: string;
  teamId: string;
}

export interface AIGenerationResult {
  requestId: string;
  type: string;
  result: any;
  metadata: {
    model: string;
    tokensUsed: number;
    generationTime: number;
    confidence: number;
  };
  timestamp: Date;
}

export interface AIUsageMetrics {
  userId: string;
  date: string;
  playsGenerated: number;
  practicePlansGenerated: number;
  strategiesGenerated: number;
  totalTokens: number;
  estimatedCost: number;
}

export interface AILimits {
  maxPlaysPerMonth: number;
  maxPracticePlansPerMonth: number;
  maxStrategiesPerMonth: number;
  maxTokensPerRequest: number;
  dailyTokenLimit: number;
}
