import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubscriptionService } from '../payments/subscription-service';

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn().mockResolvedValue({ id: 'test-subscription-id' }),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({
      id: 'test-subscription-id',
      userId: 'test-user-id',
      tier: 'pro',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  }),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({
    docs: [],
  }),
  serverTimestamp: vi.fn().mockReturnValue(new Date()),
}));

// Mock Firebase app
vi.mock('../firebase/firebase-config', () => ({
  db: vi.fn(),
}));

// Mock Stripe service
vi.mock('../payments/stripe-config', () => ({
  stripeService: {
    createSubscription: vi.fn().mockResolvedValue({
      id: 'stripe-subscription-id',
      status: 'active',
    }),
    cancelSubscription: vi.fn().mockResolvedValue({
      id: 'stripe-subscription-id',
      status: 'canceled',
    }),
  },
  SubscriptionTier: {
    free: { price: 0, currency: 'USD' },
    pro: { price: 2900, currency: 'USD' },
    enterprise: { price: 9900, currency: 'USD' },
  },
}));

// Mock GA4 service
vi.mock('../analytics/ga4-config', () => ({
  ga4Service: {
    trackBetaActivated: vi.fn(),
    trackSubscriptionStarted: vi.fn(),
    trackSubscriptionCompleted: vi.fn(),
    trackSubscriptionCanceled: vi.fn(),
  },
}));

// Mock Firestore sanitization
vi.mock('../../utils/firestore-sanitization', () => ({
  createFirestoreHelper: vi.fn().mockReturnValue({
    prepareCreate: vi.fn().mockReturnValue({
      data: { test: 'data' },
      isValid: true,
      warnings: [],
    }),
    prepareUpdate: vi.fn().mockReturnValue({
      data: { test: 'data' },
      isValid: true,
      warnings: [],
    }),
    logResult: vi.fn(),
  }),
}));

describe('SubscriptionService', () => {
  let subscriptionService: SubscriptionService;

  beforeEach(() => {
    vi.clearAllMocks();
    subscriptionService = new SubscriptionService();
  });

  it('should create subscription service instance', () => {
    expect(subscriptionService).toBeDefined();
  });

  it('should create free subscription', async () => {
    const result = await subscriptionService.createSubscription(
      'test-user-id',
      'free'
    );

    expect(result).toBe('test-subscription-id');
  });

  it('should create pro subscription', async () => {
    const result = await subscriptionService.createSubscription(
      'test-user-id',
      'pro'
    );

    expect(result).toBe('test-subscription-id');
  });

  it('should create enterprise subscription', async () => {
    const result = await subscriptionService.createSubscription(
      'test-user-id',
      'enterprise'
    );

    expect(result).toBe('test-subscription-id');
  });

  it('should get subscription by ID', async () => {
    const subscription = await subscriptionService.getSubscriptionById(
      'test-subscription-id'
    );

    expect(subscription).toBeDefined();
    expect(subscription?.id).toBe('test-subscription-id');
    expect(subscription?.userId).toBe('test-user-id');
    expect(subscription?.tier).toBe('pro');
  });

  it('should get user subscriptions', async () => {
    const subscriptions = await subscriptionService.getUserSubscriptions(
      'test-user-id'
    );

    expect(Array.isArray(subscriptions)).toBe(true);
  });

  it('should update subscription', async () => {
    const updates = {
      status: 'inactive' as const,
      updatedAt: new Date(),
    };

    await subscriptionService.updateSubscription(
      'test-subscription-id',
      updates
    );

    // Should not throw error
    expect(true).toBe(true);
  });

  it('should cancel subscription', async () => {
    await subscriptionService.cancelSubscription(
      'test-subscription-id',
      true
    );

    // Should not throw error
    expect(true).toBe(true);
  });

  it('should delete subscription', async () => {
    await subscriptionService.deleteSubscription('test-subscription-id');

    // Should not throw error
    expect(true).toBe(true);
  });

  it('should check subscription status', async () => {
    const isActive = await subscriptionService.isSubscriptionActive(
      'test-subscription-id'
    );

    expect(typeof isActive).toBe('boolean');
  });

  it('should get subscription tier', async () => {
    const tier = await subscriptionService.getSubscriptionTier(
      'test-user-id'
    );

    expect(tier).toBe('pro');
  });

  it('should check feature access', async () => {
    const hasAccess = await subscriptionService.hasFeatureAccess(
      'test-user-id',
      'play_designer'
    );

    expect(typeof hasAccess).toBe('boolean');
  });

  it('should track usage', async () => {
    await subscriptionService.trackUsage(
      'test-user-id',
      'play_designer',
      { playsGenerated: 1 }
    );

    // Should not throw error
    expect(true).toBe(true);
  });

  it('should get usage stats', async () => {
    const stats = await subscriptionService.getUsageStats('test-user-id');

    expect(stats).toBeDefined();
    expect(typeof stats).toBe('object');
  });
});
