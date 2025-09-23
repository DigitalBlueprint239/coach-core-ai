import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { UserProfile } from '../types/user';
import * as Sentry from '@sentry/react';

// ============================================
// SAFE USER PROFILE HOOK
// ============================================

export interface SafeUserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  isEmailVerified: boolean;
  subscription: string;
  subscriptionStatus: string;
  activeTeamId?: string;
  teams: string[];
  permissions: Array<{ resource: string; action: string }>;
  usage: {
    playsGeneratedThisMonth: number;
    teamsCreated: number;
  };
  preferences?: {
    sport?: string;
    timezone?: string;
    theme?: string;
    notifications?: {
      email: boolean;
      push: boolean;
      sms: boolean;
      marketing: boolean;
      updates: boolean;
      reminders: boolean;
    };
  };
  createdAt: Date;
  lastLoginAt: Date;
  updatedAt: Date;
}

export const useUserProfile = (): {
  profile: SafeUserProfile | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  hasProfile: boolean;
} => {
  const { user, profile, isLoading, error } = useAuth();

  return useMemo(() => {
    // Add breadcrumb for profile access
    Sentry.addBreadcrumb({
      message: 'User profile accessed',
      category: 'auth',
      level: 'info',
      data: {
        hasUser: !!user,
        hasProfile: !!profile,
        isLoading,
        hasError: !!error
      }
    });

    // If loading, return loading state
    if (isLoading) {
      return {
        profile: null,
        isLoading: true,
        error: null,
        isAuthenticated: false,
        hasProfile: false
      };
    }

    // If there's an error, return error state
    if (error) {
      Sentry.addBreadcrumb({
        message: 'Auth error in profile access',
        category: 'auth',
        level: 'error',
        data: { error }
      });

      return {
        profile: null,
        isLoading: false,
        error,
        isAuthenticated: false,
        hasProfile: false
      };
    }

    // If no user, return unauthenticated state
    if (!user) {
      return {
        profile: null,
        isLoading: false,
        error: null,
        isAuthenticated: false,
        hasProfile: false
      };
    }

    // If no profile, return authenticated but no profile state
    if (!profile) {
      Sentry.addBreadcrumb({
        message: 'User authenticated but no profile found',
        category: 'auth',
        level: 'warning',
        data: {
          userId: user.uid,
          userEmail: user.email
        }
      });

      return {
        profile: null,
        isLoading: false,
        error: 'User profile not found',
        isAuthenticated: true,
        hasProfile: false
      };
    }

    // Validate profile structure
    try {
      const safeProfile = validateAndSanitizeProfile(profile);
      
      return {
        profile: safeProfile,
        isLoading: false,
        error: null,
        isAuthenticated: true,
        hasProfile: true
      };
    } catch (profileError) {
      Sentry.captureException(profileError, {
        tags: {
          errorType: 'profile_validation_error',
          hook: 'useUserProfile'
        },
        extra: {
          userId: user.uid,
          userEmail: user.email,
          profileKeys: Object.keys(profile || {}),
          profileError: profileError instanceof Error ? profileError.message : String(profileError)
        }
      });

      return {
        profile: null,
        isLoading: false,
        error: 'Invalid profile data',
        isAuthenticated: true,
        hasProfile: false
      };
    }
  }, [user, profile, isLoading, error]);
};

// ============================================
// PROFILE VALIDATION AND SANITIZATION
// ============================================

function validateAndSanitizeProfile(profile: UserProfile): SafeUserProfile {
  // Validate required fields
  if (!profile.uid || typeof profile.uid !== 'string') {
    throw new Error('Profile missing or invalid UID');
  }

  if (!profile.email || typeof profile.email !== 'string') {
    throw new Error('Profile missing or invalid email');
  }

  if (!profile.displayName || typeof profile.displayName !== 'string') {
    throw new Error('Profile missing or invalid display name');
  }

  if (!profile.role || typeof profile.role !== 'string') {
    throw new Error('Profile missing or invalid role');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(profile.email)) {
    throw new Error('Profile has invalid email format');
  }

  // Validate role
  const validRoles = ['admin', 'coach', 'assistant-coach', 'head-coach', 'player', 'parent'];
  if (!validRoles.includes(profile.role)) {
    throw new Error(`Profile has invalid role: ${profile.role}`);
  }

  // Sanitize and provide defaults for optional fields
  const safeProfile: SafeUserProfile = {
    uid: profile.uid,
    email: profile.email,
    displayName: profile.displayName,
    role: profile.role,
    isEmailVerified: Boolean(profile.isEmailVerified),
    subscription: profile.subscription || 'free',
    subscriptionStatus: profile.subscriptionStatus || 'active',
    activeTeamId: profile.activeTeamId || undefined,
    teams: Array.isArray(profile.teams) ? profile.teams : [],
    permissions: Array.isArray(profile.permissions) ? profile.permissions : [],
    usage: {
      playsGeneratedThisMonth: Number(profile.usage?.playsGeneratedThisMonth) || 0,
      teamsCreated: Number(profile.usage?.teamsCreated) || 0
    },
    preferences: profile.preferences ? {
      sport: profile.preferences.sport || 'football',
      timezone: profile.preferences.timezone || 'UTC',
      theme: profile.preferences.theme || 'auto',
      notifications: {
        email: Boolean(profile.preferences.notifications?.email),
        push: Boolean(profile.preferences.notifications?.push),
        sms: Boolean(profile.preferences.notifications?.sms),
        marketing: Boolean(profile.preferences.notifications?.marketing),
        updates: Boolean(profile.preferences.notifications?.updates),
        reminders: Boolean(profile.preferences.notifications?.reminders)
      }
    } : {
      sport: 'football',
      timezone: 'UTC',
      theme: 'auto',
      notifications: {
        email: true,
        push: false,
        sms: false,
        marketing: false,
        updates: true,
        reminders: true
      }
    },
    createdAt: profile.createdAt instanceof Date ? profile.createdAt : new Date(),
    lastLoginAt: profile.lastLoginAt instanceof Date ? profile.lastLoginAt : new Date(),
    updatedAt: profile.updatedAt instanceof Date ? profile.updatedAt : new Date()
  };

  return safeProfile;
}

// ============================================
// CONVENIENCE HOOKS
// ============================================

export const useUserRole = (): string | null => {
  const { profile } = useUserProfile();
  return profile?.role || null;
};

export const useUserPermissions = (): Array<{ resource: string; action: string }> => {
  const { profile } = useUserProfile();
  return profile?.permissions || [];
};

export const useUserSubscription = (): { tier: string; status: string } => {
  const { profile } = useUserProfile();
  return {
    tier: profile?.subscription || 'free',
    status: profile?.subscriptionStatus || 'active'
  };
};

export const useUserTeams = (): string[] => {
  const { profile } = useUserProfile();
  return profile?.teams || [];
};

export const useUserUsage = (): { playsGeneratedThisMonth: number; teamsCreated: number } => {
  const { profile } = useUserProfile();
  return profile?.usage || { playsGeneratedThisMonth: 0, teamsCreated: 0 };
};

export const useUserPreferences = (): SafeUserProfile['preferences'] => {
  const { profile } = useUserProfile();
  return profile?.preferences || {
    sport: 'football',
    timezone: 'UTC',
    theme: 'auto',
    notifications: {
      email: true,
      push: false,
      sms: false,
      marketing: false,
      updates: true,
      reminders: true
    }
  };
};




