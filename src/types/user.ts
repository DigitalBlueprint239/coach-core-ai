export type SubscriptionTierName = 'free' | 'starter' | 'professional' | 'enterprise' | 'premium';

export interface UserSubscription {
  stripeCustomerId: string;
  subscriptionId?: string;
  subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentTier: SubscriptionTierName;
  billing: {
    paymentMethodId?: string;
    lastPaymentDate?: Date;
    nextBillingDate?: Date;
    currency: string;
  };
  usage: {
    aiGenerations: number;
    resetDate: Date;
    period: 'monthly';
  };
  specialPricing?: {
    type: 'founding' | 'early_access' | 'beta';
    discount: number;
    validUntil?: Date;
  };
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  lastLoginAt: Date;
  isEmailVerified: boolean;

  // Subscription & Billing
  subscription: SubscriptionTier;
  subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'trialing';
  subscriptionEndDate?: Date;
  stripeCustomerId?: string;
  subscriptionInfo?: UserSubscription;

  // Usage & Limits
  usage: {
    playsGeneratedThisMonth: number;
    teamsCreated: number;
    lastPlayGenerated?: Date;
  };

  // Preferences
  preferences: {
    sport: 'football' | 'basketball' | 'soccer' | 'baseball';
    timezone: string;
    notifications: NotificationPreferences;
    theme: 'light' | 'dark' | 'auto';
  };

  // Team Management
  teams: string[]; // Team IDs
  activeTeamId?: string;

  // Permissions
  role: UserRole;
  permissions: Permission[];
}

export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'enterprise' | 'premium';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    maxPlaysPerMonth: number;
    maxTeams: number;
    maxCollaborators: number;
    aiFeatures: boolean;
    analytics: boolean;
    apiAccess: boolean;
    whiteLabel: boolean;
  };
}

export type UserRole =
  | 'user'
  | 'client'
  | 'coach'
  | 'assistant-coach'
  | 'head-coach'
  | 'team-admin'
  | 'admin';

export interface Permission {
  resource: string;
  action: 'read' | 'write' | 'delete' | 'admin';
  conditions?: Record<string, any>;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  marketing: boolean;
  updates: boolean;
  reminders: boolean;
}

export interface TeamMember {
  uid: string;
  role: 'owner' | 'coach' | 'assistant' | 'viewer';
  joinedAt: Date;
  permissions: Permission[];
}

export interface Team {
  id: string;
  name: string;
  sport: string;
  ageGroup: string;
  experienceLevel: string;
  ownerId: string;
  members: TeamMember[];
  createdAt: Date;
  updatedAt: Date;
  settings: TeamSettings;
}

export interface TeamSettings {
  privacy: 'public' | 'private' | 'invite-only';
  allowMemberInvites: boolean;
  allowPlaySharing: boolean;
  requireApproval: boolean;
}

// Production-ready subscription plans
export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    features: ['5 AI plays per month', 'Basic dashboards', 'Community support'],
    limits: {
      maxPlaysPerMonth: 10,
      maxTeams: 1,
      maxCollaborators: 2,
      aiFeatures: true,
      analytics: false,
      apiAccess: false,
      whiteLabel: false,
    },
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 19,
    interval: 'month',
    features: ['Unlimited team access', 'Practice planner', 'Email support'],
    limits: {
      maxPlaysPerMonth: 200,
      maxTeams: 3,
      maxCollaborators: 5,
      aiFeatures: true,
      analytics: true,
      apiAccess: false,
      whiteLabel: false,
    },
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    price: 49,
    interval: 'month',
    features: ['Advanced analytics', 'Priority support', 'Custom branding'],
    limits: {
      maxPlaysPerMonth: 1000,
      maxTeams: 10,
      maxCollaborators: 20,
      aiFeatures: true,
      analytics: true,
      apiAccess: false,
      whiteLabel: true,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 149,
    interval: 'month',
    features: ['Dedicated success manager', 'API access', 'Custom integrations'],
    limits: {
      maxPlaysPerMonth: 5000,
      maxTeams: 50,
      maxCollaborators: 50,
      aiFeatures: true,
      analytics: true,
      apiAccess: true,
      whiteLabel: true,
    },
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 49,
    interval: 'month',
    features: ['Advanced analytics', 'Priority support', 'Custom branding'],
    limits: {
      maxPlaysPerMonth: 1000,
      maxTeams: 10,
      maxCollaborators: 20,
      aiFeatures: true,
      analytics: true,
      apiAccess: false,
      whiteLabel: true,
    },
  },
};
