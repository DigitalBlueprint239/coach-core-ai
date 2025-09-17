import { useState, useEffect, useCallback, useMemo } from 'react';
import { featureFlagService, FeatureAccess, BetaUser, BetaFeedback } from '../services/feature-flags/feature-flag-service';
import { useAuth } from './useAuth';
import secureLogger from '../utils/secure-logger';

// Hook for feature flag access
export function useFeatureFlags() {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [featureFlags, setFeatureFlags] = useState<Map<string, boolean>>(new Map());

  // Initialize feature flags
  useEffect(() => {
    const initializeFlags = async () => {
      try {
        // Wait for service to be ready
        const checkReady = () => {
          if (featureFlagService.isReady()) {
            setIsReady(true);
            loadFeatureFlags();
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      } catch (error) {
        secureLogger.error('Failed to initialize feature flags', { error });
      }
    };

    initializeFlags();
  }, []);

  // Load feature flags
  const loadFeatureFlags = useCallback(() => {
    try {
      const allFlags = featureFlagService.getAllFeatureFlags();
      const flagMap = new Map<string, boolean>();
      
      allFlags.forEach(flag => {
        flagMap.set(flag.key, featureFlagService.isFeatureEnabled(flag.key, user?.uid));
      });
      
      setFeatureFlags(flagMap);
    } catch (error) {
      secureLogger.error('Failed to load feature flags', { error });
    }
  }, [user?.uid]);

  // Refresh feature flags
  const refreshFeatureFlags = useCallback(async () => {
    try {
      await featureFlagService.refreshFeatureFlags();
      loadFeatureFlags();
    } catch (error) {
      secureLogger.error('Failed to refresh feature flags', { error });
    }
  }, [loadFeatureFlags]);

  // Check if feature is enabled
  const isFeatureEnabled = useCallback((featureKey: string): boolean => {
    if (!isReady) return false;
    return featureFlagService.isFeatureEnabled(featureKey, user?.uid);
  }, [isReady, user?.uid]);

  // Get feature access details
  const getFeatureAccess = useCallback((featureKey: string): FeatureAccess => {
    return featureFlagService.getFeatureAccess(featureKey, user?.uid);
  }, [user?.uid]);

  // Check if user is beta user
  const isBetaUser = useCallback((): boolean => {
    if (!user?.uid) return false;
    return featureFlagService.isBetaUser(user.uid);
  }, [user?.uid]);

  // Update user activity
  const updateUserActivity = useCallback((feature: string) => {
    if (user?.uid) {
      featureFlagService.updateBetaUserActivity(user.uid, feature);
    }
  }, [user?.uid]);

  return {
    isReady,
    featureFlags,
    isFeatureEnabled,
    getFeatureAccess,
    isBetaUser,
    updateUserActivity,
    refreshFeatureFlags,
  };
}

// Hook for specific feature access
export function useFeatureAccess(featureKey: string) {
  const { isFeatureEnabled, getFeatureAccess, updateUserActivity } = useFeatureFlags();
  
  const hasAccess = useMemo(() => isFeatureEnabled(featureKey), [isFeatureEnabled, featureKey]);
  const accessDetails = useMemo(() => getFeatureAccess(featureKey), [getFeatureAccess, featureKey]);

  // Update activity when feature is accessed
  useEffect(() => {
    if (hasAccess) {
      updateUserActivity(featureKey);
    }
  }, [hasAccess, featureKey, updateUserActivity]);

  return {
    hasAccess,
    accessDetails,
  };
}

// Hook for beta user management
export function useBetaUser() {
  const { user } = useAuth();
  const [betaUser, setBetaUser] = useState<BetaUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load beta user data
  useEffect(() => {
    if (user?.uid) {
      const userData = featureFlagService.getBetaUser(user.uid);
      setBetaUser(userData || null);
    } else {
      setBetaUser(null);
    }
  }, [user?.uid]);

  // Check if user is beta user
  const isBetaUser = useMemo(() => {
    return user?.uid ? featureFlagService.isBetaUser(user.uid) : false;
  }, [user?.uid]);

  // Submit feedback
  const submitFeedback = useCallback(async (feedback: Omit<BetaFeedback, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user?.uid) return null;

    try {
      setIsLoading(true);
      const feedbackId = featureFlagService.logBetaFeedback({
        ...feedback,
        userId: user.uid,
      });
      
      // Refresh beta user data
      const updatedUser = featureFlagService.getBetaUser(user.uid);
      setBetaUser(updatedUser || null);
      
      return feedbackId;
    } catch (error) {
      secureLogger.error('Failed to submit feedback', { error });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  // Log error
  const logError = useCallback((error: Error, feature: string, context?: any) => {
    if (user?.uid) {
      featureFlagService.logBetaError(user.uid, error, feature, context);
    }
  }, [user?.uid]);

  // Get user feedback
  const getUserFeedback = useCallback(() => {
    if (!user?.uid) return [];
    return featureFlagService.getFeedbackByUser(user.uid);
  }, [user?.uid]);

  return {
    betaUser,
    isBetaUser,
    isLoading,
    submitFeedback,
    logError,
    getUserFeedback,
  };
}

// Hook for beta user enrollment
export function useBetaEnrollment() {
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);

  // Enroll user as beta user
  const enrollUser = useCallback(async (userData: {
    userId: string;
    email: string;
    name: string;
    notes?: string;
  }) => {
    try {
      setIsEnrolling(true);
      setEnrollmentError(null);

      featureFlagService.addBetaUser(userData);
      
      secureLogger.info('User enrolled as beta user', { 
        userId: userData.userId, 
        email: userData.email 
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setEnrollmentError(errorMessage);
      secureLogger.error('Failed to enroll user as beta user', { error });
      return false;
    } finally {
      setIsEnrolling(false);
    }
  }, []);

  // Remove user from beta
  const removeUser = useCallback(async (userId: string) => {
    try {
      setIsEnrolling(true);
      setEnrollmentError(null);

      featureFlagService.removeBetaUser(userId);
      
      secureLogger.info('User removed from beta program', { userId });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setEnrollmentError(errorMessage);
      secureLogger.error('Failed to remove user from beta program', { error });
      return false;
    } finally {
      setIsEnrolling(false);
    }
  }, []);

  // Get all beta users
  const getAllBetaUsers = useCallback(() => {
    return featureFlagService.getAllBetaUsers();
  }, []);

  return {
    isEnrolling,
    enrollmentError,
    enrollUser,
    removeUser,
    getAllBetaUsers,
  };
}

// Hook for feature flag debugging
export function useFeatureFlagDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    const updateDebugInfo = () => {
      setDebugInfo(featureFlagService.getDebugInfo());
    };

    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const refreshDebugInfo = useCallback(() => {
    setDebugInfo(featureFlagService.getDebugInfo());
  }, []);

  return {
    debugInfo,
    refreshDebugInfo,
  };
}

// Higher-order component for feature gating
export function withFeatureFlag<T extends object>(
  Component: React.ComponentType<T>,
  featureKey: string,
  fallback?: React.ComponentType<T>
) {
  return function FeatureGatedComponent(props: T) {
    const { hasAccess } = useFeatureAccess(featureKey);

    if (hasAccess) {
      return React.createElement(Component, props);
    }

    if (fallback) {
      return React.createElement(fallback, props);
    }

    return null;
  };
}

// Feature gate component
export function FeatureGate({ 
  feature, 
  children, 
  fallback 
}: { 
  feature: string; 
  children: React.ReactNode; 
  fallback?: React.ReactNode; 
}) {
  const { hasAccess } = useFeatureAccess(feature);

  if (hasAccess) {
    return React.createElement(React.Fragment, null, children);
  }

  return React.createElement(React.Fragment, null, fallback);
}

export default useFeatureFlags;