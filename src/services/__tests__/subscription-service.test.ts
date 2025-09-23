import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { subscriptionService } from '../subscription/subscription-service';

// Mock Stripe
const mockCreateCheckoutSession = vi.fn();
const mockRetrieveSubscription = vi.fn();
const mockCancelSubscription = vi.fn();
const mockReactivateSubscription = vi.fn();

vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    checkout: {
      sessions: {
        create: mockCreateCheckoutSession
      }
    },
    subscriptions: {
      retrieve: mockRetrieveSubscription,
      cancel: mockCancelSubscription,
      update: mockReactivateSubscription
    }
  }))
}));

// Mock Firebase
const mockDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockSetDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  doc: mockDoc,
  getDoc: mockGetDoc,
  updateDoc: mockUpdateDoc,
  setDoc: mockSetDoc,
  serverTimestamp: vi.fn(() => 'mock-timestamp')
}));

describe('SubscriptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session successfully', async () => {
      mockCreateCheckoutSession.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/c/pay/cs_test_123'
      });

      const result = await subscriptionService.createCheckoutSession(
        'test@example.com',
        'pro',
        'monthly'
      );

      expect(mockCreateCheckoutSession).toHaveBeenCalledWith({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Coach Core AI Pro',
                description: 'Advanced features for football coaches'
              },
              unit_amount: 2900, // $29.00
              recurring: {
                interval: 'month'
              }
            },
            quantity: 1
          }
        ],
        mode: 'subscription',
        customer_email: 'test@example.com',
        success_url: expect.stringContaining('/dashboard?payment=success'),
        cancel_url: expect.stringContaining('/pricing?payment=cancelled'),
        metadata: {
          plan: 'pro',
          billing_cycle: 'monthly'
        }
      });

      expect(result).toEqual({
        success: true,
        sessionId: 'cs_test_123',
        url: 'https://checkout.stripe.com/c/pay/cs_test_123'
      });
    });

    it('should handle Stripe errors', async () => {
      mockCreateCheckoutSession.mockRejectedValue(new Error('Stripe error'));

      const result = await subscriptionService.createCheckoutSession(
        'test@example.com',
        'pro',
        'monthly'
      );

      expect(result).toEqual({
        success: false,
        error: 'Failed to create checkout session'
      });
    });
  });

  describe('getSubscription', () => {
    it('should retrieve subscription successfully', async () => {
      mockRetrieveSubscription.mockResolvedValue({
        id: 'sub_test_123',
        status: 'active',
        current_period_start: 1640995200,
        current_period_end: 1643673600,
        plan: {
          id: 'price_pro_monthly',
          nickname: 'Pro Monthly'
        }
      });

      const result = await subscriptionService.getSubscription('sub_test_123');

      expect(mockRetrieveSubscription).toHaveBeenCalledWith('sub_test_123');
      expect(result).toEqual({
        success: true,
        subscription: {
          id: 'sub_test_123',
          status: 'active',
          plan: 'pro',
          billingCycle: 'monthly',
          currentPeriodStart: new Date(1640995200 * 1000),
          currentPeriodEnd: new Date(1643673600 * 1000)
        }
      });
    });

    it('should handle subscription not found', async () => {
      mockRetrieveSubscription.mockRejectedValue({
        type: 'StripeInvalidRequestError',
        code: 'resource_missing'
      });

      const result = await subscriptionService.getSubscription('invalid_sub_id');

      expect(result).toEqual({
        success: false,
        error: 'Subscription not found'
      });
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription successfully', async () => {
      mockCancelSubscription.mockResolvedValue({
        id: 'sub_test_123',
        status: 'canceled',
        canceled_at: 1640995200
      });

      const result = await subscriptionService.cancelSubscription('sub_test_123');

      expect(mockCancelSubscription).toHaveBeenCalledWith('sub_test_123');
      expect(result).toEqual({
        success: true,
        subscription: {
          id: 'sub_test_123',
          status: 'canceled',
          canceledAt: new Date(1640995200 * 1000)
        }
      });
    });

    it('should handle cancellation errors', async () => {
      mockCancelSubscription.mockRejectedValue(new Error('Cancellation failed'));

      const result = await subscriptionService.cancelSubscription('sub_test_123');

      expect(result).toEqual({
        success: false,
        error: 'Failed to cancel subscription'
      });
    });
  });

  describe('reactivateSubscription', () => {
    it('should reactivate subscription successfully', async () => {
      mockReactivateSubscription.mockResolvedValue({
        id: 'sub_test_123',
        status: 'active',
        canceled_at: null
      });

      const result = await subscriptionService.reactivateSubscription('sub_test_123');

      expect(mockReactivateSubscription).toHaveBeenCalledWith('sub_test_123', {
        cancel_at_period_end: false
      });
      expect(result).toEqual({
        success: true,
        subscription: {
          id: 'sub_test_123',
          status: 'active',
          canceledAt: null
        }
      });
    });

    it('should handle reactivation errors', async () => {
      mockReactivateSubscription.mockRejectedValue(new Error('Reactivation failed'));

      const result = await subscriptionService.reactivateSubscription('sub_test_123');

      expect(result).toEqual({
        success: false,
        error: 'Failed to reactivate subscription'
      });
    });
  });

  describe('updateUserSubscription', () => {
    it('should update user subscription in Firestore', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await subscriptionService.updateUserSubscription('user_123', {
        plan: 'pro',
        status: 'active',
        subscriptionId: 'sub_test_123',
        currentPeriodEnd: new Date('2024-02-01')
      });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        {
          subscription: {
            plan: 'pro',
            status: 'active',
            subscriptionId: 'sub_test_123',
            currentPeriodEnd: new Date('2024-02-01')
          },
          updatedAt: 'mock-timestamp'
        }
      );
      expect(result).toEqual({
        success: true
      });
    });

    it('should handle Firestore update errors', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Firestore error'));

      const result = await subscriptionService.updateUserSubscription('user_123', {
        plan: 'pro',
        status: 'active'
      });

      expect(result).toEqual({
        success: false,
        error: 'Failed to update user subscription'
      });
    });
  });

  describe('getUserSubscription', () => {
    it('should get user subscription from Firestore', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          subscription: {
            plan: 'pro',
            status: 'active',
            subscriptionId: 'sub_test_123',
            currentPeriodEnd: new Date('2024-02-01')
          }
        })
      });

      const result = await subscriptionService.getUserSubscription('user_123');

      expect(mockGetDoc).toHaveBeenCalledWith(expect.any(Object));
      expect(result).toEqual({
        success: true,
        subscription: {
          plan: 'pro',
          status: 'active',
          subscriptionId: 'sub_test_123',
          currentPeriodEnd: new Date('2024-02-01')
        }
      });
    });

    it('should handle user not found', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
        data: () => null
      });

      const result = await subscriptionService.getUserSubscription('user_123');

      expect(result).toEqual({
        success: false,
        error: 'User not found'
      });
    });
  });

  describe('handleWebhook', () => {
    it('should handle checkout.session.completed webhook', async () => {
      const webhookData = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            payment_status: 'paid',
            metadata: {
              plan: 'pro',
              billing_cycle: 'monthly'
            }
          }
        }
      };

      mockRetrieveSubscription.mockResolvedValue({
        id: 'sub_test_123',
        status: 'active',
        current_period_end: 1643673600
      });

      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await subscriptionService.handleWebhook(webhookData);

      expect(result).toEqual({
        success: true,
        processed: true
      });
    });

    it('should handle customer.subscription.updated webhook', async () => {
      const webhookData = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test_123',
            status: 'active',
            current_period_end: 1643673600
          }
        }
      };

      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await subscriptionService.handleWebhook(webhookData);

      expect(result).toEqual({
        success: true,
        processed: true
      });
    });

    it('should handle customer.subscription.deleted webhook', async () => {
      const webhookData = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test_123',
            status: 'canceled',
            canceled_at: 1640995200
          }
        }
      };

      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await subscriptionService.handleWebhook(webhookData);

      expect(result).toEqual({
        success: true,
        processed: true
      });
    });

    it('should ignore unknown webhook types', async () => {
      const webhookData = {
        type: 'unknown.event',
        data: {
          object: {}
        }
      };

      const result = await subscriptionService.handleWebhook(webhookData);

      expect(result).toEqual({
        success: true,
        processed: false
      });
    });
  });
});






