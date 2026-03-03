import { ImportedAsset } from '@/features/recruiting';
import {
  findAssetByFingerprint,
  saveImportedAsset,
} from '@/features/recruiting/data';
import secureLogger from '@/utils/secure-logger';
import { ProviderKey } from '../types';

type ManualProviders = Exclude<ProviderKey, 'youtube'>;

interface ManualLinkOptions {
  userId: string;
  provider: ManualProviders;
  url: string;
  tags?: string[];
  capturedAt?: Date;
}

const providerAssetType: Record<ManualProviders, ImportedAsset['assetType']> = {
  twitter: 'post',
  instagram: 'post',
  hudl: 'video',
  maxpreps: 'stat',
};

const generateFingerprint = (input: string): string => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return `${input.split(':')[0]}_${Math.abs(hash).toString(16)}`;
};

const normalizeUrl = (url: string): string => {
  if (!url.startsWith('http')) {
    return `https://${url}`;
  }
  return url;
};

const resolveProviderUrl = (provider: ManualProviders, url: string): string => {
  const trimmed = url.trim();
  if (provider === 'instagram' && trimmed.startsWith('@')) {
    return `https://instagram.com/${trimmed.substring(1)}`;
  }
  return trimmed;
};

export const createManualImportedAsset = async ({
  userId,
  provider,
  url,
  tags = [],
  capturedAt = new Date(),
}: ManualLinkOptions): Promise<ImportedAsset | null> => {
  try {
    const providerUrl = resolveProviderUrl(provider, url);
    const normalizedUrl = normalizeUrl(providerUrl);
    const fingerprint = generateFingerprint(`${provider}:${normalizedUrl}`);

    const existing = await findAssetByFingerprint(userId, fingerprint);
    if (existing) {
      return existing;
    }

    const asset: ImportedAsset = {
      id: fingerprint,
      userId,
      provider,
      assetType: providerAssetType[provider],
      sourceUrl: normalizedUrl,
      meta: {
        tags,
        timestamp: capturedAt,
      },
      aiTags: [],
      fingerprint,
      createdAt: capturedAt,
    };

    await saveImportedAsset(asset);
    secureLogger.info('Manual asset linked', { userId, provider, url: normalizedUrl });
    return asset;
  } catch (error) {
    secureLogger.error('Failed to link manual asset', { userId, provider, url, error });
    return null;
  }
};

export default createManualImportedAsset;
