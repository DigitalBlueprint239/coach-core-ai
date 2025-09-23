import { getRemoteConfig, fetchAndActivate, getAll } from 'firebase/remote-config';
import app from '../firebase/firebase-config';
import secureLogger from '../../utils/secure-logger';

// Feature flag types
export interface FeatureFlag {
  key: string;
  value: boolean | string | number;
  description: string;
  category: 'beta' | 'experimental' | 'production' | 'deprecated';
  enabledFor: 'all' | 'beta_users' | 'specific_users' | 'percentage';
  targetUsers?: string[];
  rolloutPercentage?: number;
  lastModified: Date;
}

// Beta user interface
export interface BetaUser {
  uid: string;
  userId: string; // Keep for backward compatibility
  email: string;
  name: string;
  displayName: string; // Add for component compatibility
  role: 'admin' | 'coach' | 'tester';
  teamId?: string;
  sport?: string;
  ageGroup?: string;
  features: string[];
  enrolledAt: Date;
  lastActiveAt: Date;
  joinedAt: Date; // Add for component compatibility
  feedbackCount: number;
  errorCount: number;
  featuresUsed: string[];
  status: 'active' | 'inactive' | 'suspended';
  notes?: string;
}

// Feature access interface
export interface FeatureAccess {
  feature: string;
  hasAccess: boolean;
  reason: 'enabled_for_all' | 'beta_user' | 'specific_user' | 'percentage_rollout' | 'disabled';
  metadata?: {
    rolloutPercentage?: number;
    userTier?: string;
    enrollmentDate?: Date;
  };
}

// Beta feedback interface
export interface BetaFeedback {
  id: string;
  userId: string;
  feature: string;
  feedback: string;
  rating: number; // 1-5 scale
  category: 'bug' | 'feature_request' | 'general' | 'performance' | 'ui_ux';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    userAgent?: string;
    browser?: string;
    device?: string;
    screenSize?: string;
    url?: string;
  };
}

// Feature flag service class
class FeatureFlagService {
  private remoteConfig: ReturnType<typeof getRemoteConfig> | null = null;
  private isInitialized = false;
  private betaUsers: Map<string, BetaUser> = new Map();
  private featureFlags: Map<string, FeatureFlag> = new Map();
  private feedbackLog: BetaFeedback[] = [];

  // Default feature flags
  private defaultFlags = {
    betaFeatures: {
      key: 'betaFeatures',
      value: false,
      description: 'Enable beta features for selected users',
      category: 'beta' as const,
      enabledFor: 'beta_users' as const,
      lastModified: new Date(),
    },
    playDesigner: {
      key: 'playDesigner',
      value: false,
      description: 'Enable Play Designer feature',
      category: 'beta' as const,
      enabledFor: 'beta_users' as const,
      lastModified: new Date(),
    },
    dashboard: {
      key: 'dashboard',
      value: false,
      description: 'Enable Dashboard feature',
      category: 'beta' as const,
      enabledFor: 'beta_users' as const,
      lastModified: new Date(),
    },
    aiPlayGenerator: {
      key: 'aiPlayGenerator',
      value: false,
      description: 'Enable AI Play Generator feature',
      category: 'beta' as const,
      enabledFor: 'beta_users' as const,
      lastModified: new Date(),
    },
    teamManagement: {
      key: 'teamManagement',
      value: false,
      description: 'Enable Team Management feature',
      category: 'beta' as const,
      enabledFor: 'beta_users' as const,
      lastModified: new Date(),
    },
    practicePlanner: {
      key: 'practicePlanner',
      value: false,
      description: 'Enable Practice Planner feature',
      category: 'beta' as const,
      enabledFor: 'beta_users' as const,
      lastModified: new Date(),
    },
  };

  constructor() {
    this.initializeRemoteConfig();
  }

  // Initialize Firebase Remote Config
  private async initializeRemoteConfig() {
    try {
      this.remoteConfig = getRemoteConfig(app);
      
      // Set minimum fetch interval (1 hour for production, 0 for development)
      this.remoteConfig.settings = {
        minimumFetchIntervalMillis: (typeof window !== 'undefined' && (window as any).location?.hostname === 'localhost') ? 0 : 3600000,
        fetchTimeoutMillis: 60000,
      };

      // Set default values - convert to simple key-value pairs
      const defaultConfig: Record<string, boolean> = {};
      Object.entries(this.defaultFlags).forEach(([key, flag]) => {
        defaultConfig[key] = flag.value as boolean;
      });
      this.remoteConfig.defaultConfig = defaultConfig;

      // Fetch and activate
      await fetchAndActivate(this.remoteConfig);
      
      this.isInitialized = true;
      this.loadFeatureFlags();
      
      secureLogger.info('Firebase Remote Config initialized successfully');
    } catch (error) {
      secureLogger.error('Failed to initialize Firebase Remote Config', { error });
    }
  }

