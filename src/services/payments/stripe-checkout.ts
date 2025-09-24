// @ts-nocheck
import { stripeService, SubscriptionTier } from './stripe-config';
import { subscriptionService } from './subscription-service';
import secureLogger from '../../utils/secure-logger';

// Checkout session configuration
export interface CheckoutSessionConfig {
  userId: string;
  tier: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, any>;
}

// Checkout result interface
export interface CheckoutResult {
  success: boolean;
  sessionId?: string;
  error?: string;
  url?: string;
}

// Stripe Checkout service class
class StripeCheckoutService {
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Wait for Stripe to be ready
    const checkStripe = () => {
      if (stripeService.isReady()) {
        this.isInitialized = true;
        secureLogger.info('Stripe Checkout service initialized');
      } else {
        setTimeout(checkStripe, 100);
      }
    };
    checkStripe();
  }

  // Check if service is ready
  isReady(): boolean {
    return this.isInitialized && stripeService.isReady();
  }

  // Create checkout session
  async createCheckoutSession(config: CheckoutSessionConfig): Promise<CheckoutResult> {
    try {
      if (!this.isReady()) {
        throw new Error('Stripe Checkout service not ready');
      }

      const stripe = stripeService.getStripe();
      if (!stripe) {
        throw new Error('Stripe not available');
      }

      const subscriptionTier = stripeService.getSubscriptionTier(config.tier);
      if (!subscriptionTier) {
        throw new Error(`Invalid subscription tier: ${config.tier}`);
      }

      // For free tier, don't create Stripe session
      if (subscriptionTier.price === 0) {
        // Create free subscription directly
        const subscriptionId = await subscriptionService.createSubscription(
          config.userId,
          config.tier,
          undefined,
          undefined,
          config.metadata
        );

        return {
          success: true,
          sessionId: subscriptionId,
          url: config.successUrl,
        };
      }

      // Create Stripe checkout session for paid tiers
      const { error, session } = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: subscriptionTier.currency,
              product_data: {
                name: subscriptionTier.name,
                description: subscriptionTier.description,
              },
              unit_amount: subscriptionTier.price,
              recurring: {
                interval: subscriptionTier.interval,
              },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: config.successUrl,
        cancel_url: config.cancelUrl,
        customer_email: config.metadata?.email,
        metadata: {
          userId: config.userId,
          tier: config.tier,
          ...config.metadata,
        },
        subscription_data: {
          metadata: {
            userId: config.userId,
            tier: config.tier,
            ...config.metadata,
          },
        },
      });

      if (error) {
        secureLogger.error('Stripe checkout session creation failed', { error, config });
        return {
          success: false,
          error: error.message,
        };
      }

      if (!session?.url) {
        throw new Error('No checkout URL returned from Stripe');
      }

      secureLogger.info('Checkout session created successfully', { 
        sessionId: session.id, 
        userId: config.userId, 
        tier: config.tier 
      });

      return {
        success: true,
        sessionId: session.id,
        url: session.url,
      };

    } catch (error) {
      secureLogger.error('Failed to create checkout session', { error, config });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Redirect to checkout
  async redirectToCheckout(config: CheckoutSessionConfig): Promise<CheckoutResult> {
    try {
      const result = await this.createCheckoutSession(config);
      
      if (result.success && result.url) {
        // Redirect to Stripe Checkout
        window.location.href = result.url;
        return result;
      } else {
        return result;
      }

    } catch (error) {
      secureLogger.error('Failed to redirect to checkout', { error, config });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Handle successful payment (webhook or redirect)
  async handleSuccessfulPayment(sessionId: string, userId: string, tier: string): Promise<void> {
    try {
      // Create or update subscription
      const subscriptionId = await subscriptionService.createSubscription(
        userId,
        tier,
        undefined, // stripeCustomerId will be set by webhook
        sessionId, // stripeSubscriptionId
        { sessionId }
      );

      // Log payment event
      await subscriptionService.logPaymentEvent(
        userId,
        subscriptionId,
        'payment_succeeded',
        { sessionId, tier }
      );

      secureLogger.info('Successful payment handled', { sessionId, userId, tier, subscriptionId });

    } catch (error) {
      secureLogger.error('Failed to handle successful payment', { error, sessionId, userId, tier });
      throw error;
    }
  }

  // Handle failed payment
  async handleFailedPayment(sessionId: string, userId: string, error: string): Promise<void> {
    try {
      // Log payment event
      await subscriptionService.logPaymentEvent(
        userId,
        sessionId,
        'payment_failed',
        { error, sessionId }
      );

      secureLogger.error('Payment failed', { sessionId, userId, error });

    } catch (logError) {
      secureLogger.error('Failed to log payment failure', { logError, sessionId, userId, error });
    }
  }

  // Create customer portal session
  async createCustomerPortalSession(customerId: string, returnUrl: string): Promise<CheckoutResult> {
    try {
      if (!this.isReady()) {
        throw new Error('Stripe Checkout service not ready');
      }

      const stripe = stripeService.getStripe();
      if (!stripe) {
        throw new Error('Stripe not available');
      }

      const { error, session } = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      if (error) {
        secureLogger.error('Customer portal session creation failed', { error, customerId });
        return {
          success: false,
          error: error.message,
        };
      }

      if (!session?.url) {
        throw new Error('No portal URL returned from Stripe');
      }

      secureLogger.info('Customer portal session created successfully', { 
        sessionId: session.id, 
        customerId 
      });

      return {
        success: true,
        sessionId: session.id,
        url: session.url,
      };

    } catch (error) {
      secureLogger.error('Failed to create customer portal session', { error, customerId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Redirect to customer portal
  async redirectToCustomerPortal(customerId: string, returnUrl: string): Promise<CheckoutResult> {
    try {
      const result = await this.createCustomerPortalSession(customerId, returnUrl);
      
      if (result.success && result.url) {
        // Redirect to Stripe Customer Portal
        window.location.href = result.url;
        return result;
      } else {
        return result;
      }

    } catch (error) {
      secureLogger.error('Failed to redirect to customer portal', { error, customerId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Get subscription tiers for display
  getSubscriptionTiers(): SubscriptionTier[] {
    return stripeService.getAllSubscriptionTiers();
  }

  // Get paid subscription tiers
  getPaidSubscriptionTiers(): SubscriptionTier[] {
    return stripeService.getPaidSubscriptionTiers();
  }

  // Format price for display
  formatPrice(priceInCents: number, currency: string = 'usd'): string {
    return stripeService.formatPrice(priceInCents, currency);
  }

  // Get debug information
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      stripeReady: stripeService.isReady(),
      stripeDebug: stripeService.getDebugInfo(),
    };
  }
}

// Create singleton instance
export const stripeCheckoutService = new StripeCheckoutService();

// Export types and service
export { StripeCheckoutService };
export default stripeCheckoutService;
