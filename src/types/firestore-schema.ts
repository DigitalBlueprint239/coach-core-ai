// src/types/firestore-schema.ts
import { Timestamp, FieldValue } from 'firebase/firestore';
import {
  FootballLevel,
  BaseFootballEntity,
  LevelConstraints,
} from './football';

// ============================================
// CORE DATA TYPES
// ============================================

export interface BaseDocument {
  id?: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  createdBy: string;
}

// ============================================
// USER MANAGEMENT
// ============================================

export interface User extends BaseDocument {
  email: string;
  displayName: string;
  photoURL?: string;
  roles: UserRole[];
  teamIds: string[];
  persona: CoachPersona;
  preferences: UserPreferences;
  subscription: Subscription;
  lastActiveAt: Timestamp;
  isEmailVerified: boolean;
  phoneNumber?: string;
  timezone: string;
  language: string;
}

export type UserRole =
  | 'head_coach'
  | 'assistant_coach'
  | 'player'
  | 'parent'
  | 'admin';
export type CoachPersona =
  | 'first_time_coach'
  | 'experienced_coach'
  | 'youth_coach'
  | 'high_school_coach'
  | 'college_coach';

export interface UserPreferences {
  notifications: NotificationPreferences;
  ai: AIPreferences;
  theme: 'light' | 'dark' | 'auto';
  privacy: PrivacySettings;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  types: NotificationType[];
}

export type NotificationType =
  | 'practice_reminder'
  | 'game_reminder'
  | 'team_update'
  | 'ai_insight'
  | 'achievement';

export interface AIPreferences {
  autoSuggest: boolean;
  confidenceThreshold: number; // 0-1
  aiPersonality: 'conservative' | 'balanced' | 'aggressive';
  enableVoiceCommands: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'team_only' | 'private';
  shareAnalytics: boolean;
  allowDataCollection: boolean;
}

export interface Subscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  expiresAt: Timestamp;
  features: string[];
  billingCycle: 'monthly' | 'yearly';
}

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trial';

// ============================================
// TEAM MANAGEMENT
// ============================================

export interface Team extends BaseDocument, BaseFootballEntity {
  name: string;
  sport: Sport;
  level: FootballLevel;
  season: string;
  coachIds: string[];
  playerIds: string[];
  settings: TeamSettings;
  stats: TeamStats;
  location: TeamLocation;
  schedule: TeamSchedule;
  constraints?: LevelConstraints;
  level_extensions?: Record<string, any>;
}

export type Sport =
  | 'football'
  | 'basketball'
  | 'soccer'
  | 'baseball'
  | 'volleyball'
  | 'hockey'
  | 'lacrosse'
  | 'track'
  | 'swimming'
  | 'tennis';
export type AgeGroup =
  | 'youth'
  | 'middle_school'
  | 'high_school'
  | 'college'
  | 'adult'
  | 'senior';

export interface TeamSettings {
  isPublic: boolean;
  allowPlayerFeedback: boolean;
  enableAI: boolean;
  requireApproval: boolean;
  maxPlayers: number;
  allowGuestAccess: boolean;
}

export interface TeamStats {
  totalPlayers: number;
  totalPlays: number;
  totalPracticePlans: number;
  averageAttendance: number;
  winLossRecord: WinLossRecord;
  seasonStartDate: Timestamp;
  seasonEndDate: Timestamp;
}

export interface WinLossRecord {
  wins: number;
  losses: number;
  ties: number;
  winPercentage: number;
}

export interface TeamLocation {
  city: string;
  state: string;
  country: string;
  timezone: string;
  venue: string;
}

export interface TeamSchedule {
  practiceDays: string[];
  practiceTime: string;
  gameSchedule: GameSchedule[];
}

export interface GameSchedule {
  id: string;
  opponent: string;
  date: Timestamp;
  location: string;
  isHome: boolean;
  result?: GameResult;
}

export interface GameResult {
  homeScore: number;
  awayScore: number;
  highlights: string[];
  notes: string;
}

// ============================================
// PLAYER MANAGEMENT
// ============================================

export interface Player extends BaseDocument, BaseFootballEntity {
  teamId: string;
  userId?: string; // Link to users collection if registered
  firstName: string;
  lastName: string;
  jerseyNumber: number;
  position: PlayerPosition;
  grade: number;
  email?: string;
  phone?: string;
  parentEmail?: string;
  parentPhone?: string;
  physicalInfo: PhysicalInfo;
  medicalInfo: MedicalInfo;
  stats: PlayerStats;
  achievements: PlayerAchievement[];
  notes: string;
  level: FootballLevel;
  constraints?: LevelConstraints;
  level_extensions?: Record<string, any>;
}

