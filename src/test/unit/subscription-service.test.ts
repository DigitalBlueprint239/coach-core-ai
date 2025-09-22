import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

const SERVER_TS = { __serverTimestamp: true } as const;

// Mutable stubs per-test
const setDocMock = vi.hoisted(() => vi.fn());
const updateDocMock = vi.hoisted(() => vi.fn());
const getDocMock = vi.hoisted(() => vi.fn());
const getDocsMock = vi.hoisted(() => vi.fn());

vi.mock('firebase/firestore', () => {
  const Timestamp = class {
    private ms: number;
    constructor(ms: number) { this.ms = ms; }
    toMillis() { return this.ms; }
    static fromDate(d: Date) { return new Timestamp(d.getTime()); }
  };

  return {
    collection: vi.fn((_db: any, path: string) => ({ path })),
    doc: vi.fn((dbOrColl: any, path?: string, id?: string) => {
      if (id) return { path: `${path}/${id}`, id } as any;
      if (typeof path === 'string') return { path, id: `auto-id-${  Math.random().toString(36).slice(2, 8)}` } as any;
      if (dbOrColl?.path) return { path: dbOrColl.path, id: `auto-id-${  Math.random().toString(36).slice(2, 8)}` } as any;
      return { path: 'unknown', id: 'auto-id' } as any;
    }),
    setDoc: setDocMock.mockImplementation(async (_ref, _data) => {}),
    updateDoc: updateDocMock.mockImplementation(async (_ref, _data) => {}),
    getDoc: getDocMock,
    getDocs: getDocsMock,
    query: vi.fn((...args: any[]) => ({ q: args })),
    where: vi.fn((field: string, op: string, value: any) => ({ field, op, value })),
    serverTimestamp: vi.fn(() => SERVER_TS),
    onSnapshot: vi.fn(),
    Unsubscribe: {} as any,
    Timestamp,
  };
});

vi.mock('../../services/firebase/firebase-config', () => ({ db: {} }));
vi.mock('../../utils/secure-logger', () => ({ default: { info: vi.fn(), error: vi.fn() } }));
vi.mock('../../services/payments/stripe-config', () => ({
  stripeService: {
    cancelSubscription: vi.fn().mockResolvedValue(true),
    redirectToCheckout: vi.fn().mockResolvedValue(true),
    hasFeatureAccess: vi.fn().mockReturnValue(true),
    isWithinLimits: vi.fn().mockReturnValue(true),
  },
  SUBSCRIPTION_TIERS: {
    FREE: { limits: { savedPlays: 10, teamMembers: 5, aiGenerations: 50, storageGB: 1 }, stripePriceId: 'price_free' },
    PRO: { limits: { savedPlays: 1000, teamMembers: 20, aiGenerations: 1000, storageGB: 50 }, stripePriceId: 'price_pro' },
  },
  SubscriptionTierId: {} as any,
}));

import { subscriptionService } from '../../services/payments/subscription-service';

const getArgs = (mock: any, i = 0) => mock.mock.calls[i];

describe('SubscriptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createSubscription sanitizes payload and applies server timestamps', async () => {
    getDocMock.mockResolvedValueOnce({ exists: () => false, data: () => ({}) });

    const id = await subscriptionService.createSubscription({
      userId: 'u1',
      customerId: 'c1',
      subscriptionId: 's1',
      tier: 'FREE' as any,
      status: 'active',
      currentPeriodStart: undefined as unknown as Date,
      currentPeriodEnd: undefined as unknown as Date,
      cancelAtPeriodEnd: false,
    });

    expect(id).toBeDefined();
    const [, createdData] = getArgs(setDocMock, 0);
    // Strict schema
    expect(createdData).toMatchObject({ userId: 'u1', plan: 'FREE', status: 'active' });
    expect(createdData.createdAt).toEqual(SERVER_TS);
    expect(createdData.updatedAt).toEqual(SERVER_TS);

    // User profile creation path invoked
    expect(setDocMock).toHaveBeenCalledTimes(2); // subscription + user profile create
  });

  it('updateSubscription sanitizes payloads and updates updatedAt via serverTimestamp', async () => {
    await subscriptionService.updateSubscription('sub123', {
      status: 'past_due',
      trialEnd: undefined as unknown as Date,
    });

    expect(updateDocMock).toHaveBeenCalledTimes(1);
    const [, updatedData] = getArgs(updateDocMock, 0);
    expect(updatedData.updatedAt).toEqual(SERVER_TS);
    expect('trialEnd' in updatedData).toBe(false);
  });

  it('getUserSubscription sorts safely for Date and Timestamp types', async () => {
    // Two docs: one with Date earlier, one with Timestamp later
    const now = new Date();
    const earlier = new Date(now.getTime() - 1000);
    const timestampLater = { toMillis: () => now.getTime() };

    getDocsMock.mockResolvedValueOnce({
      empty: false,
      docs: [
        { data: () => ({ id: 'A', createdAt: earlier, userId: 'u1', tier: 'FREE', status: 'active' }) },
        { data: () => ({ id: 'B', createdAt: timestampLater, userId: 'u1', tier: 'FREE', status: 'active' }) },
      ],
    });

    const sub = await subscriptionService.getUserSubscription('u1');
    expect(sub?.id).toBe('B');
  });

  it('createOrUpdateUserProfile uses sanitization for create and update paths', async () => {
    // create path
    getDocMock.mockResolvedValueOnce({ exists: () => false, data: () => ({}) });
    await subscriptionService.createOrUpdateUserProfile('u1', 'a@example.com', { tier: 'FREE' as any, status: 'active' });
    // update path
    getDocMock.mockResolvedValueOnce({ exists: () => true, data: () => ({ createdAt: new Date(), usage: {} }) });
    await subscriptionService.createOrUpdateUserProfile('u1', 'a@example.com', { tier: 'FREE' as any, status: 'active' });

    // First call: setDoc (create)
    const [, createData] = getArgs(setDocMock, 0);
    expect(createData.createdAt).toEqual(SERVER_TS);
    expect(createData.updatedAt).toEqual(SERVER_TS);

    // Second path: updateDoc (update)
    const [, updateData] = getArgs(updateDocMock, 0);
    expect(updateData.updatedAt).toEqual(SERVER_TS);
  });
});
