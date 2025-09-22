import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import { stripeService, SUBSCRIPTION_TIERS, SubscriptionTierId } from './stripe-config';
import secureLogger from '../../utils/secure-logger';

// Subscription status types
export type SubscriptionStatus = 
  | 'active' 
  | 'inactive' 
  | 'trialing' 
  | 'past_due' 
  | 'canceled' 
  | 'unpaid' 
  | 'incomplete' 
  | 'incomplete_expired';

// Subscription interface
export interface Subscription {
  id: string;
  userId: string;
  customerId: string;
  subscriptionId: string;
  tier: SubscriptionTierId;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

// User subscription profile interface
export interface UserSubscriptionProfile {
  userId: string;
  email: string;
  customerId?: string;
  subscriptionId?: string;
  tier: SubscriptionTierId;
  status: SubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  trialStart?: Date;
  trialEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
  usage: {
    savedPlays: number;
    teamMembers: number;
    aiGenerations: number;
    storageUsedGB: number;
  };
  limits: {
    savedPlays: number;
    teamMembers: number;
    aiGenerations: number;
    storageGB: number;
  };
}

// Subscription service class
export class SubscriptionService {
  private collectionName = 'subscriptions';
  private userProfilesCollection = 'userProfiles';

  // Create or update user subscription profile
  async createOrUpdateUserProfile(
    userId: string,
    email: string,
    subscriptionData?: Partial<Subscription>
  ): Promise<UserSubscriptionProfile> {
    try {
      const userRef = doc(db, this.userProfilesCollection, userId);
      const userSnap = await getDoc(userRef);

      const tier = subscriptionData?.tier || 'FREE';
      const status = subscriptionData?.status || 'inactive';
      const tierConfig = SUBSCRIPTION_TIERS[tier];

      const userProfile: UserSubscriptionProfile = {
        userId,
        email,
        customerId: subscriptionData?.customerId,
        subscriptionId: subscriptionData?.subscriptionId,
        tier,
        status,
        currentPeriodStart: subscriptionData?.currentPeriodStart,
        currentPeriodEnd: subscriptionData?.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptionData?.cancelAtPeriodEnd || false,
        trialStart: subscriptionData?.trialStart,
        trialEnd: subscriptionData?.trialEnd,
        createdAt: userSnap.exists() ? userSnap.data().createdAt : new Date(),
        updatedAt: new Date(),
        usage: userSnap.exists() ? userSnap.data().usage || {
          savedPlays: 0,
          teamMembers: 0,
          aiGenerations: 0,
          storageUsedGB: 0,
        } : {
          savedPlays: 0,
          teamMembers: 0,
          aiGenerations: 0,
          storageUsedGB: 0,
        },
        limits: {
          savedPlays: tierConfig.limits.savedPlays,
          teamMembers: tierConfig.limits.teamMembers,
          aiGenerations: tierConfig.limits.aiGenerations,
          storageGB: tierConfig.limits.storageGB,
        },
      };

      await setDoc(userRef, userProfile);
      
      secureLogger.info('User subscription profile created/updated', { 
        userId, 
        tier, 
        status 
      });

      return userProfile;
    } catch (error) {
      secureLogger.error('Failed to create/update user profile', { error });
      throw error;
    }
  }

  // Get user subscription profile
  async getUserProfile(userId: string): Promise<UserSubscriptionProfile | null> {
    try {
      const userRef = doc(db, this.userProfilesCollection, userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        return null;
      }

      return userSnap.data() as UserSubscriptionProfile;
    } catch (error) {
      secureLogger.error('Failed to get user profile', { error });
      return null;
    }
  }

