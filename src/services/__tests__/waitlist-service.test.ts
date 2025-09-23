import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitlistService } from '../waitlist/waitlist-service';

// Mock Firebase
vi.mock('../../firebase/firebase-config', () => ({
  db: {
    collection: vi.fn(() => ({
      add: vi.fn()
    }))
  }
}));

// Mock analytics
vi.mock('../analytics/ga4-config', () => ({
  ga4Service: {
    trackEvent: vi.fn()
  }
}));

describe('WaitlistService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('addToWaitlist', () => {
    it('should add email to waitlist successfully', async () => {
      const mockAdd = vi.fn().mockResolvedValue({ id: 'test-id' });
      const mockCollection = vi.fn().mockReturnValue({ add: mockAdd });
      
      // Mock the db import
      vi.doMock('../../firebase/firebase-config', () => ({
        db: {
          collection: mockCollection
        }
      }));

      const result = await waitlistService.addToWaitlist('test@example.com', {
        source: 'landing-page',
        referrer: 'google.com'
      });

      expect(mockCollection).toHaveBeenCalledWith('waitlist');
      expect(mockAdd).toHaveBeenCalledWith({
        email: 'test@example.com',
        source: 'landing-page',
        referrer: 'google.com',
        createdAt: expect.any(Object),
        updatedAt: expect.any(Object)
      });
      expect(result).toEqual({
        success: true,
        id: 'test-id'
      });
    });

    it('should handle validation errors', async () => {
      const result = await waitlistService.addToWaitlist('invalid-email', {
        source: 'landing-page'
      });

      expect(result).toEqual({
        success: false,
        error: 'Invalid email format'
      });
    });

    it('should handle Firebase errors', async () => {
      const mockAdd = vi.fn().mockRejectedValue(new Error('Firebase error'));
      const mockCollection = vi.fn().mockReturnValue({ add: mockAdd });
      
      vi.doMock('../../firebase/firebase-config', () => ({
        db: {
          collection: mockCollection
        }
      }));

      const result = await waitlistService.addToWaitlist('test@example.com', {
        source: 'landing-page'
      });

      expect(result).toEqual({
        success: false,
        error: 'Failed to add to waitlist'
      });
    });

    it('should track analytics event on successful signup', async () => {
      const mockAdd = vi.fn().mockResolvedValue({ id: 'test-id' });
      const mockCollection = vi.fn().mockReturnValue({ add: mockAdd });
      const mockTrackEvent = vi.fn();
      
      vi.doMock('../../firebase/firebase-config', () => ({
        db: {
          collection: mockCollection
        }
      }));

      vi.doMock('../analytics/ga4-config', () => ({
        ga4Service: {
          trackEvent: mockTrackEvent
        }
      }));

      await waitlistService.addToWaitlist('test@example.com', {
        source: 'landing-page'
      });

      expect(mockTrackEvent).toHaveBeenCalledWith('waitlist_signup', {
        email: 'test@example.com',
        source: 'landing-page'
      });
    });
  });

  describe('getWaitlistStats', () => {
    it('should return waitlist statistics', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        size: 150,
        docs: [
          { data: () => ({ source: 'landing-page' }) },
          { data: () => ({ source: 'pricing-page' }) },
          { data: () => ({ source: 'landing-page' }) }
        ]
      });
      const mockCollection = vi.fn().mockReturnValue({ get: mockGet });
      
      vi.doMock('../../firebase/firebase-config', () => ({
        db: {
          collection: mockCollection
        }
      }));

      const result = await waitlistService.getWaitlistStats();

      expect(result).toEqual({
        totalSignups: 150,
        sourceBreakdown: {
          'landing-page': 2,
          'pricing-page': 1
        }
      });
    });

    it('should handle Firebase errors in stats', async () => {
      const mockGet = vi.fn().mockRejectedValue(new Error('Firebase error'));
      const mockCollection = vi.fn().mockReturnValue({ get: mockGet });
      
      vi.doMock('../../firebase/firebase-config', () => ({
        db: {
          collection: mockCollection
        }
      }));

      const result = await waitlistService.getWaitlistStats();

      expect(result).toEqual({
        totalSignups: 0,
        sourceBreakdown: {}
      });
    });
  });

  describe('checkEmailExists', () => {
    it('should return true if email exists', async () => {
      const mockWhere = vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          empty: false,
          docs: [{ id: 'test-id' }]
        })
      });
      const mockCollection = vi.fn().mockReturnValue({ where: mockWhere });
      
      vi.doMock('../../firebase/firebase-config', () => ({
        db: {
          collection: mockCollection
        }
      }));

      const result = await waitlistService.checkEmailExists('test@example.com');

      expect(result).toBe(true);
      expect(mockWhere).toHaveBeenCalledWith('email', '==', 'test@example.com');
    });

    it('should return false if email does not exist', async () => {
      const mockWhere = vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          empty: true,
          docs: []
        })
      });
      const mockCollection = vi.fn().mockReturnValue({ where: mockWhere });
      
      vi.doMock('../../firebase/firebase-config', () => ({
        db: {
          collection: mockCollection
        }
      }));

      const result = await waitlistService.checkEmailExists('test@example.com');

      expect(result).toBe(false);
    });
  });
});