export type PlayerPosition =
  | 'quarterback'
  | 'running_back'
  | 'wide_receiver'
  | 'tight_end'
  | 'offensive_line'
  | 'defensive_line'
  | 'linebacker'
  | 'cornerback'
  | 'safety'
  | 'kicker'
  | 'punter'
  | 'point_guard'
  | 'shooting_guard'
  | 'small_forward'
  | 'power_forward'
  | 'center'
  | 'forward'
  | 'midfielder'
  | 'defender'
  | 'goalkeeper'
  | 'pitcher'
  | 'catcher'
  | 'infielder'
  | 'outfielder'
  | 'utility';

export interface PhysicalInfo {
  height: number; // inches
  weight: number; // pounds
  age: number;
  dominantHand: 'left' | 'right' | 'ambidextrous';
  dominantFoot: 'left' | 'right' | 'ambidextrous';
}

export interface MedicalInfo {
  allergies: string[];
  medications: string[];
  conditions: string[];
  emergencyContact: EmergencyContact;
  insuranceInfo?: InsuranceInfo;
  lastPhysicalDate?: Timestamp;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
  email?: string;
}

export interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  groupNumber?: string;
}

export interface PlayerStats {
  attendance: number; // percentage
  skillRating: number; // 1-5
  badges: string[];
  performance: PerformanceMetrics;
  improvement: ImprovementMetrics;
}

export interface PerformanceMetrics {
  [metric: string]: {
    value: number;
    maxValue: number;
    unit: string;
    category: string;
  };
}

export interface ImprovementMetrics {
  overallProgress: number; // percentage
  strengths: string[];
  areasForImprovement: string[];
  goals: PlayerGoal[];
}

export interface PlayerGoal {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  deadline: Timestamp;
  isCompleted: boolean;
}

export interface PlayerAchievement {
  id: string;
  title: string;
  description: string;
  category: string;
  earnedAt: Timestamp;
  icon: string;
}

// ============================================
// PRACTICE PLANS
// ============================================

export interface PracticePlan extends BaseDocument {
  teamId: string;
  name: string;
  date: Timestamp;
  duration: number; // minutes
  periods: PracticePeriod[];
  goals: string[];
  notes: string;
  status: PracticeStatus;
  weather?: WeatherInfo;
  equipment: string[];
  attendance: AttendanceRecord[];
  feedback: PracticeFeedback[];
}

export type PracticeStatus =
  | 'draft'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface PracticePeriod {
  id: string;
  name: string;
  duration: number; // minutes
  type: PeriodType;
  drills: Drill[];
  notes: string;
  order: number;
}

export type PeriodType =
  | 'warmup'
  | 'skill_development'
  | 'team_drill'
  | 'scrimmage'
  | 'conditioning'
  | 'cool_down';

export interface Drill {
  id: string;
  name: string;
  description: string;
  duration: number;
  equipment: string[];
  playersInvolved: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  instructions: string[];
  variations: string[];
  coachingPoints: string[];
}

export interface WeatherInfo {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
}

export interface AttendanceRecord {
  playerId: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  checkInTime?: Timestamp;
  notes?: string;
}

export interface PracticeFeedback {
  id: string;
  playerId: string;
  rating: number; // 1-5
  comments: string;
  submittedAt: Timestamp;
}

// ============================================
// PLAYS AND PLAYBOOK
// ============================================

export interface Play extends BaseDocument, BaseFootballEntity {
  teamId: string;
  name: string;
  formation: string;
  description: string;
  routes: Route[];
  players: PlayPlayer[];
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  sport: Sport;
  category: PlayCategory;
  successRate?: number;
  usageCount: number;
  lastUsed?: Timestamp;
  diagram?: string; // URL to diagram image
  video?: string; // URL to video
  level: FootballLevel;
  constraints?: LevelConstraints;
  level_extensions?: Record<string, any>;
}

export type PlayCategory =
  | 'offense'
  | 'defense'
  | 'special_teams'
  | 'situational'
  | 'red_zone'
  | 'two_minute';

export interface Route {
  id: string;
  playerId: string;
  path: Point[];
  type: RouteType;
  timing: number;
  description: string;
  keyPoints: string[];
}

export type RouteType = 'run' | 'pass' | 'block' | 'defend' | 'cover' | 'blitz';

export interface Point {
  x: number;
  y: number;
  timestamp?: number;
}

