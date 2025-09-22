import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitlistService, WaitlistEntry } from '../waitlist-service';

// Mock Firebase Firestore
const mockAddDoc = vi.fn();
const mockQuery = vi.fn();
const mockWhere = vi.fn();
const mockGetDocs = vi.fn();
const mockServerTimestamp = vi.fn(() => 'mock-timestamp');

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ id: 'waitlist' })),
  addDoc: mockAddDoc,
  query: mockQuery,
  where: mockWhere,
  getDocs: mockGetDocs,
  serverTimestamp: mockServerTimestamp
}));

// Mock Firebase config
vi.mock('../firebase/firebase-config', () => ({
  db: {}
}));

// Mock validation utilities
vi.mock('../../../utils/validation', () => ({
  validateWaitlistEmail: vi.fn((email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }),
  RateLimiter: vi.fn().mockImplementation(() => ({
    isAllowed: vi.fn(() => true),
    recordAttempt: vi.fn()
  }))
}));

// Mock error handling
vi.mock('../../../utils/error-handling', () => ({
  errorHandler: vi.fn((error) => error),
  FirebaseErrorHandler: vi.fn()
}));

// Mock monitoring and analytics
vi.mock('../../monitoring', () => ({
  trackUserAction: vi.fn(),
  trackError: vi.fn()
}));

vi.mock('../../analytics', () => ({
  trackWaitlistSignup: vi.fn(),
  trackWaitlistSignupSuccess: vi.fn(),
  trackWaitlistSignupError: vi.fn(),
  trackWaitlistConversion: vi.fn()
}));

// Mock security services
vi.mock('../../security/rate-limiter', () => ({
  rateLimiter: {
    checkRateLimit: vi.fn(() => Promise.resolve({ allowed: true, remaining: 10 }))
  }
}));

vi.mock('../../security/audit-logger', () => ({
  auditLogger: {
    logAction: vi.fn()
  }
}));

vi.mock('../../security/validation-rules', () => ({
  ValidationService: {
    validateEmail: vi.fn((email: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    })
  }
}));

// Mock firestore sanitization
vi.mock('../../../utils/firestore-sanitization', () => ({
  createFirestoreHelper: vi.fn(() => ({
    sanitize: vi.fn((data) => data),
    validate: vi.fn(() => true)
  }))
}));

// Mock GA4 service
vi.mock('../../analytics/ga4-config', () => ({
  ga4Service: {
    trackEvent: vi.fn()
  }
}));

