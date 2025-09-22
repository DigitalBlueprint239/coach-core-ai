import { loadStripe, Stripe } from '@stripe/stripe-js';
import secureLogger from '../../utils/secure-logger';

// Stripe configuration
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const STRIPE_SECRET_KEY = import.meta.env.VITE_STRIPE_SECRET_KEY;

// Subscription tiers configuration
export const SUBSCRIPTION_TIERS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'usd',
    interval: 'month',
    features: [
      'Demo Mode Access',
      '3 Saved Plays',
      'Basic Play Designer',
      'Community Support',
    ],
    limits: {
      savedPlays: 3,
      teamMembers: 1,
      aiGenerations: 5,
      storageGB: 1,
    },
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    price: 2900, // $29.00 in cents
    currency: 'usd',
    interval: 'month',
    stripePriceId: 'price_pro_monthly', // Replace with actual Stripe price ID
    features: [
      'Unlimited Saved Plays',
      'Full Team Dashboard',
      'AI Assistant',
      'Advanced Analytics',
      'Priority Support',
      'Export to Multiple Formats',
      'Real-time Collaboration',
    ],
    limits: {
      savedPlays: -1, // Unlimited
      teamMembers: 50,
      aiGenerations: -1, // Unlimited
      storageGB: 100,
    },
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 9900, // $99.00 in cents
    currency: 'usd',
    interval: 'month',
    stripePriceId: 'price_enterprise_monthly', // Replace with actual Stripe price ID
    features: [
      'Everything in Pro',
      'Custom Integrations',
      'Dedicated Support',
      'Custom Branding',
      'Advanced Security',
      'API Access',
      'White-label Solution',
    ],
    limits: {
      savedPlays: -1, // Unlimited
      teamMembers: -1, // Unlimited
      aiGenerations: -1, // Unlimited
      storageGB: -1, // Unlimited
    },
  },
} as const;

// Stripe instance
let stripePromise: Promise<Stripe | null> | null = null;

// Initialize Stripe
export const initializeStripe = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    if (!STRIPE_PUBLISHABLE_KEY) {
      secureLogger.error('Stripe publishable key not found');
      return Promise.resolve(null);
    }
    
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  
  return stripePromise;
};

// Get Stripe instance
export const getStripe = async (): Promise<Stripe | null> => {
  return await initializeStripe();
};