export interface PlayPlayer {
  id: string;
  number: number;
  position: string;
  x: number;
  y: number;
  role: string;
  responsibilities: string[];
}

// ============================================
// ANALYTICS AND FEEDBACK
// ============================================

export interface AnalyticsEvent extends BaseDocument {
  userId: string;
  teamId?: string;
  eventType: AnalyticsEventType;
  eventData: Record<string, any>;
  sessionId: string;
  userAgent: string;
  timestamp: Timestamp;
}

export type AnalyticsEventType =
  | 'page_view'
  | 'feature_used'
  | 'ai_interaction'
  | 'practice_created'
  | 'play_created'
  | 'player_added'
  | 'team_joined'
  | 'subscription_changed';

export interface Feedback extends BaseDocument {
  userId: string;
  type: FeedbackType;
  category: string;
  title: string;
  description: string;
  rating?: number;
  status: FeedbackStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  resolvedAt?: Timestamp;
  resolution?: string;
}

export type FeedbackType =
  | 'bug_report'
  | 'feature_request'
  | 'general_feedback'
  | 'support_request';
export type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

// ============================================
// AI AND MACHINE LEARNING
// ============================================

export interface AIInsight extends BaseDocument {
  userId: string;
  teamId?: string;
  type: InsightType;
  title: string;
  description: string;
  confidence: number; // 0-1
  data: Record<string, any>;
  recommendations: string[];
  isActionable: boolean;
  expiresAt?: Timestamp;
  isRead: boolean;
}

export type InsightType =
  | 'performance'
  | 'strategy'
  | 'player_development'
  | 'team_dynamics'
  | 'opponent_analysis'
  | 'suggestion_outcome';

export interface AIConversation extends BaseDocument {
  userId: string;
  teamId?: string;
  messages: AIMessage[];
  context: ConversationContext;
  summary?: string;
  isActive: boolean;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Timestamp;
  metadata?: Record<string, any>;
}

export interface ConversationContext {
  sport: Sport;
  teamLevel: string;
  currentFocus: string;
  recentActivities: string[];
}

// ============================================
// NOTIFICATIONS
// ============================================

