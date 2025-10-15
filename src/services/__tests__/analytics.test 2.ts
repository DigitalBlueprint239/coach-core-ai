import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ga4Service } from '../analytics/ga4-config';

// Mock Firebase Analytics
vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(),
  logEvent: vi.fn(),
  setUserId: vi.fn(),
  setUserProperties: vi.fn(),
  setCurrentScreen: vi.fn(),
}));

// Mock Firebase app
vi.mock('../firebase/firebase-config', () => ({
  default: {
    auth: vi.fn(),
    firestore: vi.fn(),
    analytics: vi.fn(),
  },
}));

describe('GA4 Analytics Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize GA4 service', () => {
    expect(ga4Service).toBeDefined();
    expect(typeof ga4Service.trackPageView).toBe('function');
    expect(typeof ga4Service.trackSignupSubmitted).toBe('function');
    expect(typeof ga4Service.trackBetaActivated).toBe('function');
    expect(typeof ga4Service.trackSubscriptionStarted).toBe('function');
  });

  it('should track page view', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    ga4Service.trackPageView('Test Page', { user_id: 'test-user' });
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should track signup submission', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    ga4Service.trackSignupSubmitted({
      email: 'test@example.com',
      source: 'landing-page',
      user_id: 'test-user',
    });
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should track beta activation', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    ga4Service.trackBetaActivated({
      subscription_tier: 'free',
      user_id: 'test-user',
    });
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should track subscription started', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    ga4Service.trackSubscriptionStarted({
      subscription_tier: 'pro',
      value: 2900,
      currency: 'USD',
      user_id: 'test-user',
    });
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should track subscription completed', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    ga4Service.trackSubscriptionCompleted({
      subscription_tier: 'pro',
      value: 2900,
      currency: 'USD',
      user_id: 'test-user',
    });
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should track subscription canceled', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    ga4Service.trackSubscriptionCanceled({
      subscription_tier: 'pro',
      user_id: 'test-user',
      cancel_at_period_end: true,
    });
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should track trial started', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    ga4Service.trackTrialStarted({
      user_id: 'test-user',
    });
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should track trial ended', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    ga4Service.trackTrialEnded({
      user_id: 'test-user',
    });
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should track conversion', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    ga4Service.trackConversion({
      item_id: 'pro_subscription',
      item_name: 'Pro Subscription',
      value: 2900,
      currency: 'USD',
      user_id: 'test-user',
    });
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should get marketing attribution', () => {
    const attribution = ga4Service.getMarketingAttribution();
    expect(attribution).toBeDefined();
  });

  it('should get debug info', () => {
    const debugInfo = ga4Service.getDebugInfo();
    expect(debugInfo).toBeDefined();
    expect(debugInfo).toHaveProperty('isInitialized');
    expect(debugInfo).toHaveProperty('measurementId');
    expect(debugInfo).toHaveProperty('debugMode');
  });
});
