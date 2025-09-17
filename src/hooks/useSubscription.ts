import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { 
  subscriptionService, 
  UserSubscriptionProfile, 
  Subscription 
} from '../services/payments/subscription-service';
import { stripeService, SUBSCRIPTION_TIERS, SubscriptionTierId } from '../services/payments/stripe-config';
import secureLogger from '../utils/secure-logger';

// Hook for subscription management
export function useSubscription() {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserSubscriptionProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user profile and subscription
  const loadUserData = useCallback(async () => {
    if (!user?.uid) {
      setUserProfile(null);
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Load user profile
      const profile = await subscriptionService.getUserProfile(user.uid);
      setUserProfile(profile);

      // Load active subscription
      const activeSubscription = await subscriptionService.getUserSubscription(user.uid);
      setSubscription(activeSubscription);

      // If no profile exists, initialize as free user
      if (!profile && user.email) {
        const newProfile = await subscriptionService.initializeFreeUser(user.uid, user.email);
        setUserProfile(newProfile);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load subscription data';
      setError(errorMessage);
      secureLogger.error('Failed to load user subscription data', { error: err });
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, user?.email]);

  // Subscribe to subscription changes
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscriptionService.subscribeToUserSubscription(
      user.uid,
      (newSubscription) => {
        setSubscription(newSubscription);
        
        // Update user profile if subscription changed
        if (newSubscription) {
          loadUserData();
        }
      }
    );

    return () => unsubscribe();
  }, [user?.uid, loadUserData]);

  // Load data on mount
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Check if user has access to feature
  const hasFeatureAccess = useCallback(async (feature: string): Promise<boolean> => {
    if (!user?.uid) return false;
    
    try {
      return await subscriptionService.hasFeatureAccess(user.uid, feature);
    } catch (err) {
      secureLogger.error('Failed to check feature access', { error: err });
      return false;
    }
  }, [user?.uid]);

  // Check if user is within limits
  const isWithinLimits = useCallback(async (
    limitType: keyof UserSubscriptionProfile['usage'],
    currentUsage: number
  ): Promise<boolean> => {
    if (!user?.uid) return false;
    
    try {
      return await subscriptionService.isWithinLimits(user.uid, limitType, currentUsage);
    } catch (err) {
      secureLogger.error('Failed to check limits', { error: err });
      return false;
    }
  }, [user?.uid]);

  // Update usage
  const updateUsage = useCallback(async (
    usageType: keyof UserSubscriptionProfile['usage'],
    increment: number = 1
  ): Promise<void> => {
    if (!user?.uid) return;
    
    try {
      await subscriptionService.updateUsage(user.uid, usageType, increment);
      await loadUserData(); // Refresh data
    } catch (err) {
      secureLogger.error('Failed to update usage', { error: err });
      throw err;
    }
  }, [user?.uid, loadUserData]);

  // Get usage statistics
  const getUsageStatistics = useCallback(async () => {
    if (!user?.uid) return null;
    
    try {
      return await subscriptionService.getUsageStatistics(user.uid);
    } catch (err) {
      secureLogger.error('Failed to get usage statistics', { error: err });
      return null;
    }
  }, [user?.uid]);

  // Upgrade subscription
  const upgradeSubscription = useCallback(async (newTier: SubscriptionTierId): Promise<boolean> => {
    if (!user?.uid) return false;
    
    try {
      return await subscriptionService.upgradeSubscription(user.uid, newTier);
    } catch (err) {
      secureLogger.error('Failed to upgrade subscription', { error: err });
      return false;
    }
  }, [user?.uid]);

  // Cancel subscription
  const cancelSubscription = useCallback(async (): Promise<boolean> => {
    if (!subscription?.id) return false;
    
    try {
      return await subscriptionService.cancelSubscription(subscription.id);
    } catch (err) {
      secureLogger.error('Failed to cancel subscription', { error: err });
      return false;
    }
  }, [subscription?.id]);

  // Redirect to customer portal
  const openCustomerPortal = useCallback(async (): Promise<boolean> => {
    if (!userProfile?.customerId) return false;
    
    try {
      return await stripeService.redirectToCustomerPortal(userProfile.customerId);
    } catch (err) {
      secureLogger.error('Failed to open customer portal', { error: err });
      return false;
    }
  }, [userProfile?.customerId]);

  // Get subscription tier info
  const getTierInfo = useCallback((tierId?: SubscriptionTierId) => {
    const tier = tierId || userProfile?.tier || 'FREE';
    return SUBSCRIPTION_TIERS[tier];
  }, [userProfile?.tier]);

  // Check if user is on free tier
  const isFreeTier = useCallback(() => {
    return userProfile?.tier === 'FREE';
  }, [userProfile?.tier]);

  // Check if user is on pro tier
  const isProTier = useCallback(() => {
    return userProfile?.tier === 'PRO';
  }, [userProfile?.tier]);

  // Check if user is on enterprise tier
  const isEnterpriseTier = useCallback(() => {
    return userProfile?.tier === 'ENTERPRISE';
  }, [userProfile?.tier]);

  // Check if subscription is active
  const isActive = useCallback(() => {
    return userProfile?.status === 'active' || userProfile?.status === 'trialing';
  }, [userProfile?.status]);

  // Check if subscription is canceled
  const isCanceled = useCallback(() => {
    return userProfile?.status === 'canceled' || userProfile?.cancelAtPeriodEnd;
  }, [userProfile?.status, userProfile?.cancelAtPeriodEnd]);

  return {
    userProfile,
    subscription,
    isLoading,
    error,
    hasFeatureAccess,
    isWithinLimits,
    updateUsage,
    getUsageStatistics,
    upgradeSubscription,
    cancelSubscription,
    openCustomerPortal,
    getTierInfo,
    isFreeTier,
    isProTier,
    isEnterpriseTier,
    isActive,
    isCanceled,
    refresh: loadUserData,
  };
}

