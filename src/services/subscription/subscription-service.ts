// Re-export the Stripe subscription service
export { subscriptionService } from '../stripe/subscription-service';

// Additional subscription-related utilities
export const getSubscriptionTier = (userProfile: any) => {
  return userProfile?.subscription || 'free';
};

export const canAccessFeature = (userProfile: any, feature: string) => {
  const tier = getSubscriptionTier(userProfile);
  
  switch (feature) {
    case 'ai-play-generator':
      return true; // Available on all tiers
    case 'analytics':
      return tier === 'premium' || tier === 'enterprise';
    case 'team-collaboration':
      return tier === 'premium' || tier === 'enterprise';
    case 'api-access':
      return tier === 'enterprise';
    case 'white-label':
      return tier === 'enterprise';
    default:
      return false;
  }
};

export const getFeatureLimit = (userProfile: any, feature: string) => {
  const tier = getSubscriptionTier(userProfile);
  
  switch (feature) {
    case 'plays-per-month':
      return tier === 'free' ? 5 : tier === 'premium' ? 1000 : 10000;
    case 'teams':
      return tier === 'free' ? 1 : tier === 'premium' ? 5 : 20;
    case 'collaborators':
      return tier === 'free' ? 2 : tier === 'premium' ? 10 : 50;
    default:
      return 0;
  }
};
