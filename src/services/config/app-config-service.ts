import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import type { Permission, UserRole, SubscriptionTierName } from '../../types/user';

export interface WaitlistSettings {
  rateLimit: {
    maxAttempts: number;
    windowMs: number;
  };
  batch: {
    size: number;
    timeoutMs: number;
  };
}

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    { resource: 'profile', action: 'read' },
    { resource: 'profile', action: 'write' },
    { resource: 'general', action: 'admin' },
  ],
  coach: [
    { resource: 'profile', action: 'read' },
    { resource: 'profile', action: 'write' },
    { resource: 'teams', action: 'read' },
    { resource: 'teams', action: 'write' },
    { resource: 'plays', action: 'read' },
    { resource: 'plays', action: 'write' },
    { resource: 'practice', action: 'write' },
  ],
  'head-coach': [
    { resource: 'profile', action: 'read' },
    { resource: 'profile', action: 'write' },
    { resource: 'teams', action: 'read' },
    { resource: 'teams', action: 'write' },
    { resource: 'plays', action: 'read' },
    { resource: 'plays', action: 'write' },
    { resource: 'practice', action: 'write' },
  ],
  'assistant-coach': [
    { resource: 'profile', action: 'read' },
    { resource: 'profile', action: 'write' },
    { resource: 'teams', action: 'read' },
    { resource: 'plays', action: 'read' },
  ],
  'team-admin': [
    { resource: 'profile', action: 'read' },
    { resource: 'profile', action: 'write' },
    { resource: 'teams', action: 'write' },
    { resource: 'players', action: 'read' },
    { resource: 'players', action: 'write' },
  ],
  client: [
    { resource: 'profile', action: 'read' },
    { resource: 'profile', action: 'write' },
  ],
  user: [
    { resource: 'profile', action: 'read' },
    { resource: 'profile', action: 'write' },
  ],
};

export const DEFAULT_WAITLIST_SETTINGS: WaitlistSettings = {
  rateLimit: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  batch: {
    size: 10,
    timeoutMs: 5000,
  },
};

export interface SubscriptionTierConfig {
  id: string;
  name: SubscriptionTierName;
  stripePriceId: string;
  pricing: {
    monthly: number;
    annual: number;
    currency: string;
  };
  features: {
    maxClients: number;
    maxTeams: number;
    aiGenerationsPerMonth: number;
    videoStorageGB: number;
    customBranding: boolean;
    prioritySupport: boolean;
    apiAccess: boolean;
  };
  limits: {
    sessionsPerMonth: number;
    practicesPerMonth: number;
    playsPerTeam: number;
  };
}

export interface SpecialSubscriptionsConfig {
  foundingMember: {
    discount: number;
    features: SubscriptionTierName;
  };
  earlyAccess: {
    discount: number;
    duration: 'lifetime' | '12_months';
  };
  betaTester: {
    freeMonths: number;
    thenTier: SubscriptionTierName;
  };
}

interface SubscriptionConfiguration {
  tiers: SubscriptionTierConfig[];
  specials: SpecialSubscriptionsConfig;
}

const DEFAULT_SUBSCRIPTION_CONFIGURATION: SubscriptionConfiguration = {
  tiers: [
    {
      id: 'tier_free',
      name: 'free',
      stripePriceId: 'price_free',
      pricing: {
        monthly: 0,
        annual: 0,
        currency: 'usd',
      },
      features: {
        maxClients: 3,
        maxTeams: 1,
        aiGenerationsPerMonth: 10,
        videoStorageGB: 1,
        customBranding: false,
        prioritySupport: false,
        apiAccess: false,
      },
      limits: {
        sessionsPerMonth: 10,
        practicesPerMonth: 4,
        playsPerTeam: 25,
      },
    },
    {
      id: 'tier_starter',
      name: 'starter',
      stripePriceId: 'price_starter_monthly',
      pricing: {
        monthly: 19,
        annual: 190,
        currency: 'usd',
      },
      features: {
        maxClients: 25,
        maxTeams: 3,
        aiGenerationsPerMonth: 200,
        videoStorageGB: 25,
        customBranding: false,
        prioritySupport: false,
        apiAccess: false,
      },
      limits: {
        sessionsPerMonth: 40,
        practicesPerMonth: 12,
        playsPerTeam: 150,
      },
    },
    {
      id: 'tier_professional',
      name: 'professional',
      stripePriceId: 'price_professional_monthly',
      pricing: {
        monthly: 49,
        annual: 490,
        currency: 'usd',
      },
      features: {
        maxClients: 100,
        maxTeams: 10,
        aiGenerationsPerMonth: 1000,
        videoStorageGB: 200,
        customBranding: true,
        prioritySupport: true,
        apiAccess: false,
      },
      limits: {
        sessionsPerMonth: 120,
        practicesPerMonth: 30,
        playsPerTeam: 500,
      },
    },
    {
      id: 'tier_enterprise',
      name: 'enterprise',
      stripePriceId: 'price_enterprise_monthly',
      pricing: {
        monthly: 149,
        annual: 1490,
        currency: 'usd',
      },
      features: {
        maxClients: 1000,
        maxTeams: 50,
        aiGenerationsPerMonth: 5000,
        videoStorageGB: 1000,
        customBranding: true,
        prioritySupport: true,
        apiAccess: true,
      },
      limits: {
        sessionsPerMonth: 500,
        practicesPerMonth: 200,
        playsPerTeam: 2000,
      },
    },
  ],
  specials: {
    foundingMember: {
      discount: 0.5,
      features: 'professional',
    },
    earlyAccess: {
      discount: 0.4,
      duration: 'lifetime',
    },
    betaTester: {
      freeMonths: 3,
      thenTier: 'professional',
    },
  },
};

