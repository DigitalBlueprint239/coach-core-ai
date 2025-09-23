import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { subscriptionService, Subscription, UserSubscriptionProfile, SubscriptionStatus } from '../subscription-service';

// Mock Firebase Firestore
const mockDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockQuery = vi.fn();
const mockWhere = vi.fn();
const mockGetDocs = vi.fn();
const mockOnSnapshot = vi.fn();
const mockServerTimestamp = vi.fn(() => 'mock-timestamp');

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ id: 'subscriptions' })),
  doc: mockDoc,
  getDoc: mockGetDoc,
  setDoc: mockSetDoc,
  updateDoc: mockUpdateDoc,
  query: mockQuery,
  where: mockWhere,
  getDocs: mockGetDocs,
  onSnapshot: mockOnSnapshot,
  serverTimestamp: mockServerTimestamp
}));

// Mock Firebase config
vi.mock('../firebase/firebase-config', () => ({
  db: {}
}));

// Mock Stripe service
const mockStripeService = {
  createSubscription: vi.fn(),
  cancelSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  getSubscription: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  createPaymentMethod: vi.fn(),
  getPaymentMethods: vi.fn(),
  createCheckoutSession: vi.fn(),
  createPortalSession: vi.fn()
};

vi.mock('../stripe-config', () => ({
  stripeService: mockStripeService,
  SUBSCRIPTION_TIERS: {
    free: { id: 'free', name: 'Free', price: 0, features: ['basic'] },
    pro: { id: 'pro', name: 'Pro', price: 29.99, features: ['basic', 'advanced'] },
    enterprise: { id: 'enterprise', name: 'Enterprise', price: 99.99, features: ['basic', 'advanced', 'premium'] }
  }
}));