  // Load feature flags from Remote Config
  private loadFeatureFlags() {
    if (!this.isInitialized || !this.remoteConfig) return;

    try {
      const allFlags = getAll(this.remoteConfig);
      
      Object.entries(allFlags).forEach(([key, value]) => {
        const flag: FeatureFlag = {
          key,
          value: value.asBoolean(),
          description: this.defaultFlags[key as keyof typeof this.defaultFlags]?.description || '',
          category: this.defaultFlags[key as keyof typeof this.defaultFlags]?.category || 'production',
          enabledFor: this.defaultFlags[key as keyof typeof this.defaultFlags]?.enabledFor || 'all',
          lastModified: new Date(),
        };
        
        this.featureFlags.set(key, flag);
      });

      secureLogger.info('Feature flags loaded', { count: this.featureFlags.size });
    } catch (error) {
      secureLogger.error('Failed to load feature flags', { error });
    }
  }

  // Check if feature is enabled
  isFeatureEnabled(featureKey: string, userId?: string): boolean {
    if (!this.isInitialized) {
      secureLogger.warn('Remote Config not initialized, using default values');
      return this.defaultFlags[featureKey as keyof typeof this.defaultFlags]?.value || false;
    }

    try {
      const flag = this.featureFlags.get(featureKey);
      if (!flag) return false;

      // Check if feature is enabled for all users
      if (flag.enabledFor === 'all') return true;

      // Check if user is a beta user
      if (flag.enabledFor === 'beta_users' && userId) {
        return this.isBetaUser(userId);
      }

      // Check if user is in specific users list
      if (flag.enabledFor === 'specific_users' && userId && flag.targetUsers) {
        return flag.targetUsers.includes(userId);
      }

      // Check percentage rollout
      if (flag.enabledFor === 'percentage' && userId && flag.rolloutPercentage) {
        return this.isUserInRollout(userId, flag.rolloutPercentage);
      }

      return false;
    } catch (error) {
      secureLogger.error('Error checking feature flag', { error, featureKey, userId });
      return false;
    }
  }

  // Get feature access details
  getFeatureAccess(featureKey: string, userId?: string): FeatureAccess {
    const hasAccess = this.isFeatureEnabled(featureKey, userId);
    const flag = this.featureFlags.get(featureKey);

    let reason: FeatureAccess['reason'] = 'disabled';
    if (hasAccess) {
      if (flag?.enabledFor === 'all') reason = 'enabled_for_all';
      else if (flag?.enabledFor === 'beta_users' && userId && this.isBetaUser(userId)) reason = 'beta_user';
      else if (flag?.enabledFor === 'specific_users' && userId && flag.targetUsers?.includes(userId)) reason = 'specific_user';
      else if (flag?.enabledFor === 'percentage' && userId) reason = 'percentage_rollout';
    }

    return {
      feature: featureKey,
      hasAccess,
      reason,
      metadata: {
        rolloutPercentage: flag?.rolloutPercentage,
        userTier: this.getUserTier(userId),
        enrollmentDate: userId ? this.getBetaUserEnrollmentDate(userId) : undefined,
      },
    };
  }

  // Check if user is a beta user
  isBetaUser(userId: string): boolean {
    const betaUser = this.betaUsers.get(userId);
    return betaUser ? betaUser.status === 'active' : false;
  }