type RolePermissionOverrides = Partial<Record<UserRole, Permission[]>>;

type RolePermissionDocument = {
  permissions?: RolePermissionOverrides;
};

type WaitlistConfigDocument = {
  rateLimit?: Partial<WaitlistSettings['rateLimit']>;
  batch?: Partial<WaitlistSettings['batch']>;
};

type SubscriptionConfigDocument = {
  tiers?: SubscriptionTierConfig[];
  specials?: Partial<SpecialSubscriptionsConfig>;
};

class AppConfigService {
  private rolePermissions: RolePermissionOverrides | null = null;
  private waitlistSettings: WaitlistSettings | null = null;
  private subscriptionConfig: SubscriptionConfiguration | null = null;
  private loadPromise: Promise<void> | null = null;

  async ensureLoaded(): Promise<void> {
    if (this.rolePermissions && this.waitlistSettings && this.subscriptionConfig) {
      return;
    }

    if (!this.loadPromise) {
      this.loadPromise = this.loadAll().catch((error) => {
        console.error('[config] Failed to load app configuration from Firestore', error);
        throw error;
      });
    }

    try {
      await this.loadPromise;
    } catch (error) {
      // Allow consumers to continue with defaults if config fetch fails
      console.warn('[config] Using default configuration due to load error');
    } finally {
      this.loadPromise = null;
    }
  }

  getRolePermissions(role: UserRole): Permission[] {
    const overrides = this.rolePermissions?.[role];
    return overrides ?? DEFAULT_ROLE_PERMISSIONS[role] ?? DEFAULT_ROLE_PERMISSIONS.coach;
  }

  getWaitlistSettings(): WaitlistSettings {
    return this.waitlistSettings ?? DEFAULT_WAITLIST_SETTINGS;
  }

  getSubscriptionTiers(): SubscriptionTierConfig[] {
    return this.subscriptionConfig?.tiers ?? DEFAULT_SUBSCRIPTION_CONFIGURATION.tiers;
  }

  getSubscriptionTier(name: SubscriptionTierName): SubscriptionTierConfig | undefined {
    return this.getSubscriptionTiers().find((tier) => tier.name === name);
  }

  getSpecialSubscriptions(): SpecialSubscriptionsConfig {
    return this.subscriptionConfig?.specials ?? DEFAULT_SUBSCRIPTION_CONFIGURATION.specials;
  }

  async refresh(): Promise<void> {
    this.rolePermissions = null;
    this.waitlistSettings = null;
    this.subscriptionConfig = null;
    await this.ensureLoaded();
  }

  private async loadAll(): Promise<void> {
    await Promise.all([this.loadRolePermissions(), this.loadWaitlistSettings(), this.loadSubscriptionConfig()]);
  }

  private async loadRolePermissions(): Promise<void> {
    try {
      const snapshot = await getDoc(doc(db, 'config', 'rolePermissions'));
      if (snapshot.exists()) {
        const data = snapshot.data() as RolePermissionDocument;
        if (data?.permissions) {
          this.rolePermissions = data.permissions;
          return;
        }
      }
      this.rolePermissions = {};
    } catch (error) {
      console.error('[config] Failed to load role permission overrides', error);
      this.rolePermissions = this.rolePermissions ?? {};
    }
  }

  private async loadWaitlistSettings(): Promise<void> {
    try {
      const snapshot = await getDoc(doc(db, 'config', 'waitlist'));
      if (snapshot.exists()) {
        const data = snapshot.data() as WaitlistConfigDocument;
        this.waitlistSettings = {
          rateLimit: {
            ...DEFAULT_WAITLIST_SETTINGS.rateLimit,
            ...(data.rateLimit || {}),
          },
          batch: {
            ...DEFAULT_WAITLIST_SETTINGS.batch,
            ...(data.batch || {}),
          },
        };
        return;
      }
      this.waitlistSettings = DEFAULT_WAITLIST_SETTINGS;
    } catch (error) {
      console.error('[config] Failed to load waitlist configuration', error);
      this.waitlistSettings = this.waitlistSettings ?? DEFAULT_WAITLIST_SETTINGS;
    }
  }

  private async loadSubscriptionConfig(): Promise<void> {
    try {
      const snapshot = await getDoc(doc(db, 'config', 'subscriptions'));
      if (snapshot.exists()) {
        const data = snapshot.data() as SubscriptionConfigDocument;
        this.subscriptionConfig = {
          tiers: data.tiers && data.tiers.length ? data.tiers : DEFAULT_SUBSCRIPTION_CONFIGURATION.tiers,
          specials: {
            ...DEFAULT_SUBSCRIPTION_CONFIGURATION.specials,
            ...(data.specials || {}),
          },
        };
        return;
      }
      this.subscriptionConfig = DEFAULT_SUBSCRIPTION_CONFIGURATION;
    } catch (error) {
      console.error('[config] Failed to load subscription configuration', error);
      this.subscriptionConfig = this.subscriptionConfig ?? DEFAULT_SUBSCRIPTION_CONFIGURATION;
    }
  }
}

export const appConfigService = new AppConfigService();

export const getConfiguredRolePermissions = (role: UserRole): Permission[] =>
  appConfigService.getRolePermissions(role);

export const getConfiguredWaitlistSettings = (): WaitlistSettings =>
  appConfigService.getWaitlistSettings();

export const getConfiguredSubscriptionTiers = (): SubscriptionTierConfig[] =>
  appConfigService.getSubscriptionTiers();

export const getConfiguredSubscriptionTier = (
  name: SubscriptionTierName
): SubscriptionTierConfig | undefined => appConfigService.getSubscriptionTier(name);

export const getConfiguredSpecialSubscriptions = (): SpecialSubscriptionsConfig =>
  appConfigService.getSpecialSubscriptions();
