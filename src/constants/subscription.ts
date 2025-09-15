import { SUBSCRIPTION_PLANS } from '../types/user';

export { SUBSCRIPTION_PLANS };

export const SUBSCRIPTION_FEATURES = {
  FREE: {
    maxPlaysPerMonth: 5,
    maxTeams: 1,
    maxCollaborators: 2,
    aiFeatures: true,
    analytics: false,
    apiAccess: false,
    whiteLabel: false,
  },
  PREMIUM: {
    maxPlaysPerMonth: 1000,
    maxTeams: 5,
    maxCollaborators: 10,
    aiFeatures: true,
    analytics: true,
    apiAccess: false,
    whiteLabel: false,
  },
  ENTERPRISE: {
    maxPlaysPerMonth: 10000,
    maxTeams: 20,
    maxCollaborators: 50,
    aiFeatures: true,
    analytics: true,
    apiAccess: true,
    whiteLabel: true,
  },
};

export const SUBSCRIPTION_LIMITS = {
  FREE_TRIAL_DAYS: 14,
  UPGRADE_GRACE_PERIOD_DAYS: 7,
  USAGE_RESET_DAY: 1, // 1st of each month
};

export const BILLING_CYCLES = {
  MONTHLY: 'month',
  YEARLY: 'year',
};

export const SUBSCRIPTION_STATUSES = {
  ACTIVE: 'active',
  CANCELED: 'canceled',
  PAST_DUE: 'past_due',
  TRIALING: 'trialing',
  UNPAID: 'unpaid',
};
