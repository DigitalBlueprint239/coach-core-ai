import { youtubeAdapter, createManualImportedAsset } from '@/integrations';
import { ProviderConnectOptions, ProviderKey } from '@/integrations/types';
import { ImportedAsset, ExternalAccount } from '../domain';

export const connectYoutubeAccount = async (
  options: ProviderConnectOptions
): Promise<ExternalAccount | null> => {
  const result = await youtubeAdapter.connect(options);
  return result.success ? result.account ?? null : null;
};

export const disconnectYoutubeAccount = async (userId: string): Promise<void> => {
  await youtubeAdapter.disconnect(userId);
};

export const syncYoutubeAssets = async (
  userId: string,
  since?: Date
): Promise<ImportedAsset[]> => youtubeAdapter.fetchAssets(userId, since);

export type ManualProvider = Exclude<ProviderKey, 'youtube'>;

export const linkManualAsset = async ({
  userId,
  provider,
  url,
  tags,
  capturedAt,
}: {
  userId: string;
  provider: ManualProvider;
  url: string;
  tags?: string[];
  capturedAt?: Date;
}): Promise<ImportedAsset | null> =>
  createManualImportedAsset({
    userId,
    provider,
    url,
    tags,
    capturedAt,
  });