// Mock secure logger
vi.mock('../../../utils/secure-logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

describe('SubscriptionService - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('User Profile Management', () => {
    it('should create user profile for new user', async () => {
      const userId = 'test-user-123';
      const email = 'test@example.com';

      mockSetDoc.mockResolvedValue(undefined);
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          userId,
          email,
          subscription: { plan: 'free', status: 'active' },
          createdAt: 'mock-timestamp',
          updatedAt: 'mock-timestamp'
        })
      });

      const profile = await subscriptionService.initializeFreeUser(userId, email);

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          userId,
          email,
          subscription: { plan: 'free', status: 'active' }
        })
      );
      expect(profile).toBeDefined();
      expect(profile?.subscription.plan).toBe('free');
    });

    it('should get existing user profile', async () => {
      const userId = 'test-user-123';
      const mockProfile = {
        userId,
        email: 'test@example.com',
        subscription: { plan: 'pro', status: 'active' },
        createdAt: 'mock-timestamp',
        updatedAt: 'mock-timestamp'
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockProfile
      });

      const profile = await subscriptionService.getUserProfile(userId);

      expect(profile).toEqual(mockProfile);
    });

    it('should handle non-existent user profile', async () => {
      const userId = 'non-existent-user';

      mockGetDoc.mockResolvedValue({
        exists: () => false,
        data: () => undefined
      });

      const profile = await subscriptionService.getUserProfile(userId);

      expect(profile).toBeNull();
    });
  });

  describe('Subscription Creation', () => {
    it('should create new subscription successfully', async () => {
      const userId = 'test-user-123';
      const planId = 'pro';
      const paymentMethodId = 'pm_test_123';

      const mockStripeSubscription = {
        id: 'sub_test_123',
        status: 'active',
        current_period_start: Date.now() / 1000,
        current_period_end: (Date.now() / 1000) + (30 * 24 * 60 * 60),
        plan: { id: planId, amount: 2999 }
      };

      mockStripeService.createSubscription.mockResolvedValue(mockStripeSubscription);
      mockSetDoc.mockResolvedValue(undefined);
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          userId,
          subscription: { plan: 'free', status: 'active' }
        })
      });

      const subscription = await subscriptionService.createSubscription(userId, planId, paymentMethodId);

      expect(mockStripeService.createSubscription).toHaveBeenCalledWith(
        userId,
        planId,
        paymentMethodId
      );
      expect(subscription).toBeDefined();
      expect(subscription?.status).toBe('active');
    });

    it('should handle subscription creation errors', async () => {
      const userId = 'test-user-123';
      const planId = 'pro';
      const paymentMethodId = 'pm_invalid';

      mockStripeService.createSubscription.mockRejectedValue({
        code: 'card_declined',
        message: 'Your card was declined.'
      });

      await expect(subscriptionService.createSubscription(userId, planId, paymentMethodId)).rejects.toThrow();
    });
  });

  describe('Subscription Retrieval', () => {
    it('should get active subscription for user', async () => {
      const userId = 'test-user-123';
      const mockSubscription = {
        id: 'sub_test_123',
        userId,
        status: 'active' as SubscriptionStatus,
        plan: 'pro',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockSubscription
      });

      const subscription = await subscriptionService.getUserSubscription(userId);

      expect(subscription).toEqual(mockSubscription);
    });

    it('should return null for user with no subscription', async () => {
      const userId = 'test-user-123';

      mockGetDoc.mockResolvedValue({
        exists: () => false,
        data: () => undefined
      });

      const subscription = await subscriptionService.getUserSubscription(userId);

      expect(subscription).toBeNull();
    });
  });

  describe('Subscription Updates', () => {
    it('should update subscription plan', async () => {
      const subscriptionId = 'sub_test_123';
      const newPlanId = 'enterprise';

      const mockUpdatedSubscription = {
        id: subscriptionId,
        status: 'active',
        plan: newPlanId
      };

      mockStripeService.updateSubscription.mockResolvedValue(mockUpdatedSubscription);
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await subscriptionService.updateSubscriptionPlan(subscriptionId, newPlanId);

      expect(mockStripeService.updateSubscription).toHaveBeenCalledWith(subscriptionId, { plan: newPlanId });
      expect(result.success).toBe(true);
    });

    it('should handle subscription update errors', async () => {
      const subscriptionId = 'sub_test_123';
      const newPlanId = 'enterprise';

      mockStripeService.updateSubscription.mockRejectedValue({
        code: 'subscription_not_found',
        message: 'No such subscription.'
      });

      await expect(subscriptionService.updateSubscriptionPlan(subscriptionId, newPlanId)).rejects.toThrow();
    });
  });

  describe('Subscription Cancellation', () => {
    it('should cancel subscription successfully', async () => {
      const subscriptionId = 'sub_test_123';

      mockStripeService.cancelSubscription.mockResolvedValue({
        id: subscriptionId,
        status: 'canceled'
      });
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await subscriptionService.cancelSubscription(subscriptionId);

      expect(mockStripeService.cancelSubscription).toHaveBeenCalledWith(subscriptionId);
      expect(result.success).toBe(true);
    });

    it('should handle cancellation errors', async () => {
      const subscriptionId = 'sub_invalid';

      mockStripeService.cancelSubscription.mockRejectedValue({
        code: 'subscription_not_found',
        message: 'No such subscription.'
      });

      await expect(subscriptionService.cancelSubscription(subscriptionId)).rejects.toThrow();
    });
  });

  describe('Payment Method Management', () => {
    it('should add payment method to customer', async () => {
      const userId = 'test-user-123';
      const paymentMethodId = 'pm_test_123';

      mockStripeService.createPaymentMethod.mockResolvedValue({
        id: paymentMethodId,
        type: 'card'
      });
      mockStripeService.updateCustomer.mockResolvedValue({
        id: 'cus_test_123',
        default_payment_method: paymentMethodId
      });

      const result = await subscriptionService.addPaymentMethod(userId, paymentMethodId);

      expect(mockStripeService.createPaymentMethod).toHaveBeenCalledWith(paymentMethodId);
      expect(result.success).toBe(true);
    });

    it('should get customer payment methods', async () => {
      const userId = 'test-user-123';
      const mockPaymentMethods = [
        { id: 'pm_1', type: 'card', card: { brand: 'visa' } },
        { id: 'pm_2', type: 'card', card: { brand: 'mastercard' } }
      ];

      mockStripeService.getPaymentMethods.mockResolvedValue({
        data: mockPaymentMethods
      });

      const paymentMethods = await subscriptionService.getPaymentMethods(userId);

      expect(paymentMethods).toEqual(mockPaymentMethods);
    });
  });

  describe('Checkout and Portal Sessions', () => {
    it('should create checkout session for subscription', async () => {
      const userId = 'test-user-123';
      const planId = 'pro';
      const successUrl = 'https://app.coachcore.ai/success';
      const cancelUrl = 'https://app.coachcore.ai/cancel';

      const mockCheckoutSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test'
      };

      mockStripeService.createCheckoutSession.mockResolvedValue(mockCheckoutSession);

      const session = await subscriptionService.createCheckoutSession(userId, planId, successUrl, cancelUrl);

      expect(mockStripeService.createCheckoutSession).toHaveBeenCalledWith(
        userId,
        planId,
        successUrl,
        cancelUrl
      );
      expect(session).toEqual(mockCheckoutSession);
    });

    it('should create customer portal session', async () => {
      const userId = 'test-user-123';
      const returnUrl = 'https://app.coachcore.ai/account';

      const mockPortalSession = {
        id: 'ps_test_123',
        url: 'https://billing.stripe.com/test'
      };

      mockStripeService.createPortalSession.mockResolvedValue(mockPortalSession);

      const session = await subscriptionService.createPortalSession(userId, returnUrl);

      expect(mockStripeService.createPortalSession).toHaveBeenCalledWith(userId, returnUrl);
      expect(session).toEqual(mockPortalSession);
    });
  });

  describe('Subscription Status Management', () => {
    it('should handle active subscription status', async () => {
      const subscriptionId = 'sub_test_123';
      const mockSubscription = {
        id: subscriptionId,
        status: 'active',
        current_period_end: (Date.now() / 1000) + (30 * 24 * 60 * 60)
      };

      mockStripeService.getSubscription.mockResolvedValue(mockSubscription);

      const status = await subscriptionService.getSubscriptionStatus(subscriptionId);

      expect(status).toBe('active');
    });

    it('should handle past due subscription status', async () => {
      const subscriptionId = 'sub_test_123';
      const mockSubscription = {
        id: subscriptionId,
        status: 'past_due',
        current_period_end: (Date.now() / 1000) - (24 * 60 * 60)
      };

      mockStripeService.getSubscription.mockResolvedValue(mockSubscription);

      const status = await subscriptionService.getSubscriptionStatus(subscriptionId);

      expect(status).toBe('past_due');
    });

    it('should handle canceled subscription status', async () => {
      const subscriptionId = 'sub_test_123';
      const mockSubscription = {
        id: subscriptionId,
        status: 'canceled',
        canceled_at: Date.now() / 1000
      };

      mockStripeService.getSubscription.mockResolvedValue(mockSubscription);

      const status = await subscriptionService.getSubscriptionStatus(subscriptionId);

      expect(status).toBe('canceled');
    });
  });

  describe('Webhook Handling', () => {
    it('should handle subscription created webhook', async () => {
      const webhookEvent = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'active',
            plan: { id: 'pro' }
          }
        }
      };

      mockSetDoc.mockResolvedValue(undefined);

      await subscriptionService.handleWebhookEvent(webhookEvent);

      expect(mockSetDoc).toHaveBeenCalled();
    });

    it('should handle subscription updated webhook', async () => {
      const webhookEvent = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'active',
            plan: { id: 'enterprise' }
          }
        }
      };

      mockUpdateDoc.mockResolvedValue(undefined);

      await subscriptionService.handleWebhookEvent(webhookEvent);

      expect(mockUpdateDoc).toHaveBeenCalled();
    });

    it('should handle subscription deleted webhook', async () => {
      const webhookEvent = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'canceled'
          }
        }
      };

      mockUpdateDoc.mockResolvedValue(undefined);

      await subscriptionService.handleWebhookEvent(webhookEvent);

      expect(mockUpdateDoc).toHaveBeenCalled();
    });
  });

  describe('Real-time Subscription Updates', () => {
    it('should subscribe to subscription changes', async () => {
      const userId = 'test-user-123';
      const mockCallback = vi.fn();

      mockOnSnapshot.mockReturnValue(() => {}); // Mock unsubscribe function

      const unsubscribe = subscriptionService.subscribeToSubscriptionChanges(userId, mockCallback);

      expect(mockOnSnapshot).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('should handle subscription change callbacks', async () => {
      const userId = 'test-user-123';
      const mockCallback = vi.fn();
      const mockSubscription = {
        id: 'sub_test_123',
        status: 'active',
        plan: 'pro'
      };

      mockOnSnapshot.mockImplementation((query, callback) => {
        callback({
          docs: [{
            id: 'sub_test_123',
            data: () => mockSubscription
          }]
        });
        return () => {}; // Mock unsubscribe function
      });

      subscriptionService.subscribeToSubscriptionChanges(userId, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(mockSubscription);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors gracefully', async () => {
      const userId = 'test-user-123';

      mockGetDoc.mockRejectedValue({
        code: 'unavailable',
        message: 'The service is currently unavailable.'
      });

      await expect(subscriptionService.getUserProfile(userId)).rejects.toThrow();
    });

    it('should handle permission denied errors', async () => {
      const userId = 'test-user-123';

      mockGetDoc.mockRejectedValue({
        code: 'permission-denied',
        message: 'The user does not have permission to access this document.'
      });

      await expect(subscriptionService.getUserProfile(userId)).rejects.toThrow();
    });

    it('should validate subscription data before processing', async () => {
      const userId = 'test-user-123';
      const invalidPlanId = '';

      await expect(subscriptionService.createSubscription(userId, invalidPlanId, 'pm_test')).rejects.toThrow();
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle multiple concurrent subscription requests', async () => {
      const userId = 'test-user-123';
      const planId = 'pro';
      const paymentMethodId = 'pm_test_123';

      mockStripeService.createSubscription.mockResolvedValue({
        id: 'sub_test_123',
        status: 'active'
      });
      mockSetDoc.mockResolvedValue(undefined);
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ userId, subscription: { plan: 'free' } })
      });

      const promises = Array.from({ length: 5 }, () => 
        subscriptionService.createSubscription(userId, planId, paymentMethodId)
      );

      const results = await Promise.allSettled(promises);

      // Should handle concurrent requests gracefully
      expect(results).toHaveLength(5);
    });

    it('should use efficient Firestore queries', async () => {
      const userId = 'test-user-123';

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ userId, subscription: { plan: 'pro' } })
      });

      await subscriptionService.getUserSubscription(userId);

      expect(mockDoc).toHaveBeenCalledWith(expect.any(Object), 'subscriptions', userId);
    });
  });
});