// Hook for subscription limits
export function useSubscriptionLimits() {
  const { userProfile, isWithinLimits, updateUsage, getUsageStatistics } = useSubscription();
  const [usageStats, setUsageStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load usage statistics
  const loadUsageStats = useCallback(async () => {
    if (!userProfile) return;

    try {
      setIsLoading(true);
      const stats = await getUsageStatistics();
      setUsageStats(stats);
    } catch (err) {
      secureLogger.error('Failed to load usage statistics', { error: err });
    } finally {
      setIsLoading(false);
    }
  }, [userProfile, getUsageStatistics]);

  // Load stats on mount
  useEffect(() => {
    loadUsageStats();
  }, [loadUsageStats]);

  // Check specific limit
  const checkLimit = useCallback(async (
    limitType: keyof UserSubscriptionProfile['usage'],
    currentUsage: number
  ) => {
    return await isWithinLimits(limitType, currentUsage);
  }, [isWithinLimits]);

  // Increment usage
  const incrementUsage = useCallback(async (
    usageType: keyof UserSubscriptionProfile['usage'],
    amount: number = 1
  ) => {
    try {
      await updateUsage(usageType, amount);
      await loadUsageStats(); // Refresh stats
    } catch (err) {
      secureLogger.error('Failed to increment usage', { error: err });
      throw err;
    }
  }, [updateUsage, loadUsageStats]);

  return {
    userProfile,
    usageStats,
    isLoading,
    checkLimit,
    incrementUsage,
    refresh: loadUsageStats,
  };
}

// Hook for subscription features
export function useSubscriptionFeatures() {
  const { userProfile, hasFeatureAccess, getTierInfo } = useSubscription();
  const [featureAccess, setFeatureAccess] = useState<Record<string, boolean>>({});

  // Check feature access
  const checkFeatureAccess = useCallback(async (feature: string) => {
    const hasAccess = await hasFeatureAccess(feature);
    setFeatureAccess(prev => ({ ...prev, [feature]: hasAccess }));
    return hasAccess;
  }, [hasFeatureAccess]);

  // Check multiple features
  const checkMultipleFeatures = useCallback(async (features: string[]) => {
    const results = await Promise.all(
      features.map(feature => hasFeatureAccess(feature))
    );
    
    const accessMap = features.reduce((acc, feature, index) => {
      acc[feature] = results[index];
      return acc;
    }, {} as Record<string, boolean>);
    
    setFeatureAccess(prev => ({ ...prev, ...accessMap }));
    return accessMap;
  }, [hasFeatureAccess]);

  // Get tier features
  const getTierFeatures = useCallback(() => {
    const tierInfo = getTierInfo();
    return tierInfo?.features || [];
  }, [getTierInfo]);

  // Check if feature is available in tier
  const isFeatureAvailable = useCallback((feature: string) => {
    const tierFeatures = getTierFeatures();
    return tierFeatures.includes(feature);
  }, [getTierFeatures]);

  return {
    userProfile,
    featureAccess,
    checkFeatureAccess,
    checkMultipleFeatures,
    getTierFeatures,
    isFeatureAvailable,
  };
}

export default useSubscription;