// Stripe service class
export class StripeService {
  private stripe: Stripe | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    this.stripe = await getStripe();
    if (!this.stripe) {
      secureLogger.error('Failed to initialize Stripe');
    }
  }

  // Create checkout session
  async createCheckoutSession(
    priceId: string,
    customerId?: string,
    successUrl?: string,
    cancelUrl?: string
  ): Promise<{ sessionId: string; url: string } | null> {
    try {
      if (!this.stripe) {
        throw new Error('Stripe not initialized');
      }

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          customerId,
          successUrl: successUrl || `${window.location.origin}/dashboard?success=true`,
          cancelUrl: cancelUrl || `${window.location.origin}/pricing?canceled=true`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionId, url } = await response.json();
      
      secureLogger.info('Checkout session created', { sessionId, priceId });
      return { sessionId, url };
    } catch (error) {
      secureLogger.error('Failed to create checkout session', { error });
      return null;
    }
  }

  // Redirect to checkout
  async redirectToCheckout(
    priceId: string,
    customerId?: string,
    successUrl?: string,
    cancelUrl?: string
  ): Promise<boolean> {
    try {
      const checkoutData = await this.createCheckoutSession(
        priceId,
        customerId,
        successUrl,
        cancelUrl
      );

      if (!checkoutData) {
        return false;
      }

      const { error } = await this.stripe!.redirectToCheckout({
        sessionId: checkoutData.sessionId,
      });

      if (error) {
        secureLogger.error('Stripe checkout error', { error });
        return false;
      }

      return true;
    } catch (error) {
      secureLogger.error('Failed to redirect to checkout', { error });
      return false;
    }
  }

  // Create customer portal session
  async createCustomerPortalSession(
    customerId: string,
    returnUrl?: string
  ): Promise<{ url: string } | null> {
    try {
      const response = await fetch('/api/create-customer-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
          returnUrl: returnUrl || `${window.location.origin}/dashboard`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create customer portal session');
      }

      const { url } = await response.json();
      
      secureLogger.info('Customer portal session created', { customerId });
      return { url };
    } catch (error) {
      secureLogger.error('Failed to create customer portal session', { error });
      return null;
    }
  }

  // Redirect to customer portal
  async redirectToCustomerPortal(
    customerId: string,
    returnUrl?: string
  ): Promise<boolean> {
    try {
      const portalData = await this.createCustomerPortalSession(
        customerId,
        returnUrl
      );

      if (!portalData) {
        return false;
      }

      window.location.href = portalData.url;
      return true;
    } catch (error) {
      secureLogger.error('Failed to redirect to customer portal', { error });
      return false;
    }
  }

  // Get subscription details
  async getSubscriptionDetails(subscriptionId: string): Promise<any> {
    try {
      const response = await fetch(`/api/subscription/${subscriptionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get subscription details');
      }

      const subscription = await response.json();
      return subscription;
    } catch (error) {
      secureLogger.error('Failed to get subscription details', { error });
      return null;
    }
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/subscription/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      secureLogger.info('Subscription canceled', { subscriptionId });
      return true;
    } catch (error) {
      secureLogger.error('Failed to cancel subscription', { error });
      return false;
    }
  }

  // Update subscription
  async updateSubscription(
    subscriptionId: string,
    newPriceId: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/subscription/${subscriptionId}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newPriceId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update subscription');
      }

      secureLogger.info('Subscription updated', { subscriptionId, newPriceId });
      return true;
    } catch (error) {
      secureLogger.error('Failed to update subscription', { error });
      return false;
    }
  }

  // Get customer details
  async getCustomerDetails(customerId: string): Promise<any> {
    try {
      const response = await fetch(`/api/customer/${customerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get customer details');
      }

      const customer = await response.json();
      return customer;
    } catch (error) {
      secureLogger.error('Failed to get customer details', { error });
      return null;
    }
  }

  // Create customer
  async createCustomer(
    email: string,
    name?: string,
    metadata?: Record<string, string>
  ): Promise<{ customerId: string } | null> {
    try {
      const response = await fetch('/api/create-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          name,
          metadata,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create customer');
      }

      const { customerId } = await response.json();
      
      secureLogger.info('Customer created', { customerId, email });
      return { customerId };
    } catch (error) {
      secureLogger.error('Failed to create customer', { error });
      return null;
    }
  }

  // Format price for display
  formatPrice(priceInCents: number, currency: string = 'usd'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(priceInCents / 100);
  }

  // Get subscription tier by price ID
  getSubscriptionTierByPriceId(priceId: string): typeof SUBSCRIPTION_TIERS[keyof typeof SUBSCRIPTION_TIERS] | null {
    for (const tier of Object.values(SUBSCRIPTION_TIERS)) {
      if (tier.stripePriceId === priceId) {
        return tier;
      }
    }
    return null;
  }

  // Get subscription tier by ID
  getSubscriptionTierById(tierId: string): typeof SUBSCRIPTION_TIERS[keyof typeof SUBSCRIPTION_TIERS] | null {
    return SUBSCRIPTION_TIERS[tierId as keyof typeof SUBSCRIPTION_TIERS] || null;
  }

  // Check if user has access to feature
  hasFeatureAccess(
    userTier: string,
    feature: string
  ): boolean {
    const tier = this.getSubscriptionTierById(userTier);
    if (!tier) return false;

    return tier.features.includes(feature);
  }

  // Check if user is within limits
  isWithinLimits(
    userTier: string,
    limitType: keyof typeof SUBSCRIPTION_TIERS.FREE.limits,
    currentUsage: number
  ): boolean {
    const tier = this.getSubscriptionTierById(userTier);
    if (!tier) return false;

    const limit = tier.limits[limitType];
    if (limit === -1) return true; // Unlimited
    if (limit === undefined) return false;

    return currentUsage < limit;
  }
}

// Create singleton instance
export const stripeService = new StripeService();

// Export types
export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[keyof typeof SUBSCRIPTION_TIERS];
export type SubscriptionTierId = keyof typeof SUBSCRIPTION_TIERS;

export default stripeService;