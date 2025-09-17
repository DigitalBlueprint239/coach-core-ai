import { getRemoteConfig, getValue, fetchAndActivate, getAll } from 'firebase/remote-config';
import app from '../firebase/firebase-config';
import secureLogger from '../../utils/secure-logger';

// Feature flag types
export interface FeatureFlags {
  // Beta features
  enablePlayDesigner: boolean;
  enableAdvancedDashboard: boolean;
  enableAIBrain: boolean;
  enableTeamManagement: boolean;
  enablePracticePlanner: boolean;
  enableGameCalendar: boolean;
  enablePerformanceDashboard: boolean;
  
  // UI features
  enableDarkMode: boolean;
  enableAnimations: boolean;
  enableHapticFeedback: boolean;
  enableVoiceCommands: boolean;
  
  // Experimental features
  enableBetaTesting: boolean;
  enableAnalytics: boolean;
  enableErrorReporting: boolean;
  enablePerformanceMonitoring: boolean;
  
  // User-specific features
  enableCoachOnboarding: boolean;
  enablePlayerManagement: boolean;
  enablePlaySharing: boolean;
  enableTeamCollaboration: boolean;
  
  // System features
  enableMaintenanceMode: boolean;
  enableDebugMode: boolean;
  enableTestMode: boolean;
}

// Default feature flags
const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  // Beta features - disabled by default
  enablePlayDesigner: false,
  enableAdvancedDashboard: false,
  enableAIBrain: false,
  enableTeamManagement: false,
  enablePracticePlanner: false,
  enableGameCalendar: false,
  enablePerformanceDashboard: false,
  
  // UI features - enabled by default
  enableDarkMode: true,
  enableAnimations: true,
  enableHapticFeedback: false,
  enableVoiceCommands: false,
  
  // Experimental features - disabled by default
  enableBetaTesting: false,
  enableAnalytics: true,
  enableErrorReporting: true,
  enablePerformanceMonitoring: true,
  
  // User-specific features - enabled by default
  enableCoachOnboarding: true,
  enablePlayerManagement: true,
  enablePlaySharing: true,
  enableTeamCollaboration: true,
  
  // System features - disabled by default
  enableMaintenanceMode: false,
  enableDebugMode: false,
  enableTestMode: false,
};

// Beta user management
export interface BetaUser {
  uid: string;
  email: string;
  name: string;
  role: 'coach' | 'admin' | 'tester';
  teamId?: string;
  sport?: string;
  ageGroup?: string;
  joinedAt: Date;
  lastActiveAt: Date;
  features: string[];
  notes?: string;
}

// Feature flag service class
class FeatureFlagService {
  private remoteConfig: any;
  private featureFlags: FeatureFlags = DEFAULT_FEATURE_FLAGS;
  private betaUsers: Map<string, BetaUser> = new Map();
  private isInitialized = false;
  private listeners: Array<(flags: FeatureFlags) => void> = [];

  constructor() {
    this.initializeRemoteConfig();
  }

  private async initializeRemoteConfig() {
    try {
      this.remoteConfig = getRemoteConfig(app);
      
      // Set cache expiration to 1 hour for production, 1 minute for development
      const cacheExpiration = process.env.NODE_ENV === 'production' ? 3600 : 60;
      this.remoteConfig.settings = {
        minimumFetchIntervalMillis: cacheExpiration * 1000,
        fetchTimeoutMillis: 60000,
      };

      // Set default values (Firebase Remote Config v9+ doesn't have setDefaults)
      // We'll handle defaults in the loadFeatureFlags method

      // Fetch and activate config
      await fetchAndActivate(this.remoteConfig);
      
      // Load feature flags
      this.loadFeatureFlags();
      
      this.isInitialized = true;
      secureLogger.info('Feature flags initialized successfully');
      
      // Notify listeners
      this.notifyListeners();
      
    } catch (error) {
      secureLogger.error('Failed to initialize feature flags', { error });
      // Use default flags as fallback
      this.featureFlags = DEFAULT_FEATURE_FLAGS;
      this.isInitialized = true;
    }
  }

