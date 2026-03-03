import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import youtubeAdapter from '../youtubeAdapter';
import { saveExternalAccount, getExternalAccount, deleteExternalAccount, generateExternalAccountId } from '@/features/recruiting/data';
import { findAssetByFingerprint, saveImportedAsset } from '@/features/recruiting/data/importedAssetRepository';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('@/features/recruiting/data', () => ({
  saveExternalAccount: vi.fn(),
  getExternalAccount: vi.fn(),
  deleteExternalAccount: vi.fn(),
  generateExternalAccountId: vi.fn((userId: string, provider: string) => `${userId}_${provider}`),
}));

vi.mock('@/features/recruiting/data/importedAssetRepository', () => ({
  findAssetByFingerprint: vi.fn(),
  saveImportedAsset: vi.fn(),
}));

vi.mock('@/utils/secure-logger', () => ({
  __esModule: true,
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockedAxios = axios as unknown as { get: ReturnType<typeof vi.fn> };

const mockGenerateExternalAccountId = generateExternalAccountId as unknown as ReturnType<typeof vi.fn>;
const mockSaveExternalAccount = saveExternalAccount as unknown as ReturnType<typeof vi.fn>;
const mockGetExternalAccount = getExternalAccount as unknown as ReturnType<typeof vi.fn>;
const mockDeleteExternalAccount = deleteExternalAccount as unknown as ReturnType<typeof vi.fn>;
const mockFindAssetByFingerprint = findAssetByFingerprint as unknown as ReturnType<typeof vi.fn>;
const mockSaveImportedAsset = saveImportedAsset as unknown as ReturnType<typeof vi.fn>;

const createChannelPayload = () => ({
  data: {
    items: [
      {
        id: 'channel-123',
        snippet: {
          title: 'Seed Channel',
          customUrl: '@seed-channel',
        },
        contentDetails: {
          relatedPlaylists: {
            uploads: 'playlist-uploads',
          },
        },
      },
    ],
  },
});

const createPlaylistPayload = (videoIds: string[], nextPageToken?: string) => ({
  data: {
    items: videoIds.map((videoId, index) => ({
      snippet: {
        resourceId: { videoId },
        title: `Video ${index + 1}`,
        publishedAt: `2024-11-${String(index + 1).padStart(2, '0')}T10:00:00Z`,
      },
      contentDetails: {
        videoId,
        videoPublishedAt: `2024-11-${String(index + 1).padStart(2, '0')}T10:00:00Z`,
      },
    })),
    nextPageToken,
  },
});

const createVideosPayload = (videoIds: string[]) => ({
  data: {
    items: videoIds.map((videoId, index) => ({
      id: videoId,
      snippet: {
        title: `Highlight ${index + 1}`,
        description: 'A great play.',
        tags: ['highlight', 'wr'],
        publishedAt: `2024-11-${String(index + 1).padStart(2, '0')}T10:00:00Z`,
      },
      statistics: {
        viewCount: (1000 + index * 100).toString(),
        likeCount: (90 + index * 10).toString(),
      },
      contentDetails: {
        duration: 'PT2M15S',
      },
    })),
  },
});

describe('youtubeAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.YOUTUBE_API_KEY = 'test-key';
  });

  it('connects a channel and stores external account metadata', async () => {
    mockedAxios.get.mockResolvedValueOnce(createChannelPayload());

    const result = await youtubeAdapter.connect({
      userId: 'user-1',
      channelUrl: 'https://youtube.com/@seed-channel',
    });

    expect(result.success).toBe(true);
    expect(mockGenerateExternalAccountId).toHaveBeenCalledWith('user-1', 'youtube');
    expect(mockSaveExternalAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        handleOrId: 'channel-123',
        auth: expect.objectContaining({
          metadata: expect.objectContaining({
            uploadsPlaylistId: 'playlist-uploads',
            channelHandle: '@seed-channel',
            channelTitle: 'Seed Channel',
          }),
        }),
      })
    );
  });

  it('returns manual fallback on quota error', async () => {
    mockedAxios.get.mockRejectedValueOnce({
      response: {
        status: 403,
        data: { error: { errors: [{ reason: 'quotaExceeded' }] } },
      },
    });

    const result = await youtubeAdapter.connect({
      userId: 'user-1',
      channelUrl: 'https://youtube.com/@seed-channel',
    });

    expect(result.success).toBe(false);
    expect(result.requiresManualLink).toBe(true);
  });

  it('fetches assets with pagination and skips duplicates', async () => {
    mockGetExternalAccount.mockResolvedValue({
      userId: 'user-1',
      provider: 'youtube',
      handleOrId: 'channel-123',
      auth: {
        metadata: {
          uploadsPlaylistId: 'playlist-uploads',
        },
      },
      lastSyncAt: undefined,
      syncStatus: 'ok',
    });

    mockedAxios.get
      .mockResolvedValueOnce(createPlaylistPayload(['video-1'], 'NEXT'))
      .mockResolvedValueOnce(createPlaylistPayload(['video-2']))
      .mockResolvedValueOnce(createVideosPayload(['video-1', 'video-2']));

    mockFindAssetByFingerprint
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'seed-existing', userId: 'user-1' });

    const assets = await youtubeAdapter.fetchAssets('user-1');

    expect(assets).toHaveLength(1);
    expect(mockSaveImportedAsset).toHaveBeenCalledTimes(1);
    expect(mockSaveImportedAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'youtube',
        fingerprint: expect.any(String),
      })
    );
  });

  it('retries transient errors when fetching playlist items', async () => {
    mockGetExternalAccount.mockResolvedValue({
      userId: 'user-1',
      provider: 'youtube',
      handleOrId: 'channel-123',
      auth: {
        metadata: {
          uploadsPlaylistId: 'playlist-uploads',
        },
      },
      lastSyncAt: undefined,
      syncStatus: 'ok',
    });

    mockedAxios.get
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockResolvedValueOnce(createPlaylistPayload(['video-1']))
      .mockResolvedValueOnce(createVideosPayload(['video-1']));

    mockFindAssetByFingerprint.mockResolvedValue(null);

    const assets = await youtubeAdapter.fetchAssets('user-1');

    expect(assets).toHaveLength(1);
    expect(mockedAxios.get).toHaveBeenCalledTimes(3);
  });

  it('maps imported assets to signal summary', async () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

    const summary = await youtubeAdapter.mapToAthleteSignals([
      {
        id: 'asset-1',
        userId: 'user-1',
        provider: 'youtube',
        assetType: 'video',
        sourceUrl: 'https://youtu.be/asset1',
        meta: { views: 1000, likes: 120, timestamp: thirtyDaysAgo, tags: ['highlight'] },
        aiTags: [],
        fingerprint: 'fp-1',
        createdAt: thirtyDaysAgo,
      },
      {
        id: 'asset-2',
        userId: 'user-1',
        provider: 'youtube',
        assetType: 'video',
        sourceUrl: 'https://youtu.be/asset2',
        meta: { views: 500, likes: 40, timestamp: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), tags: ['camp'] },
        aiTags: [],
        fingerprint: 'fp-2',
        createdAt: now,
      },
    ]);

    expect(summary.stats.totalAssets).toBe(2);
    expect(summary.stats.totalViews).toBe(1500);
    expect(summary.engagement.find((metric) => metric.metric === 'recent_uploads_30d')?.value).toBe(1);
  });

  it('disconnects linked account', async () => {
    await youtubeAdapter.disconnect('user-1');
    expect(mockDeleteExternalAccount).toHaveBeenCalledWith('user-1_youtube');
  });
});
