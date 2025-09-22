import { getAnalytics, logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import app from '../firebase/firebase-config';
import secureLogger from '../../utils/secure-logger';

// Google Analytics 4 Configuration
const GA4_MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID;
const GA4_API_SECRET = import.meta.env.VITE_GA4_API_SECRET;

// Analytics instance
let analytics: any = null;

// Initialize Google Analytics 4
export const initializeGA4 = (): void => {
  try {
    if (!GA4_MEASUREMENT_ID) {
      secureLogger.warn('GA4 Measurement ID not found, analytics disabled');
      return;
    }

    // Initialize Firebase Analytics
    analytics = getAnalytics(app);
    
    // Load gtag script
    loadGtagScript();
    
    secureLogger.info('Google Analytics 4 initialized', { measurementId: GA4_MEASUREMENT_ID });
  } catch (error) {
    secureLogger.error('Failed to initialize GA4', { error });
  }
};

// Load gtag script
const loadGtagScript = (): void => {
  if (typeof window === 'undefined') return;

  // Load gtag script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Initialize gtag
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    window.dataLayer.push(args);
  }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', GA4_MEASUREMENT_ID, {
    page_title: document.title,
    page_location: window.location.href,
  });
};

// Event tracking interface
export interface GA4Event {
  event_name: string;
  event_category?: string;
  event_label?: string;
  value?: number;
  custom_parameters?: Record<string, any>;
}

// User properties interface
export interface GA4UserProperties {
  user_id?: string;
  user_tier?: string;
  subscription_status?: string;
  beta_user?: boolean;
  signup_date?: string;
  last_login?: string;
  total_plays?: number;
  team_members?: number;
  ai_generations?: number;
  storage_used?: number;
}

// Funnel events
export const FUNNEL_EVENTS = {
  PAGE_VIEW: 'page_view',
  SIGNUP_STARTED: 'signup_started',
  SIGNUP_COMPLETED: 'signup_completed',
  BETA_ACTIVATED: 'beta_activated',
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_UPGRADED: 'subscription_upgraded',
  SUBSCRIPTION_CANCELED: 'subscription_canceled',
  PLAY_CREATED: 'play_created',
  PLAY_SAVED: 'play_saved',
  TEAM_MEMBER_ADDED: 'team_member_added',
  AI_GENERATION: 'ai_generation',
  FEATURE_USED: 'feature_used',
  ERROR_OCCURRED: 'error_occurred',
} as const;