  // Add beta user
  addBetaUser(user: Omit<BetaUser, 'enrolledAt' | 'lastActiveAt' | 'joinedAt' | 'feedbackCount' | 'errorCount' | 'featuresUsed'>): void {
    const uid = user.uid || `beta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const betaUser: BetaUser = {
      ...user,
      uid,
      userId: user.userId || uid, // Backward compatibility
      displayName: user.displayName || user.name,
      features: user.features || [],
      enrolledAt: new Date(),
      lastActiveAt: new Date(),
      joinedAt: new Date(),
      feedbackCount: 0,
      errorCount: 0,
      featuresUsed: [],
      status: 'active',
    };

    this.betaUsers.set(uid, betaUser);
    this.betaUsers.set(user.userId || uid, betaUser); // Store by both keys for compatibility
    secureLogger.info('Beta user added', { uid, userId: user.userId || uid, email: user.email });
  }

  // Remove beta user
  removeBetaUser(userId: string): void {
    const betaUser = this.betaUsers.get(userId);
    if (betaUser) {
      betaUser.status = 'inactive';
      this.betaUsers.set(userId, betaUser);
      this.betaUsers.set(betaUser.uid, betaUser); // Update both keys
      secureLogger.info('Beta user removed', { userId, uid: betaUser.uid });
    }
  }

  // Update beta user
  updateBetaUser(uid: string, updates: Partial<BetaUser>): void {
    const betaUser = this.betaUsers.get(uid);
    if (betaUser) {
      const updatedUser = {
        ...betaUser,
        ...updates,
        lastActiveAt: new Date(),
      };
      this.betaUsers.set(uid, updatedUser);
      this.betaUsers.set(betaUser.userId, updatedUser); // Update both keys
      secureLogger.info('Beta user updated', { uid, userId: betaUser.userId });
    }
  }

  // Get beta user
  getBetaUser(userId: string): BetaUser | undefined {
    return this.betaUsers.get(userId);
  }

  // Get all beta users
  getAllBetaUsers(): BetaUser[] {
    return Array.from(this.betaUsers.values());
  }

  // Update beta user activity
  updateBetaUserActivity(userId: string, feature?: string): void {
    const betaUser = this.betaUsers.get(userId);
    if (betaUser) {
      betaUser.lastActiveAt = new Date();
      if (feature && !betaUser.featuresUsed.includes(feature)) {
        betaUser.featuresUsed.push(feature);
      }
      this.betaUsers.set(userId, betaUser);
    }
  }

  // Log beta user feedback
  logBetaFeedback(feedback: Omit<BetaFeedback, 'id' | 'createdAt' | 'updatedAt'>): string {
    const feedbackId = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newFeedback: BetaFeedback = {
      ...feedback,
      id: feedbackId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.feedbackLog.push(newFeedback);

    // Update beta user feedback count
    const betaUser = this.betaUsers.get(feedback.userId);
    if (betaUser) {
      betaUser.feedbackCount++;
      this.betaUsers.set(feedback.userId, betaUser);
    }

    secureLogger.info('Beta feedback logged', { 
      feedbackId, 
      userId: feedback.userId, 
      feature: feedback.feature,
      category: feedback.category,
      priority: feedback.priority 
    });

    return feedbackId;
  }

  // Log beta user error
  logBetaError(userId: string, error: Error, feature: string, context?: Record<string, unknown>): void {
    // Update beta user error count
    const betaUser = this.betaUsers.get(userId);
    if (betaUser) {
      betaUser.errorCount++;
      this.betaUsers.set(userId, betaUser);
    }

    secureLogger.error('Beta user error logged', { 
      userId, 
      feature, 
      error: error.message, 
      stack: error.stack,
      context 
    });
  }

  // Get feedback by user
  getFeedbackByUser(userId: string): BetaFeedback[] {
    return this.feedbackLog.filter(feedback => feedback.userId === userId);
  }

  // Get feedback by feature
  getFeedbackByFeature(feature: string): BetaFeedback[] {
    return this.feedbackLog.filter(feedback => feedback.feedback === feature);
  }

  // Get all feedback
  getAllFeedback(): BetaFeedback[] {
    return [...this.feedbackLog];
  }

  // Get user tier
  private getUserTier(userId?: string): string {
    if (!userId) return 'anonymous';
    if (this.isBetaUser(userId)) return 'beta';
    return 'standard';
  }

  // Check if user is in rollout percentage
  private isUserInRollout(userId: string, percentage: number): boolean {
    // Simple hash-based rollout
    const hash = this.hashString(userId);
    return (hash % 100) < percentage;
  }

  // Get beta user enrollment date
  private getBetaUserEnrollmentDate(userId: string): Date | undefined {
    const betaUser = this.betaUsers.get(userId);
    return betaUser?.enrolledAt;
  }

  // Simple string hash function
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Refresh feature flags
  async refreshFeatureFlags(): Promise<void> {
    if (!this.isInitialized || !this.remoteConfig) return;

    try {
      await fetchAndActivate(this.remoteConfig);
      this.loadFeatureFlags();
      secureLogger.info('Feature flags refreshed');
    } catch (error) {
      secureLogger.error('Failed to refresh feature flags', { error });
    }
  }

  // Get all feature flags
  getAllFeatureFlags(): FeatureFlag[] {
    return Array.from(this.featureFlags.values());
  }

  // Get feature flag by key
  getFeatureFlag(key: string): FeatureFlag | undefined {
    return this.featureFlags.get(key);
  }

  // Check if service is initialized
  isReady(): boolean {
    return this.isInitialized;
  }

  // Get debug information
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      featureFlagsCount: this.featureFlags.size,
      betaUsersCount: this.betaUsers.size,
      feedbackCount: this.feedbackLog.length,
      defaultFlags: this.defaultFlags,
    };
  }
}

// Create singleton instance
export const featureFlagService = new FeatureFlagService();

// Export types and service
export { FeatureFlagService };
export default featureFlagService;