  // Create subscription record
  async createSubscription(subscriptionData: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const subscriptionRef = doc(collection(db, this.collectionName));
      const subscription: Subscription = {
        ...subscriptionData,
        id: subscriptionRef.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(subscriptionRef, subscription);
      
      // Update user profile
      await this.createOrUpdateUserProfile(
        subscriptionData.userId,
        '', // Email will be updated separately
        subscriptionData
      );

      secureLogger.info('Subscription created', { 
        subscriptionId: subscription.id,
        userId: subscriptionData.userId,
        tier: subscriptionData.tier
      });

      return subscription.id;
    } catch (error) {
      secureLogger.error('Failed to create subscription', { error });
      throw error;
    }
  }

  // Update subscription
  async updateSubscription(
    subscriptionId: string,
    updates: Partial<Omit<Subscription, 'id' | 'createdAt' | 'userId'>>
  ): Promise<void> {
    try {
      const subscriptionRef = doc(db, this.collectionName, subscriptionId);
      await updateDoc(subscriptionRef, {
        ...updates,
        updatedAt: new Date(),
      });

      // Update user profile if needed
      if (updates.tier || updates.status) {
        const subscriptionSnap = await getDoc(subscriptionRef);
        if (subscriptionSnap.exists()) {
          const subscription = subscriptionSnap.data() as Subscription;
          await this.createOrUpdateUserProfile(
            subscription.userId,
            '', // Email will be updated separately
            subscription
          );
        }
      }

      secureLogger.info('Subscription updated', { subscriptionId, updates });
    } catch (error) {
      secureLogger.error('Failed to update subscription', { error });
      throw error;
    }
  }

  // Get subscription by ID
  async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    try {
      const subscriptionRef = doc(db, this.collectionName, subscriptionId);
      const subscriptionSnap = await getDoc(subscriptionRef);

      if (!subscriptionSnap.exists()) {
        return null;
      }

      return subscriptionSnap.data() as Subscription;
    } catch (error) {
      secureLogger.error('Failed to get subscription', { error });
      return null;
    }
  }

