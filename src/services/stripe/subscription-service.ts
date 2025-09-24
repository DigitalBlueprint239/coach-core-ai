// @ts-nocheck
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { productionConfig } from '../../config/production';
import { UserProfile, SubscriptionTier, SUBSCRIPTION_PLANS } from '../../types/user';

export interface CreateCheckoutSessionData {
  userId: string;
  email: string;
  subscriptionTier: SubscriptionTier;
  successUrl: string;
  cancelUrl: string;
}

export interface SubscriptionStatus {
  id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  planId: string;
}

class SubscriptionService {
  private stripe: Stripe | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.stripe = await loadStripe(productionConfig.stripe.publishableKey);
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
      throw new Error('Stripe initialization failed');
    }
  }

  // Create checkout session for new subscription
  async createCheckoutSession(data: CreateCheckoutSessionData): Promise<string> {
    await this.initialize();

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionId } = await response.json();
      return sessionId;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error('Checkout session creation failed');
    }
  }

  // Redirect to Stripe checkout
  async redirectToCheckout(sessionId: string): Promise<void> {
    await this.initialize();

    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    const { error } = await this.stripe.redirectToCheckout({ sessionId });
    
    if (error) {
      throw new Error(`Checkout redirect failed: ${error.message}`);
    }
  }

  // Create customer portal session for subscription management
  async createCustomerPortalSession(customerId: string, returnUrl: string): Promise<string> {
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customerId, returnUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      return url;
    } catch (error) {
      console.error('Error creating portal session:', error);
      throw new Error('Portal session creation failed');
    }
  }

  // Get subscription status
  async getSubscriptionStatus(subscriptionId: string): Promise<SubscriptionStatus> {
    try {
      const response = await fetch(`/api/stripe/subscriptions/${subscriptionId}`);
      
      if (!response.ok) {
        throw new Error('Failed to get subscription status');
      }

      const data = await response.json();
      return {
        ...data,
        currentPeriodEnd: new Date(data.currentPeriodEnd),
      };
    } catch (error) {
      console.error('Error getting subscription status:', error);
      throw new Error('Failed to get subscription status');
    }
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      const response = await fetch(`/api/stripe/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw new Error('Subscription cancellation failed');
    }
  }

  // Reactivate subscription
  async reactivateSubscription(subscriptionId: string): Promise<void> {
    try {
      const response = await fetch(`/api/stripe/subscriptions/${subscriptionId}/reactivate`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to reactivate subscription');
      }
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      throw new Error('Subscription reactivation failed');
    }
  }

  // Get available plans
  getAvailablePlans() {
    return SUBSCRIPTION_PLANS;
  }

  // Check if user can upgrade
  canUpgrade(currentTier: SubscriptionTier, targetTier: SubscriptionTier): boolean {
    const tiers: SubscriptionTier[] = ['free', 'premium', 'enterprise'];
    const currentIndex = tiers.indexOf(currentTier);
    const targetIndex = tiers.indexOf(targetTier);
    
    return targetIndex > currentIndex;
  }

  // Get upgrade price
  getUpgradePrice(currentTier: SubscriptionTier, targetTier: SubscriptionTier): number {
    if (!this.canUpgrade(currentTier, targetTier)) {
      return 0;
    }

    const currentPlan = SUBSCRIPTION_PLANS[currentTier];
    const targetPlan = SUBSCRIPTION_PLANS[targetTier];
    
    return targetPlan.price - currentPlan.price;
  }

  // Validate subscription limits
  validateSubscriptionLimits(
    userProfile: UserProfile,
    feature: keyof UserProfile['usage'],
    requestedAmount: number = 1
  ): { allowed: boolean; reason?: string } {
    const plan = SUBSCRIPTION_PLANS[userProfile.subscription];
    const currentUsage = userProfile.usage[feature];
    
    switch (feature) {
      case 'playsGeneratedThisMonth':
        if ((currentUsage || 0) + requestedAmount > plan.limits.maxPlaysPerMonth) {
          return {
            allowed: false,
            reason: `You've reached your monthly limit of ${plan.limits.maxPlaysPerMonth} plays. Upgrade to Premium for unlimited plays.`
          };
        }
        break;
        
      case 'teamsCreated':
        if ((currentUsage || 0) + requestedAmount > plan.limits.maxTeams) {
          return {
            allowed: false,
            reason: `You've reached your team limit of ${plan.limits.maxTeams} teams. Upgrade to Premium for more teams.`
          };
        }
        break;
    }
    
    return { allowed: true };
  }

  // Handle webhook events (for server-side processing)
  async handleWebhookEvent(event: any): Promise<void> {
    // This would be implemented on the server side
    // For now, we'll just log the event
    console.log('Webhook event received:', event.type);
  }
}

export const subscriptionService = new SubscriptionService();
// @ts-nocheck
