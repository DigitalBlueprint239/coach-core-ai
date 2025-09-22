// Core application types
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  teamId?: string;
  teamName?: string;
  teamSize?: number;
  totalPlays?: number;
  totalPracticePlans?: number;
  role?: 'head_coach' | 'assistant_coach' | 'player' | 'parent';
  permissions?: string[];
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface Team {
  id: string;
  name: string;
  headCoachId: string;
  assistantCoachIds: string[];
  sport: string;
  ageGroup: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Play {
  id: string;
  teamId: string;
  title: string;
  description: string;
  formation: string;
  type: 'offense' | 'defense' | 'special_teams';
  players: Player[];
  routes: Route[];
  alternatives: Play[];
  metadata: PlayMetadata;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface Player {
  id: number;
  position: string;
  x: number;
  y: number;
  number: number;
}

export interface Route {
  id: string;
  playerId: number;
  path?: { x: number; y: number }[];
  points?: { x: number; y: number }[];
  type: string;
  color?: string;
}

export interface PlayMetadata {
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number;
  tags: string[];
}

export interface PracticePlan {
  id: string;
  teamId: string;
  title: string;
  description: string;
  duration: number;
  periods: PracticePeriod[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface PracticePeriod {
  id: string;
  name: string;
  duration: number;
  drills: Drill[];
}

export interface Drill {
  id: string;
  name: string;
  description: string;
  duration: number;
  intensity: 'low' | 'medium' | 'high';
}

export interface Game {
  id: string;
  teamId: string;
  opponent: string;
  date: Date;
  location: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  score?: {
    home: number;
    away: number;
  };
}

export interface AIInsight {
  id: string;
  type: 'suggestion' | 'warning' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string[];
  metadata: Record<string, any>;
}

// AI Service types
export interface AISuggestion {
  id: string;
  type: string;
  title: string;
  description: string;
  reasoning: string[];
  confidence: number;
  formation: string;
  players: Player[];
  routes: Route[];
  alternatives: AISuggestion[];
  metadata: Record<string, any>;
}

export interface AIValidation {
  type: string;
  severity: string;
  message: string;
}

// Template types
export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  data: any;
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
  categories: {
    practiceReminders: boolean;
    achievements: boolean;
    scheduleChanges: boolean;
    emergencyAlerts: boolean;
  };
}

// Color theme types
export interface ColorTheme {
  blue: string;
  green: string;
  purple: string;
  orange: string;
  pink: string;
}

// Team context types
export interface TeamContext {
  teamId: string;
  teamName: string;
  sport: string;
  ageGroup: string;
}

export interface GameContext {
  gameId: string;
  opponent: string;
  date: Date;
  location: string;
}

// Callback function types
export type OnSelectTemplate = (template: Template) => void;
export type OnStartFromScratch = () => void;
export type OnSelect = (item: any) => void;
export type OnApplySuggestion = (suggestion: AISuggestion) => void;
export type OnRoleChange = (role: string) => void;

// Utility types
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type LogContext = Record<string, any>;

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: Date;
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Generated Play types
export interface GeneratedPlay {
  success: boolean;
  data?: AISuggestion;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Waitlist types
export interface WaitlistEntry {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
  status: 'pending' | 'approved' | 'rejected';
}

// Beta testing types
export interface BetaUser {
  id: string;
  email: string;
  role: string;
  teamId?: string;
  sport?: string;
  ageGroup?: string;
  features: string[];
  createdAt: Date;
}

export interface BetaFeedback {
  id: string;
  userId: string;
  feature: string;
  feedback: string;
  rating: number;
  category: 'general' | 'bug' | 'feature_request' | 'ui' | 'performance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
}

// Subscription types
export interface Subscription {
  id: string;
  userId: string;
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'inactive' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired';
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSubscriptionProfile {
  subscription: Subscription | null;
  hasFeatureAccess: (feature: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

// Performance monitoring types
export interface PerformanceMetrics {
  LCP: number;
  CLS: number;
  FCP: number;
  TTFB: number;
  FID?: number;
  INP?: number;
}

export interface CoreWebVitalsThresholds {
  LCP: number;
  CLS: number;
  FCP: number;
  TTFB: number;
  FID: number;
  INP: number;
}

// Audit log types
export interface AuditLogEntry {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  userId: string;
  userEmail: string;
  teamId?: string;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  success: boolean;
  errorMessage?: string;
  environment: 'development' | 'staging' | 'production';
  timestamp: Date;
}

// Security types
export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Offline queue types
export interface OfflineQueueItem {
  id: string;
  action: string;
  data: any;
  timestamp: Date;
  retryCount: number;
  priority: 'high' | 'medium' | 'low' | 'critical';
}

export interface OfflineQueueStatus {
  isOnline: boolean;
  pendingItems: number;
  lastSync: Date | null;
  errors: string[];
}

// PWA types
export interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Error boundary types
export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

// Responsive types
export interface ResponsiveConfig {
  breakpoints: {
    base: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  columns: {
    '1': { base: 1; sm: 1; md: 1; lg: 1; xl: 1 };
    '2': { base: 1; sm: 1; md: 2; lg: 2; xl: 2 };
    '3': { base: 1; sm: 2; md: 2; lg: 3; xl: 3 };
    '4': { base: 1; sm: 2; md: 3; lg: 4; xl: 4 };
    '5': { base: 1; sm: 2; md: 3; lg: 4; xl: 5 };
    '6': { base: 1; sm: 2; md: 3; lg: 4; xl: 6 };
    '12': { base: 1; sm: 2; md: 3; lg: 6; xl: 12 };
  };
  stats: {
    sidebar: { base: 1; sm: 1; md: 1; lg: 1; xl: 1 };
    twoColumn: { base: 1; sm: 1; md: 2; lg: 2; xl: 2 };
    threeColumn: { base: 1; sm: 2; md: 2; lg: 3; xl: 3 };
  };
}

// Export all types as default
export * from './api';
export * from './auth';
export * from './firebase';
export * from './ui';