// GA4 Analytics Service
export class GA4AnalyticsService {
  private isInitialized = false;
  private userId: string | null = null;
  private userProperties: GA4UserProperties = {};

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    try {
      initializeGA4();
      this.isInitialized = true;
      secureLogger.info('GA4 Analytics Service initialized');
    } catch (error) {
      secureLogger.error('Failed to initialize GA4 Analytics Service', { error });
    }
  }

  // Set user ID
  setUserId(userId: string): void {
    if (!this.isInitialized) return;

    try {
      this.userId = userId;
      setUserId(analytics, userId);
      this.userProperties.user_id = userId;
      
      secureLogger.info('GA4 user ID set', { userId });
    } catch (error) {
      secureLogger.error('Failed to set GA4 user ID', { error });
    }
  }

  // Set user properties
  setUserProperties(properties: GA4UserProperties): void {
    if (!this.isInitialized) return;

    try {
      this.userProperties = { ...this.userProperties, ...properties };
      setUserProperties(analytics, this.userProperties);
      
      secureLogger.info('GA4 user properties set', { properties });
    } catch (error) {
      secureLogger.error('Failed to set GA4 user properties', { error });
    }
  }

  // Track page view
  trackPageView(pageTitle: string, pagePath: string): void {
    if (!this.isInitialized) return;

    try {
      const event: GA4Event = {
        event_name: FUNNEL_EVENTS.PAGE_VIEW,
        event_category: 'engagement',
        event_label: pageTitle,
        custom_parameters: {
          page_title: pageTitle,
          page_path: pagePath,
          page_location: window.location.href,
        },
      };

      this.trackEvent(event);
    } catch (error) {
      secureLogger.error('Failed to track page view', { error });
    }
  }

  // Track signup started
  trackSignupStarted(method: string = 'email'): void {
    if (!this.isInitialized) return;

    try {
      const event: GA4Event = {
        event_name: FUNNEL_EVENTS.SIGNUP_STARTED,
        event_category: 'conversion',
        event_label: method,
        custom_parameters: {
          signup_method: method,
          timestamp: new Date().toISOString(),
        },
      };

      this.trackEvent(event);
    } catch (error) {
      secureLogger.error('Failed to track signup started', { error });
    }
  }

  // Track signup completed
  trackSignupCompleted(method: string = 'email', userId: string): void {
    if (!this.isInitialized) return;

    try {
      this.setUserId(userId);
      
      const event: GA4Event = {
        event_name: FUNNEL_EVENTS.SIGNUP_COMPLETED,
        event_category: 'conversion',
        event_label: method,
        value: 1,
        custom_parameters: {
          signup_method: method,
          user_id: userId,
          timestamp: new Date().toISOString(),
        },
      };

      this.trackEvent(event);
    } catch (error) {
      secureLogger.error('Failed to track signup completed', { error });
    }
  }

  // Track beta activation
  trackBetaActivated(userId: string, features: string[]): void {
    if (!this.isInitialized) return;

    try {
      this.setUserProperties({ beta_user: true });
      
      const event: GA4Event = {
        event_name: FUNNEL_EVENTS.BETA_ACTIVATED,
        event_category: 'conversion',
        event_label: 'beta_features',
        value: features.length,
        custom_parameters: {
          user_id: userId,
          beta_features: features,
          timestamp: new Date().toISOString(),
        },
      };

      this.trackEvent(event);
    } catch (error) {
      secureLogger.error('Failed to track beta activation', { error });
    }
  }

  // Track subscription started
  trackSubscriptionStarted(
    userId: string, 
    tier: string, 
    price: number, 
    currency: string = 'USD'
  ): void {
    if (!this.isInitialized) return;

    try {
      this.setUserProperties({ 
        user_tier: tier, 
        subscription_status: 'active' 
      });
      
      const event: GA4Event = {
        event_name: FUNNEL_EVENTS.SUBSCRIPTION_STARTED,
        event_category: 'conversion',
        event_label: tier,
        value: price,
        custom_parameters: {
          user_id: userId,
          subscription_tier: tier,
          subscription_price: price,
          currency: currency,
          timestamp: new Date().toISOString(),
        },
      };

      this.trackEvent(event);
    } catch (error) {
      secureLogger.error('Failed to track subscription started', { error });
    }
  }

  // Track subscription upgrade
  trackSubscriptionUpgraded(
    userId: string, 
    fromTier: string, 
    toTier: string, 
    price: number
  ): void {
    if (!this.isInitialized) return;

    try {
      this.setUserProperties({ user_tier: toTier });
      
      const event: GA4Event = {
        event_name: FUNNEL_EVENTS.SUBSCRIPTION_UPGRADED,
        event_category: 'conversion',
        event_label: `${fromTier}_to_${toTier}`,
        value: price,
        custom_parameters: {
          user_id: userId,
          from_tier: fromTier,
          to_tier: toTier,
          upgrade_price: price,
          timestamp: new Date().toISOString(),
        },
      };

      this.trackEvent(event);
    } catch (error) {
      secureLogger.error('Failed to track subscription upgrade', { error });
    }
  }

  // Track subscription canceled
  trackSubscriptionCanceled(userId: string, tier: string, reason?: string): void {
    if (!this.isInitialized) return;

    try {
      this.setUserProperties({ subscription_status: 'canceled' });
      
      const event: GA4Event = {
        event_name: FUNNEL_EVENTS.SUBSCRIPTION_CANCELED,
        event_category: 'conversion',
        event_label: tier,
        custom_parameters: {
          user_id: userId,
          subscription_tier: tier,
          cancellation_reason: reason,
          timestamp: new Date().toISOString(),
        },
      };

      this.trackEvent(event);
    } catch (error) {
      secureLogger.error('Failed to track subscription canceled', { error });
    }
  }

  // Track play created
  trackPlayCreated(userId: string, playType: string, isAIGenerated: boolean = false): void {
    if (!this.isInitialized) return;

    try {
      const event: GA4Event = {
        event_name: FUNNEL_EVENTS.PLAY_CREATED,
        event_category: 'engagement',
        event_label: playType,
        custom_parameters: {
          user_id: userId,
          play_type: playType,
          ai_generated: isAIGenerated,
          timestamp: new Date().toISOString(),
        },
      };

      this.trackEvent(event);
    } catch (error) {
      secureLogger.error('Failed to track play created', { error });
    }
  }

  // Track play saved
  trackPlaySaved(userId: string, playId: string, playType: string): void {
    if (!this.isInitialized) return;

    try {
      const event: GA4Event = {
        event_name: FUNNEL_EVENTS.PLAY_SAVED,
        event_category: 'engagement',
        event_label: playType,
        custom_parameters: {
          user_id: userId,
          play_id: playId,
          play_type: playType,
          timestamp: new Date().toISOString(),
        },
      };

      this.trackEvent(event);
    } catch (error) {
      secureLogger.error('Failed to track play saved', { error });
    }
  }

  // Track team member added
  trackTeamMemberAdded(userId: string, teamId: string, memberType: string): void {
    if (!this.isInitialized) return;

    try {
      const event: GA4Event = {
        event_name: FUNNEL_EVENTS.TEAM_MEMBER_ADDED,
        event_category: 'engagement',
        event_label: memberType,
        custom_parameters: {
          user_id: userId,
          team_id: teamId,
          member_type: memberType,
          timestamp: new Date().toISOString(),
        },
      };

      this.trackEvent(event);
    } catch (error) {
      secureLogger.error('Failed to track team member added', { error });
    }
  }

  // Track AI generation
  trackAIGeneration(userId: string, generationType: string, success: boolean): void {
    if (!this.isInitialized) return;

    try {
      const event: GA4Event = {
        event_name: FUNNEL_EVENTS.AI_GENERATION,
        event_category: 'engagement',
        event_label: generationType,
        value: success ? 1 : 0,
        custom_parameters: {
          user_id: userId,
          generation_type: generationType,
          success: success,
          timestamp: new Date().toISOString(),
        },
      };

      this.trackEvent(event);
    } catch (error) {
      secureLogger.error('Failed to track AI generation', { error });
    }
  }

  // Track feature usage
  trackFeatureUsed(userId: string, feature: string, context?: string): void {
    if (!this.isInitialized) return;

    try {
      const event: GA4Event = {
        event_name: FUNNEL_EVENTS.FEATURE_USED,
        event_category: 'engagement',
        event_label: feature,
        custom_parameters: {
          user_id: userId,
          feature_name: feature,
          context: context,
          timestamp: new Date().toISOString(),
        },
      };

      this.trackEvent(event);
    } catch (error) {
      secureLogger.error('Failed to track feature usage', { error });
    }
  }

  // Track error
  trackError(userId: string, error: Error, context?: string): void {
    if (!this.isInitialized) return;

    try {
      const event: GA4Event = {
        event_name: FUNNEL_EVENTS.ERROR_OCCURRED,
        event_category: 'error',
        event_label: error.name,
        custom_parameters: {
          user_id: userId,
          error_name: error.name,
          error_message: error.message,
          error_stack: error.stack,
          context: context,
          timestamp: new Date().toISOString(),
        },
      };

      this.trackEvent(event);
    } catch (trackingError) {
      secureLogger.error('Failed to track error', { error: trackingError });
    }
  }

  // Generic event tracking
  trackEvent(event: GA4Event): void {
    if (!this.isInitialized || !analytics) return;

    try {
      // Firebase Analytics
      logEvent(analytics, event.event_name, {
        event_category: event.event_category,
        event_label: event.event_label,
        value: event.value,
        ...event.custom_parameters,
      });

      // gtag (for additional tracking)
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', event.event_name, {
          event_category: event.event_category,
          event_label: event.event_label,
          value: event.value,
          ...event.custom_parameters,
        });
      }

      secureLogger.debug('GA4 event tracked', { event });
    } catch (error) {
      secureLogger.error('Failed to track GA4 event', { error, event });
    }
  }

  // Track custom event
  trackCustomEvent(
    eventName: string,
    parameters: Record<string, any> = {},
    category: string = 'custom'
  ): void {
    if (!this.isInitialized) return;

    try {
      const event: GA4Event = {
        event_name: eventName,
        event_category: category,
        custom_parameters: {
          ...parameters,
          timestamp: new Date().toISOString(),
        },
      };

      this.trackEvent(event);
    } catch (error) {
      secureLogger.error('Failed to track custom event', { error });
    }
  }

  // Get current user properties
  getUserProperties(): GA4UserProperties {
    return { ...this.userProperties };
  }

  // Check if analytics is initialized
  isReady(): boolean {
    return this.isInitialized;
  }
}

// Create singleton instance
export const ga4Service = new GA4AnalyticsService();

// Export types
export type { GA4Event, GA4UserProperties };

export default ga4Service;