export interface Notification extends BaseDocument {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: Timestamp;
  priority: 'low' | 'medium' | 'high';
  expiresAt?: Timestamp;
  actionUrl?: string;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const ValidationSchemas = {
  user: {
    email: { required: true, type: 'email', maxLength: 255 },
    displayName: { required: true, minLength: 2, maxLength: 100 },
    roles: { required: true, type: 'array', minLength: 1 },
    persona: {
      required: true,
      type: 'enum',
      values: [
        'first_time_coach',
        'experienced_coach',
        'youth_coach',
        'high_school_coach',
        'college_coach',
      ],
    },
  },

  team: {
    name: { required: true, minLength: 2, maxLength: 100 },
    sport: {
      required: true,
      type: 'enum',
      values: [
        'football',
        'basketball',
        'soccer',
        'baseball',
        'volleyball',
        'hockey',
        'lacrosse',
        'track',
        'swimming',
        'tennis',
      ],
    },
    level: {
      required: true,
      type: 'enum',
      values: Object.values(FootballLevel),
    },
    coachIds: { required: true, type: 'array', minLength: 1 },
    constraints: { required: false, type: 'object' },
    level_extensions: { required: false, type: 'object' },
  },

  player: {
    firstName: { required: true, minLength: 1, maxLength: 50 },
    lastName: { required: true, minLength: 1, maxLength: 50 },
    jerseyNumber: { required: true, type: 'number', min: 0, max: 99 },
    position: { required: true, minLength: 1, maxLength: 50 },
    teamId: { required: true, type: 'string' },
    level: {
      required: true,
      type: 'enum',
      values: Object.values(FootballLevel),
    },
    constraints: { required: false, type: 'object' },
    level_extensions: { required: false, type: 'object' },
  },

  practicePlan: {
    name: { required: true, minLength: 1, maxLength: 200 },
    teamId: { required: true, type: 'string' },
    date: { required: true, type: 'timestamp' },
    duration: { required: true, type: 'number', min: 15, max: 480 },
    periods: { required: true, type: 'array', minLength: 1 },
  },

  play: {
    name: { required: true, minLength: 1, maxLength: 100 },
    teamId: { required: true, type: 'string' },
    formation: { required: true, minLength: 1, maxLength: 50 },
    description: { required: true, minLength: 10, maxLength: 1000 },
    routes: { required: true, type: 'array', minLength: 1 },
    players: { required: true, type: 'array', minLength: 1 },
    level: {
      required: true,
      type: 'enum',
      values: Object.values(FootballLevel),
    },
    constraints: { required: false, type: 'object' },
    level_extensions: { required: false, type: 'object' },
  },
};

// ============================================
// COLLECTION NAMES
// ============================================

export const COLLECTIONS = {
  USERS: 'users',
  TEAMS: 'teams',
  PLAYERS: 'players',
  PRACTICE_PLANS: 'practicePlans',
  PLAYS: 'plays',
  ANALYTICS_EVENTS: 'analyticsEvents',
  FEEDBACK: 'feedback',
  AI_INSIGHTS: 'aiInsights',
  AI_CONVERSATIONS: 'aiConversations',
  NOTIFICATIONS: 'notifications',
  USER_PROFILES: 'userProfiles',
  TEAM_STATS: 'teamStats',
  PLAYER_STATS: 'playerStats',
  PRACTICE_FEEDBACK: 'practiceFeedback',
  ATTENDANCE: 'attendance',
  GAME_SCHEDULE: 'gameSchedule',
  ACHIEVEMENTS: 'achievements',
  BADGES: 'badges',
  EQUIPMENT: 'equipment',
  DRILL_LIBRARY: 'drillLibrary',
} as const;

// ============================================
// INDEX CONFIGURATIONS
// ============================================

export const INDEX_CONFIGS = {
  // User indexes
  users_email: { collection: 'users', fields: ['email', 'createdAt'] },
  users_roles: { collection: 'users', fields: ['roles', 'createdAt'] },
  users_teamIds: { collection: 'users', fields: ['teamIds', 'createdAt'] },

  // Team indexes
  teams_coachIds: { collection: 'teams', fields: ['coachIds', 'createdAt'] },
  teams_sport_ageGroup: {
    collection: 'teams',
    fields: ['sport', 'ageGroup', 'createdAt'],
  },
  teams_season: { collection: 'teams', fields: ['season', 'createdAt'] },

  // Player indexes
  players_teamId: { collection: 'players', fields: ['teamId', 'createdAt'] },
  players_position: { collection: 'players', fields: ['position', 'teamId'] },
  players_jerseyNumber: {
    collection: 'players',
    fields: ['jerseyNumber', 'teamId'],
  },

  // Practice plan indexes
  practicePlans_teamId_date: {
    collection: 'practicePlans',
    fields: ['teamId', 'date', 'createdAt'],
  },
  practicePlans_status: {
    collection: 'practicePlans',
    fields: ['status', 'teamId'],
  },
  practicePlans_createdBy: {
    collection: 'practicePlans',
    fields: ['createdBy', 'createdAt'],
  },

  // Play indexes
  plays_teamId_category: {
    collection: 'plays',
    fields: ['teamId', 'category', 'createdAt'],
  },
  plays_difficulty: { collection: 'plays', fields: ['difficulty', 'teamId'] },
  plays_tags: { collection: 'plays', fields: ['tags', 'teamId'] },

  // Analytics indexes
  analytics_userId_eventType: {
    collection: 'analyticsEvents',
    fields: ['userId', 'eventType', 'timestamp'],
  },
  analytics_teamId: {
    collection: 'analyticsEvents',
    fields: ['teamId', 'timestamp'],
  },

  // Notification indexes
  notifications_userId_read: {
    collection: 'notifications',
    fields: ['userId', 'isRead', 'createdAt'],
  },
  notifications_type: {
    collection: 'notifications',
    fields: ['type', 'userId'],
  },
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
export type IndexConfig = (typeof INDEX_CONFIGS)[keyof typeof INDEX_CONFIGS];

// Placeholder types for missing exports
export interface AISuggestion {
  id: string;
  type: string;
  title: string;
  description: string;
  suggestion: string;
  confidence: number;
  reasoning: string[];
  implementation?: any;
  estimatedImpact?: string;
  prerequisites?: any[];
  createdAt: Timestamp | FieldValue;
}

export interface TeamContext {
  teamId: string;
  teamName: string;
  sport: Sport;
  ageGroup: AgeGroup;
  id?: string; // For backward compatibility
  skillLevel?: string;
  playerCount?: number;
  seasonPhase?: string;
}

export interface GameContext {
  gameId: string;
  opponent: string;
  date: Timestamp;
  location: string;
  down?: number;
  distance?: number;
  fieldPosition?: string;
  scoreDifferential?: number;
  timeRemaining?: number;
  weather?: string;
  opponentTendency?: string;
}

export interface PlayerContext {
  playerId: string;
  firstName: string;
  lastName: string;
  position: PlayerPosition;
  availablePlayers?: any[];
}
