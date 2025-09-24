// Feature Flags for Production Readiness
// This allows us to disable problematic features while keeping the codebase intact

export const FEATURE_FLAGS = {
  // Core features (always enabled)
  WAITLIST: true,
  AUTHENTICATION: true,
  BASIC_DASHBOARD: true,
  FIREBASE_INTEGRATION: true,
  
  // Complex features (disabled for production)
  PRACTICE_PLANNER: false,
  ADVANCED_PLAYBOOK_TOOLING: false,
  COMPLEX_ANALYTICS: false,
  LEGACY_SUBSCRIPTION_SYSTEM: false,
  ADVANCED_MONITORING: false,
  
  // Mobile-specific features (disabled for web)
  TOUCHABLE_OPACITY: false,
  CAPACITOR_FEATURES: false,
  
  // AI features (keep simple)
  BASIC_AI_SUGGESTIONS: true,
  ADVANCED_AI_FEATURES: false,
  
  // Beta features
  BETA_TESTING_DASHBOARD: true,
  BETA_FEEDBACK_SYSTEM: true,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export const isFeatureEnabled = (flag: FeatureFlag): boolean => {
  return FEATURE_FLAGS[flag];
};

export const getEnabledFeatures = (): FeatureFlag[] => {
  return Object.entries(FEATURE_FLAGS)
    .filter(([, enabled]) => enabled)
    .map(([flag]) => flag as FeatureFlag);
};

export const getDisabledFeatures = (): FeatureFlag[] => {
  return Object.entries(FEATURE_FLAGS)
    .filter(([, enabled]) => !enabled)
    .map(([flag]) => flag as FeatureFlag);
};