describe('WaitlistService - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Email Validation', () => {
    it('should accept valid email addresses', async () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test+tag@example.org',
        'user123@test-domain.com'
      ];

      for (const email of validEmails) {
        mockAddDoc.mockResolvedValue({ id: 'test-id' });
        mockGetDocs.mockResolvedValue({ empty: true, docs: [] });

        const result = await waitlistService.addToWaitlist(email);

        expect(result.success).toBe(true);
        expect(mockAddDoc).toHaveBeenCalled();
      }
    });

    it('should reject invalid email addresses', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test.example.com',
        '',
        'test@.com',
        'test@example.',
        'test space@example.com'
      ];

      for (const email of invalidEmails) {
        await expect(waitlistService.addToWaitlist(email)).rejects.toThrow();
      }
    });
  });

  describe('Duplicate Email Prevention', () => {
    it('should prevent duplicate email signups', async () => {
      const email = 'test@example.com';

      // First signup should succeed
      mockAddDoc.mockResolvedValue({ id: 'test-id-1' });
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] });

      const firstResult = await waitlistService.addToWaitlist(email);
      expect(firstResult.success).toBe(true);

      // Second signup should fail
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ id: 'existing-id', data: () => ({ email }) }]
      });

      await expect(waitlistService.addToWaitlist(email)).rejects.toThrow();
    });

    it('should handle case-insensitive duplicate detection', async () => {
      const email = 'Test@Example.com';
      const lowerCaseEmail = 'test@example.com';

      // First signup with mixed case
      mockAddDoc.mockResolvedValue({ id: 'test-id-1' });
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] });

      await waitlistService.addToWaitlist(email);

      // Second signup with lowercase should be detected as duplicate
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ id: 'existing-id', data: () => ({ email: lowerCaseEmail }) }]
      });

      await expect(waitlistService.addToWaitlist(lowerCaseEmail)).rejects.toThrow();
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits for email signups', async () => {
      const email = 'test@example.com';

      // Mock rate limiter to reject the request
      const { rateLimiter } = await import('../../security/rate-limiter');
      rateLimiter.checkRateLimit = vi.fn(() => 
        Promise.resolve({ allowed: false, remaining: 0, resetTime: Date.now() + 60000 })
      );

      await expect(waitlistService.addToWaitlist(email)).rejects.toThrow();
    });

    it('should allow requests within rate limits', async () => {
      const email = 'test@example.com';

      // Mock rate limiter to allow the request
      const { rateLimiter } = await import('../../security/rate-limiter');
      rateLimiter.checkRateLimit = vi.fn(() => 
        Promise.resolve({ allowed: true, remaining: 5 })
      );

      mockAddDoc.mockResolvedValue({ id: 'test-id' });
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] });

      const result = await waitlistService.addToWaitlist(email);
      expect(result.success).toBe(true);
    });
  });

  describe('Waitlist Entry Creation', () => {
    it('should create waitlist entry with all required fields', async () => {
      const email = 'test@example.com';
      const source = 'landing-page';

      mockAddDoc.mockResolvedValue({ id: 'test-id' });
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] });

      const result = await waitlistService.addToWaitlist(email, source);

      expect(result.success).toBe(true);
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          email,
          source,
          timestamp: 'mock-timestamp',
          ipAddress: expect.any(String),
          userAgent: expect.any(String)
        })
      );
    });

    it('should handle optional metadata in waitlist entry', async () => {
      const email = 'test@example.com';
      const metadata = {
        source: 'social-media',
        campaign: 'summer-2024',
        referrer: 'facebook.com'
      };

      mockAddDoc.mockResolvedValue({ id: 'test-id' });
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] });

      const result = await waitlistService.addToWaitlist(email, metadata.source, metadata);

      expect(result.success).toBe(true);
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          email,
          source: metadata.source,
          campaign: metadata.campaign,
          referrer: metadata.referrer
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle Firestore connection errors', async () => {
      const email = 'test@example.com';

      mockAddDoc.mockRejectedValue({
        code: 'unavailable',
        message: 'The service is currently unavailable.'
      });

      await expect(waitlistService.addToWaitlist(email)).rejects.toThrow();
    });

    it('should handle permission denied errors', async () => {
      const email = 'test@example.com';

      mockAddDoc.mockRejectedValue({
        code: 'permission-denied',
        message: 'The user does not have permission to perform this action.'
      });

      await expect(waitlistService.addToWaitlist(email)).rejects.toThrow();
    });

    it('should handle quota exceeded errors', async () => {
      const email = 'test@example.com';

      mockAddDoc.mockRejectedValue({
        code: 'resource-exhausted',
        message: 'Quota exceeded.'
      });

      await expect(waitlistService.addToWaitlist(email)).rejects.toThrow();
    });
  });

  describe('Analytics and Monitoring', () => {
    it('should track successful waitlist signups', async () => {
      const email = 'test@example.com';

      mockAddDoc.mockResolvedValue({ id: 'test-id' });
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] });

      await waitlistService.addToWaitlist(email);

      const { trackWaitlistSignup, trackWaitlistSignupSuccess } = await import('../../analytics');
      expect(trackWaitlistSignup).toHaveBeenCalledWith(email);
      expect(trackWaitlistSignupSuccess).toHaveBeenCalledWith(email);
    });

    it('should track failed waitlist signups', async () => {
      const email = 'invalid-email';

      await expect(waitlistService.addToWaitlist(email)).rejects.toThrow();

      const { trackWaitlistSignupError } = await import('../../analytics');
      expect(trackWaitlistSignupError).toHaveBeenCalledWith(email, expect.any(String));
    });

    it('should log audit events for waitlist actions', async () => {
      const email = 'test@example.com';

      mockAddDoc.mockResolvedValue({ id: 'test-id' });
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] });

      await waitlistService.addToWaitlist(email);

      const { auditLogger } = await import('../../security/audit-logger');
      expect(auditLogger.logAction).toHaveBeenCalledWith(
        'waitlist_signup',
        expect.objectContaining({ email })
      );
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize user input before storing', async () => {
      const email = 'test@example.com';
      const maliciousInput = '<script>alert("xss")</script>';

      mockAddDoc.mockResolvedValue({ id: 'test-id' });
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] });

      await waitlistService.addToWaitlist(email, 'source', {
        campaign: maliciousInput,
        referrer: maliciousInput
      });

      // Verify that sanitization was called
      const { createFirestoreHelper } = await import('../../../utils/firestore-sanitization');
      expect(createFirestoreHelper).toHaveBeenCalled();
    });

    it('should validate data before processing', async () => {
      const email = 'test@example.com';

      mockAddDoc.mockResolvedValue({ id: 'test-id' });
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] });

      await waitlistService.addToWaitlist(email);

      const { ValidationService } = await import('../../security/validation-rules');
      expect(ValidationService.validateEmail).toHaveBeenCalledWith(email);
    });
  });

  describe('Waitlist Statistics', () => {
    it('should get waitlist count', async () => {
      const mockDocs = [
        { id: '1', data: () => ({ email: 'test1@example.com' }) },
        { id: '2', data: () => ({ email: 'test2@example.com' }) },
        { id: '3', data: () => ({ email: 'test3@example.com' }) }
      ];

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: mockDocs,
        size: 3
      });

      const count = await waitlistService.getWaitlistCount();

      expect(count).toBe(3);
    });

    it('should handle empty waitlist', async () => {
      mockGetDocs.mockResolvedValue({
        empty: true,
        docs: [],
        size: 0
      });

      const count = await waitlistService.getWaitlistCount();

      expect(count).toBe(0);
    });
  });

  describe('Waitlist Entry Retrieval', () => {
    it('should get all waitlist entries', async () => {
      const mockEntries = [
        { id: '1', data: () => ({ email: 'test1@example.com', timestamp: '2024-01-01' }) },
        { id: '2', data: () => ({ email: 'test2@example.com', timestamp: '2024-01-02' }) }
      ];

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: mockEntries
      });

      const entries = await waitlistService.getAllWaitlistEntries();

      expect(entries).toHaveLength(2);
      expect(entries[0].email).toBe('test1@example.com');
      expect(entries[1].email).toBe('test2@example.com');
    });

    it('should filter waitlist entries by source', async () => {
      const mockEntries = [
        { id: '1', data: () => ({ email: 'test1@example.com', source: 'landing-page' }) },
        { id: '2', data: () => ({ email: 'test2@example.com', source: 'social-media' }) }
      ];

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: mockEntries
      });

      const entries = await waitlistService.getWaitlistEntriesBySource('landing-page');

      expect(entries).toHaveLength(1);
      expect(entries[0].email).toBe('test1@example.com');
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large numbers of waitlist entries efficiently', async () => {
      const largeMockDocs = Array.from({ length: 1000 }, (_, i) => ({
        id: `entry-${i}`,
        data: () => ({ email: `test${i}@example.com` })
      }));

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: largeMockDocs,
        size: 1000
      });

      const startTime = Date.now();
      const count = await waitlistService.getWaitlistCount();
      const endTime = Date.now();

      expect(count).toBe(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should use proper Firestore queries for efficiency', async () => {
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] });

      await waitlistService.getWaitlistEntriesBySource('landing-page');

      expect(mockQuery).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalledWith('source', '==', 'landing-page');
    });
  });
});