  // Get user's active subscription
  async getUserSubscription(userId: string): Promise<Subscription | null> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('status', 'in', ['active', 'trialing', 'past_due'])
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      // Return the most recent subscription
      const subscriptions = querySnapshot.docs.map(doc => doc.data() as Subscription);
      return subscriptions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    } catch (error) {
      secureLogger.error('Failed to get user subscription', { error });
      return null;
    }
  }

  // Subscribe to user subscription changes
  subscribeToUserSubscription(
    userId: string,
    callback: (subscription: Subscription | null) => void
  ): Unsubscribe {
    const q = query(
      collection(db, this.collectionName),
      where('userId', '==', userId),
      where('status', 'in', ['active', 'trialing', 'past_due'])
    );

    return onSnapshot(q, (querySnapshot) => {
      if (querySnapshot.empty) {
        callback(null);
        return;
      }

      const subscriptions = querySnapshot.docs.map(doc => doc.data() as Subscription);
      const activeSubscription = subscriptions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      callback(activeSubscription);
    }, (error) => {
      secureLogger.error('Subscription listener error', { error });
      callback(null);
    });
  }

  // Check if user has access to feature
  async hasFeatureAccess(userId: string, feature: string): Promise<boolean> {
    try {
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile) return false;

      return stripeService.hasFeatureAccess(userProfile.tier, feature);
    } catch (error) {
      secureLogger.error('Failed to check feature access', { error });
      return false;
    }
  }

  // Check if user is within limits
  async isWithinLimits(
    userId: string,
    limitType: keyof typeof SUBSCRIPTION_TIERS.FREE.limits,
    currentUsage: number
  ): Promise<boolean> {
    try {
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile) return false;

      return stripeService.isWithinLimits(userProfile.tier, limitType, currentUsage);
    } catch (error) {
      secureLogger.error('Failed to check limits', { error });
      return false;
    }
  }

  // Update usage
  async updateUsage(
    userId: string,
    usageType: keyof UserSubscriptionProfile['usage'],
    increment: number = 1
  ): Promise<void> {
    try {
      const userRef = doc(db, this.userProfilesCollection, userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        throw new Error('User profile not found');
      }

      const currentUsage = userSnap.data().usage || {
        savedPlays: 0,
        teamMembers: 0,
        aiGenerations: 0,
        storageUsedGB: 0,
      };

      const newUsage = {
        ...currentUsage,
        [usageType]: currentUsage[usageType] + increment,
      };

      await updateDoc(userRef, {
        usage: newUsage,
        updatedAt: new Date(),
      });

      secureLogger.info('Usage updated', { userId, usageType, increment, newUsage });
    } catch (error) {
      secureLogger.error('Failed to update usage', { error });
      throw error;
    }
  }

  // Get usage statistics
  async getUsageStatistics(userId: string): Promise<{
    usage: UserSubscriptionProfile['usage'];
    limits: UserSubscriptionProfile['limits'];
    isWithinLimits: boolean;
    usagePercentage: Record<string, number>;
  }> {
    try {
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      const usagePercentage: Record<string, number> = {};
      let isWithinLimits = true;

      Object.keys(userProfile.usage).forEach(key => {
        const usage = userProfile.usage[key as keyof typeof userProfile.usage];
        const limit = userProfile.limits[key as keyof typeof userProfile.limits];
        
        if (limit === -1) {
          usagePercentage[key] = 0; // Unlimited
        } else {
          const percentage = (usage / limit) * 100;
          usagePercentage[key] = Math.min(percentage, 100);
          
          if (usage >= limit) {
            isWithinLimits = false;
          }
        }
      });

      return {
        usage: userProfile.usage,
        limits: userProfile.limits,
        isWithinLimits,
        usagePercentage,
      };
    } catch (error) {
      secureLogger.error('Failed to get usage statistics', { error });
      throw error;
    }
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      // Cancel in Stripe
      const success = await stripeService.cancelSubscription(subscriptionId);
      if (!success) {
        return false;
      }

      // Update in Firestore
      await this.updateSubscription(subscriptionId, {
        status: 'canceled',
        canceledAt: new Date(),
        cancelAtPeriodEnd: true,
      });

      secureLogger.info('Subscription canceled', { subscriptionId });
      return true;
    } catch (error) {
      secureLogger.error('Failed to cancel subscription', { error });
      return false;
    }
  }

  // Upgrade subscription
  async upgradeSubscription(
    userId: string,
    newTier: SubscriptionTierId
  ): Promise<boolean> {
    try {
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Create checkout session for upgrade
      const tierConfig = SUBSCRIPTION_TIERS[newTier];
      if (!tierConfig.stripePriceId) {
        throw new Error('Invalid tier configuration');
      }

      const success = await stripeService.redirectToCheckout(
        tierConfig.stripePriceId,
        userProfile.customerId,
        `${window.location.origin}/dashboard?upgrade=success`,
        `${window.location.origin}/pricing?upgrade=canceled`
      );

      return success;
    } catch (error) {
      secureLogger.error('Failed to upgrade subscription', { error });
      return false;
    }
  }

  // Get subscription history
  async getSubscriptionHistory(userId: string): Promise<Subscription[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as Subscription);
    } catch (error) {
      secureLogger.error('Failed to get subscription history', { error });
      return [];
    }
  }

  // Initialize user with free tier
  async initializeFreeUser(userId: string, email: string): Promise<UserSubscriptionProfile> {
    try {
      const userProfile = await this.createOrUpdateUserProfile(userId, email, {
        userId,
        customerId: '',
        subscriptionId: '',
        tier: 'FREE',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        cancelAtPeriodEnd: false,
      });

      secureLogger.info('Free user initialized', { userId, email });
      return userProfile;
    } catch (error) {
      secureLogger.error('Failed to initialize free user', { error });
      throw error;
    }
  }
}

// Create singleton instance
export const subscriptionService = new SubscriptionService();

export default subscriptionService;