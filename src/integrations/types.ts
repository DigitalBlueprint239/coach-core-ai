import { ExternalAccount, ImportedAsset } from '@/features/recruiting';

export type ProviderKey = 'twitter' | 'hudl' | 'instagram' | 'youtube' | 'maxpreps';

export interface ProviderConnectOptions {
  userId: string;
  channelUrl?: string;
  channelId?: string;
  handle?: string;
  manualUrl?: string;
  authTokens?: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  };
  metadata?: Record<string, unknown>;
}

export interface AuthResult {
  success: boolean;
  account?: ExternalAccount;
  requiresManualLink?: boolean;
  message?: string;
}

export interface SignalClip {
  assetId: string;
  title: string;
  url: string;
  durationSeconds?: number;
  tags: string[];
  capturedAt?: Date;
}

export interface SignalSummary {
  clips: SignalClip[];
  stats: {
    totalAssets: number;
    totalViews?: number;
    totalLikes?: number;
    subscriberCount?: number;
  };
  engagement: Array<{
    metric: string;
    value: number;
    unit?: string;
  }>;
}

export interface ProviderAdapter {
  provider: ProviderKey;
  connect(options: ProviderConnectOptions): Promise<AuthResult>;
  disconnect(userId: string): Promise<void>;
  fetchAssets(userId: string, since?: Date): Promise<ImportedAsset[]>;
  mapToAthleteSignals(assets: ImportedAsset[]): Promise<SignalSummary>;
}
