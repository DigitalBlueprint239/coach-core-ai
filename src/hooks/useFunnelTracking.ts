import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';
import { ga4Service } from '../services/analytics/ga4-config';
import { bigQueryExportService } from '../services/analytics/bigquery-export';
import secureLogger from '../utils/secure-logger';

// Funnel tracking hook
export function useFunnelTracking() {
  const location = useLocation();
  const { user } = useAuth();
  const { userProfile, isProTier, isEnterpriseTier } = useSubscription();

  // Track page views
  const trackPageView = useCallback((pageTitle: string, pagePath: string) => {
    try {
      ga4Service.trackPageView(pageTitle, pagePath);
      
      // Export to BigQuery
      bigQueryExportService.addEvent({
        event_name: 'page_view',
        event_category: 'engagement',
        event_label: pageTitle,
        user_id: user?.uid,
        session_id: getSessionId(),
        timestamp: new Date().toISOString(),
        page_title: pageTitle,
        page_path: pagePath,
        page_location: window.location.href,
        user_agent: navigator.userAgent,
        device_type: getDeviceType(),
        browser: getBrowser(),
        os: getOS(),
        custom_parameters: {
          user_tier: userProfile?.tier || 'free',
          subscription_status: userProfile?.status || 'inactive',
          beta_user: userProfile?.tier !== 'FREE',
        },
      });
    } catch (error) {
      secureLogger.error('Failed to track page view', { error });
    }
  }, [user?.uid, userProfile]);

  // Track signup started
  const trackSignupStarted = useCallback((method: string = 'email') => {
    try {
      ga4Service.trackSignupStarted(method);
      
      bigQueryExportService.addEvent({
        event_name: 'signup_started',
        event_category: 'conversion',
        event_label: method,
        user_id: user?.uid,
        session_id: getSessionId(),
        timestamp: new Date().toISOString(),
        custom_parameters: {
          signup_method: method,
          user_tier: 'free',
          subscription_status: 'inactive',
        },
      });
    } catch (error) {
      secureLogger.error('Failed to track signup started', { error });
    }
  }, [user?.uid]);

  // Track signup completed
  const trackSignupCompleted = useCallback((method: string = 'email') => {
    if (!user?.uid) return;

    try {
      ga4Service.trackSignupCompleted(method, user.uid);
      
      bigQueryExportService.addEvent({
        event_name: 'signup_completed',
        event_category: 'conversion',
        event_label: method,
        value: 1,
        user_id: user.uid,
        session_id: getSessionId(),
        timestamp: new Date().toISOString(),
        custom_parameters: {
          signup_method: method,
          user_tier: 'free',
          subscription_status: 'inactive',
        },
      });
    } catch (error) {
      secureLogger.error('Failed to track signup completed', { error });
    }
  }, [user?.uid]);

  // Track beta activation
  const trackBetaActivated = useCallback((features: string[]) => {
    if (!user?.uid) return;

    try {
      ga4Service.trackBetaActivated(user.uid, features);
      
      bigQueryExportService.addEvent({
        event_name: 'beta_activated',
        event_category: 'conversion',
        event_label: 'beta_features',
        value: features.length,
        user_id: user.uid,
        session_id: getSessionId(),
        timestamp: new Date().toISOString(),
        custom_parameters: {
          beta_features: features,
          user_tier: userProfile?.tier || 'free',
          subscription_status: userProfile?.status || 'inactive',
        },
      });
    } catch (error) {
      secureLogger.error('Failed to track beta activation', { error });
    }
  }, [user?.uid, userProfile]);

  // Track subscription started
  const trackSubscriptionStarted = useCallback((
    tier: string,
    price: number,
    currency: string = 'USD'
  ) => {
    if (!user?.uid) return;

    try {
      ga4Service.trackSubscriptionStarted(user.uid, tier, price, currency);
      
      bigQueryExportService.addEvent({
        event_name: 'subscription_started',
        event_category: 'conversion',
        event_label: tier,
        value: price,
        user_id: user.uid,
        session_id: getSessionId(),
        timestamp: new Date().toISOString(),
        custom_parameters: {
          subscription_tier: tier,
          subscription_price: price,
          currency: currency,
          user_tier: tier,
          subscription_status: 'active',
        },
      });
    } catch (error) {
      secureLogger.error('Failed to track subscription started', { error });
    }
  }, [user?.uid]);

  // Track subscription upgrade
  const trackSubscriptionUpgraded = useCallback((
    fromTier: string,
    toTier: string,
    price: number
  ) => {
    if (!user?.uid) return;

    try {
      ga4Service.trackSubscriptionUpgraded(user.uid, fromTier, toTier, price);
      
      bigQueryExportService.addEvent({
        event_name: 'subscription_upgraded',
        event_category: 'conversion',
        event_label: `${fromTier}_to_${toTier}`,
        value: price,
        user_id: user.uid,
        session_id: getSessionId(),
        timestamp: new Date().toISOString(),
        custom_parameters: {
          from_tier: fromTier,
          to_tier: toTier,
          upgrade_price: price,
          user_tier: toTier,
          subscription_status: 'active',
        },
      });
    } catch (error) {
      secureLogger.error('Failed to track subscription upgrade', { error });
    }
  }, [user?.uid]);

  // Track subscription canceled
  const trackSubscriptionCanceled = useCallback((
    tier: string,
    reason?: string
  ) => {
    if (!user?.uid) return;

    try {
      ga4Service.trackSubscriptionCanceled(user.uid, tier, reason);
      
      bigQueryExportService.addEvent({
        event_name: 'subscription_canceled',
        event_category: 'conversion',
        event_label: tier,
        user_id: user.uid,
        session_id: getSessionId(),
        timestamp: new Date().toISOString(),
        custom_parameters: {
          subscription_tier: tier,
          cancellation_reason: reason,
          user_tier: tier,
          subscription_status: 'canceled',
        },
      });
    } catch (error) {
      secureLogger.error('Failed to track subscription canceled', { error });
    }
  }, [user?.uid]);

  // Track play created
  const trackPlayCreated = useCallback((
    playType: string,
    isAIGenerated: boolean = false
  ) => {
    if (!user?.uid) return;

    try {
      ga4Service.trackPlayCreated(user.uid, playType, isAIGenerated);
      
      bigQueryExportService.addEvent({
        event_name: 'play_created',
        event_category: 'engagement',
        event_label: playType,
        user_id: user.uid,
        session_id: getSessionId(),
        timestamp: new Date().toISOString(),
        custom_parameters: {
          play_type: playType,
          ai_generated: isAIGenerated,
          user_tier: userProfile?.tier || 'free',
          subscription_status: userProfile?.status || 'inactive',
        },
      });
    } catch (error) {
      secureLogger.error('Failed to track play created', { error });
    }
  }, [user?.uid, userProfile]);

  // Track play saved
  const trackPlaySaved = useCallback((
    playId: string,
    playType: string
  ) => {
    if (!user?.uid) return;

    try {
      ga4Service.trackPlaySaved(user.uid, playId, playType);
      
      bigQueryExportService.addEvent({
        event_name: 'play_saved',
        event_category: 'engagement',
        event_label: playType,
        user_id: user.uid,
        session_id: getSessionId(),
        timestamp: new Date().toISOString(),
        custom_parameters: {
          play_id: playId,
          play_type: playType,
          user_tier: userProfile?.tier || 'free',
          subscription_status: userProfile?.status || 'inactive',
        },
      });
    } catch (error) {
      secureLogger.error('Failed to track play saved', { error });
    }
  }, [user?.uid, userProfile]);

  // Track team member added
  const trackTeamMemberAdded = useCallback((
    teamId: string,
    memberType: string
  ) => {
    if (!user?.uid) return;

    try {
      ga4Service.trackTeamMemberAdded(user.uid, teamId, memberType);
      
      bigQueryExportService.addEvent({
        event_name: 'team_member_added',
        event_category: 'engagement',
        event_label: memberType,
        user_id: user.uid,
        session_id: getSessionId(),
        timestamp: new Date().toISOString(),
        custom_parameters: {
          team_id: teamId,
          member_type: memberType,
          user_tier: userProfile?.tier || 'free',
          subscription_status: userProfile?.status || 'inactive',
        },
      });
    } catch (error) {
      secureLogger.error('Failed to track team member added', { error });
    }
  }, [user?.uid, userProfile]);

  // Track AI generation
  const trackAIGeneration = useCallback((
    generationType: string,
    success: boolean
  ) => {
    if (!user?.uid) return;

    try {
      ga4Service.trackAIGeneration(user.uid, generationType, success);
      
      bigQueryExportService.addEvent({
        event_name: 'ai_generation',
        event_category: 'engagement',
        event_label: generationType,
        value: success ? 1 : 0,
        user_id: user.uid,
        session_id: getSessionId(),
        timestamp: new Date().toISOString(),
        custom_parameters: {
          generation_type: generationType,
          success: success,
          user_tier: userProfile?.tier || 'free',
          subscription_status: userProfile?.status || 'inactive',
        },
      });
    } catch (error) {
      secureLogger.error('Failed to track AI generation', { error });
    }
  }, [user?.uid, userProfile]);

  // Track feature usage
  const trackFeatureUsed = useCallback((
    feature: string,
    context?: string
  ) => {
    if (!user?.uid) return;

    try {
      ga4Service.trackFeatureUsed(user.uid, feature, context);
      
      bigQueryExportService.addEvent({
        event_name: 'feature_used',
        event_category: 'engagement',
        event_label: feature,
        user_id: user.uid,
        session_id: getSessionId(),
        timestamp: new Date().toISOString(),
        custom_parameters: {
          feature_name: feature,
          context: context,
          user_tier: userProfile?.tier || 'free',
          subscription_status: userProfile?.status || 'inactive',
        },
      });
    } catch (error) {
      secureLogger.error('Failed to track feature usage', { error });
    }
  }, [user?.uid, userProfile]);

  // Track error
  const trackError = useCallback((
    error: Error,
    context?: string
  ) => {
    if (!user?.uid) return;

    try {
      ga4Service.trackError(user.uid, error, context);
      
      bigQueryExportService.addEvent({
        event_name: 'error_occurred',
        event_category: 'error',
        event_label: error.name,
        user_id: user.uid,
        session_id: getSessionId(),
        timestamp: new Date().toISOString(),
        custom_parameters: {
          error_name: error.name,
          error_message: error.message,
          error_stack: error.stack,
          context: context,
          user_tier: userProfile?.tier || 'free',
          subscription_status: userProfile?.status || 'inactive',
        },
      });
    } catch (trackingError) {
      secureLogger.error('Failed to track error', { error: trackingError });
    }
  }, [user?.uid, userProfile]);

  // Track page view on route change
  useEffect(() => {
    const pageTitle = document.title;
    const pagePath = location.pathname;
    
    trackPageView(pageTitle, pagePath);
  }, [location, trackPageView]);

  // Set user properties when user profile changes
  useEffect(() => {
    if (user?.uid && userProfile) {
      ga4Service.setUserProperties({
        user_id: user.uid,
        user_tier: userProfile.tier,
        subscription_status: userProfile.status,
        beta_user: userProfile.tier !== 'FREE',
        signup_date: userProfile.createdAt?.toISOString(),
        last_login: new Date().toISOString(),
        total_plays: userProfile.usage?.savedPlays || 0,
        team_members: userProfile.usage?.teamMembers || 0,
        ai_generations: userProfile.usage?.aiGenerations || 0,
        storage_used: userProfile.usage?.storageUsedGB || 0,
      });
    }
  }, [user?.uid, userProfile]);

  return {
    trackPageView,
    trackSignupStarted,
    trackSignupCompleted,
    trackBetaActivated,
    trackSubscriptionStarted,
    trackSubscriptionUpgraded,
    trackSubscriptionCanceled,
    trackPlayCreated,
    trackPlaySaved,
    trackTeamMemberAdded,
    trackAIGeneration,
    trackFeatureUsed,
    trackError,
  };
}

// Helper functions
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
}

function getDeviceType(): string {
  const userAgent = navigator.userAgent;
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    return 'mobile';
  } else if (/Tablet|iPad/.test(userAgent)) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

function getBrowser(): string {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Unknown';
}

function getOS(): string {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  return 'Unknown';
}

export default useFunnelTracking;