  private loadFeatureFlags() {
    const flags: Partial<FeatureFlags> = {};
    
    Object.keys(DEFAULT_FEATURE_FLAGS).forEach(key => {
      try {
        const value = getValue(this.remoteConfig, key);
        // Check if the value exists and is valid
        if (value && typeof value.asBoolean === 'function') {
          flags[key as keyof FeatureFlags] = value.asBoolean();
        } else {
          // Use default value if remote config value is not available
          flags[key as keyof FeatureFlags] = DEFAULT_FEATURE_FLAGS[key as keyof FeatureFlags];
        }
      } catch (error) {
        secureLogger.warn(`Failed to load feature flag: ${key}`, { error });
        flags[key as keyof FeatureFlags] = DEFAULT_FEATURE_FLAGS[key as keyof FeatureFlags];
      }
    });
    
    this.featureFlags = { ...DEFAULT_FEATURE_FLAGS, ...flags };
  }

  // Get all feature flags
  getFeatureFlags(): FeatureFlags {
    return { ...this.featureFlags };
  }

  // Get a specific feature flag
  getFeatureFlag<K extends keyof FeatureFlags>(key: K): FeatureFlags[K] {
    return this.featureFlags[key];
  }

  // Check if a feature is enabled
  isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    return this.featureFlags[feature];
  }

  // Check if user has access to beta features
  isBetaUser(userId: string): boolean {
    return this.betaUsers.has(userId) || this.featureFlags.enableBetaTesting;
  }

  // Check if user has subscription access to feature
  hasSubscriptionAccess(userId: string, feature: string): boolean {
    // This would integrate with the subscription service
    // For now, return true for all features
    // In production, this would check the user's subscription tier
    return true;
  }

  // Check if user has access to specific beta feature
  hasBetaFeatureAccess(userId: string, feature: string): boolean {
    const user = this.betaUsers.get(userId);
    if (!user) return false;
    
    return user.features.includes(feature) || user.role === 'admin';
  }

  // Add beta user
  addBetaUser(user: Omit<BetaUser, 'joinedAt' | 'lastActiveAt'>): void {
    const betaUser: BetaUser = {
      ...user,
      joinedAt: new Date(),
      lastActiveAt: new Date(),
    };
    
    this.betaUsers.set(user.uid, betaUser);
    secureLogger.info('Beta user added', { userId: user.uid, email: user.email, features: user.features });
  }

  // Update beta user
  updateBetaUser(userId: string, updates: Partial<BetaUser>): void {
    const user = this.betaUsers.get(userId);
    if (user) {
      const updatedUser = { ...user, ...updates, lastActiveAt: new Date() };
      this.betaUsers.set(userId, updatedUser);
      secureLogger.info('Beta user updated', { userId, updates });
    }
  }

  // Remove beta user
  removeBetaUser(userId: string): void {
    const user = this.betaUsers.get(userId);
    if (user) {
      this.betaUsers.delete(userId);
      secureLogger.info('Beta user removed', { userId, email: user.email });
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

  // Refresh feature flags from remote config
  async refreshFeatureFlags(): Promise<void> {
    try {
      await fetchAndActivate(this.remoteConfig);
      this.loadFeatureFlags();
      this.notifyListeners();
      secureLogger.info('Feature flags refreshed');
    } catch (error) {
      secureLogger.error('Failed to refresh feature flags', { error });
    }
  }

  // Subscribe to feature flag changes
  subscribe(listener: (flags: FeatureFlags) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.featureFlags);
      } catch (error) {
        secureLogger.error('Error in feature flag listener', { error });
      }
    });
  }

  // Check if service is initialized
  isReady(): boolean {
    return this.isInitialized;
  }

  // Get feature flag status for debugging
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      featureFlags: this.featureFlags,
      betaUserCount: this.betaUsers.size,
      betaUsers: Array.from(this.betaUsers.values()).map(user => ({
        uid: user.uid,
        email: user.email,
        role: user.role,
        features: user.features,
      })),
    };
  }
}

// Create singleton instance
export const featureFlagService = new FeatureFlagService();

// Export types and service
export { FeatureFlagService };
export default featureFlagService;
