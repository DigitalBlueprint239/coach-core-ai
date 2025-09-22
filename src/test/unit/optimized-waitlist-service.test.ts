import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

// Sentinel for serverTimestamp()
const SERVER_TS = { __serverTimestamp: true } as const;

// Firestore mocks (hoisted)
const setDocMock = vi.hoisted(() => vi.fn());
const addDocMock = vi.hoisted(() => vi.fn());
const updateDocMock = vi.hoisted(() => vi.fn());
const writeBatchSetMock = vi.hoisted(() => vi.fn());
const writeBatchCommitMock = vi.hoisted(() => vi.fn());
const getDocsMock = vi.hoisted(() => vi.fn());

vi.mock('firebase/firestore', () => {
  const Timestamp = class {
    private ms: number;
    constructor(ms: number) { this.ms = ms; }
    toMillis() { return this.ms; }
    static fromDate(d: Date) { return new Timestamp(d.getTime()); }
  };

  return {
    collection: vi.fn((db: any, path: string) => ({ path })),
    doc: vi.fn((dbOrColl: any, path?: string, id?: string) => {
      // Support doc(db, 'col') to auto-id and doc(db, 'col', 'id')
      if (id) return { path: `${path}/${id}`, id } as any;
      if (typeof path === 'string') return { path, id: `auto-id-${  Math.random().toString(36).slice(2, 8)}` } as any;
      // doc(collectionRef)
      if (dbOrColl?.path) return { path: dbOrColl.path, id: `auto-id-${  Math.random().toString(36).slice(2, 8)}` } as any;
      return { path: 'unknown', id: 'auto-id' } as any;
    }),
    addDoc: addDocMock.mockImplementation(async (_collRef, data) => ({ id: 'new-doc-id', data })),
    setDoc: setDocMock.mockImplementation(async (_docRef, _data) => {}),
    updateDoc: updateDocMock.mockImplementation(async (_docRef, _data) => {}),
    writeBatch: vi.fn(() => ({ set: writeBatchSetMock, commit: writeBatchCommitMock.mockResolvedValue(undefined) })),
    serverTimestamp: vi.fn(() => SERVER_TS),
    query: vi.fn((...args: any[]) => ({ q: args })),
    where: vi.fn((field: string, op: string, value: any) => ({ field, op, value })),
    getDocs: getDocsMock.mockResolvedValue({ empty: true, docs: [] }),
    Timestamp,
  };
});

// Mock firebase-config db
vi.mock('../../services/firebase/firebase-config', () => ({ db: {} }));

// Security and analytics mocks used by the service
vi.mock('../../services/security/rate-limiter', () => ({
  rateLimiter: {
    checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  },
}));

vi.mock('../../services/security/audit-logger', () => ({
  auditLogger: {
    logWaitlistSubmission: vi.fn().mockResolvedValue(undefined),
    logFailedAction: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../services/security/validation-rules', () => ({
  ValidationService: {
    validateAndSanitizeEmail: (email: string) => {
      const sanitized = email.trim().toLowerCase();
      const ok = /.+@.+\..+/.test(sanitized);
      return ok ? { success: true, email: sanitized } : { success: false, error: 'Invalid email' };
    },
  },
}));

vi.mock('../../services/analytics', () => ({
  trackUserAction: vi.fn(),
  trackWaitlistSignup: vi.fn(),
  trackWaitlistSignupSuccess: vi.fn(),
  trackWaitlistSignupError: vi.fn(),
  trackWaitlistConversion: vi.fn(),
}));

vi.mock('../../utils/error-handling', () => ({
  errorHandler: {
    handleError: (e: any) => e,
    getUserFriendlyMessage: (e: any) => e?.message || 'error',
  },
  FirebaseErrorHandler: {
    handleFirestoreError: (e: any) => e,
  },
}));

// Import after mocks
import { optimizedWaitlistService } from '../../services/waitlist/optimized-waitlist-service';
import { serverTimestamp } from 'firebase/firestore';

const getArgs = (mock: any, callIndex = 0) => mock.mock.calls[callIndex];

describe('OptimizedWaitlistService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure navigator exists in test env
    // @ts-ignore
    globalThis.navigator = { userAgent: 'vitest' } as any;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sanitizes direct add: removes undefined and adds server timestamps', async () => {
    const email = 'Test@Example.com';
    await optimizedWaitlistService.addToWaitlist(email, { source: 'landing', ipAddress: undefined, userAgent: 'UA' }, false);

    expect(addDocMock).toHaveBeenCalledTimes(1);
    const [, data] = getArgs(addDocMock);
    // Required fields
    expect(data.email).toBe('test@example.com');
    expect(data.source).toBe('landing');
    expect(data.userAgent).toBe('UA');
    expect(data.batchProcessed).toBe(false);
    // Undefined removed
    expect('ipAddress' in data).toBe(false);
    // Strict schema timestamps
    expect(data.createdAt).toEqual(SERVER_TS);
    // No extra fields allowed by rules
    expect('updatedAt' in data).toBe(false);
    expect('timestamp' in data).toBe(false);
  });

  it('processes batch entries and sanitizes payloads', async () => {
    await optimizedWaitlistService.addToWaitlist('a@example.com');
    await optimizedWaitlistService.addToWaitlist('b@example.com');

    await optimizedWaitlistService.flushBatch();

    expect(writeBatchSetMock).toHaveBeenCalled();
    // Inspect first batched set call
    const [, firstBatchData] = getArgs(writeBatchSetMock, 0);
    expect(firstBatchData.email).toBeDefined();
    expect(firstBatchData.createdAt).toEqual(SERVER_TS);
    expect('updatedAt' in firstBatchData).toBe(false);
    expect('timestamp' in firstBatchData).toBe(false);
    expect(writeBatchCommitMock).toHaveBeenCalledTimes(1);
  });

  it('bulk add uses batch and sanitized data', async () => {
    await optimizedWaitlistService.addMultipleToWaitlist([
      { email: 'x@example.com', metadata: { userAgent: 'UA', ipAddress: undefined } },
      { email: 'y@example.com', metadata: { source: 'ref' } },
    ]);

    expect(writeBatchSetMock).toHaveBeenCalledTimes(2);
    const [, data1] = getArgs(writeBatchSetMock, 0);
    const [, data2] = getArgs(writeBatchSetMock, 1);

    for (const d of [data1, data2]) {
      expect(d.createdAt).toEqual(SERVER_TS);
      expect('updatedAt' in d).toBe(false);
      expect('timestamp' in d).toBe(false);
      expect('ipAddress' in d).toBe(false);
      expect('userAgent' in d).toBe(false);
    }
  });
});
