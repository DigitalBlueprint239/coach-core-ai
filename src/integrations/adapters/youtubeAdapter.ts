import axios, { AxiosError } from 'axios';
import dayjs from 'dayjs';
import { z } from 'zod';
import secureLogger from '@/utils/secure-logger';
import {
  deleteExternalAccount,
  generateExternalAccountId,
  getExternalAccount,
  saveExternalAccount,
} from '@/features/recruiting/data';
import {
  findAssetByFingerprint,
  saveImportedAsset,
} from '@/features/recruiting/data/importedAssetRepository';
import { ImportedAsset, ExternalAccount } from '@/features/recruiting';
import {
  AuthResult,
  ProviderAdapter,
  ProviderConnectOptions,
  ProviderKey,
  SignalSummary,
} from '../types';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const PROVIDER: ProviderKey = 'youtube';
const MAX_RETRIES = 3;
const MAX_RESULTS = 25;

const resolveEnv = (key: string): string | undefined => {
  if (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> }).env) {
    const metaEnv = (import.meta as unknown as { env: Record<string, string> }).env;
    if (metaEnv[key]) {
      return metaEnv[key];
    }
  }
  return process.env[key];
};

const getYoutubeApiKey = (): string => {
  const key =
    resolveEnv('YOUTUBE_API_KEY') ||
    resolveEnv('VITE_YOUTUBE_API_KEY') ||
    resolveEnv('REACT_APP_YOUTUBE_API_KEY');

  if (!key) {
    throw new Error('YouTube API key not configured');
  }

  return key;
};

const channelSchema = z.object({
  id: z.string(),
  snippet: z.object({
    title: z.string(),
    description: z.string().optional(),
    customUrl: z.string().optional(),
    thumbnails: z
      .object({
        high: z.object({ url: z.string().url() }).optional(),
        medium: z.object({ url: z.string().url() }).optional(),
        default: z.object({ url: z.string().url() }).optional(),
      })
      .optional(),
  }),
  statistics: z
    .object({
      subscriberCount: z.string().optional(),
      viewCount: z.string().optional(),
      videoCount: z.string().optional(),
      hiddenSubscriberCount: z.boolean().optional(),
    })
    .optional(),
  contentDetails: z.object({
    relatedPlaylists: z.object({
      uploads: z.string(),
    }),
  }),
});

const channelResponseSchema = z.object({
  items: z.array(channelSchema),
});

const playlistItemSchema = z.object({
  snippet: z.object({
    resourceId: z.object({
      videoId: z.string(),
    }),
    title: z.string(),
    publishedAt: z.string(),
  }),
  contentDetails: z.object({
    videoId: z.string(),
    videoPublishedAt: z.string().optional(),
  }),
});

const playlistItemsResponseSchema = z.object({
  items: z.array(playlistItemSchema),
  nextPageToken: z.string().optional(),
});

const videoDetailsSchema = z.object({
  id: z.string(),
  snippet: z.object({
    title: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    publishedAt: z.string(),
  }),
  statistics: z
    .object({
      viewCount: z.string().optional(),
      likeCount: z.string().optional(),
      favoriteCount: z.string().optional(),
      commentCount: z.string().optional(),
    })
    .optional(),
  contentDetails: z
    .object({
      duration: z.string().optional(),
    })
    .optional(),
});

const videosResponseSchema = z.object({
  items: z.array(videoDetailsSchema),
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithRetry = async <T>(fn: () => Promise<T>, attempt = 0): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;

    if (attempt >= MAX_RETRIES || (status && status < 500 && status !== 429)) {
      throw error;
    }

    const delay = Math.pow(2, attempt) * 500;
    secureLogger.warn('YouTube request retrying', { attempt, delay, status });
    await sleep(delay);
    return fetchWithRetry(fn, attempt + 1);
  }
};

const isoDurationToSeconds = (duration?: string): number | undefined => {
  if (!duration) return undefined;
  const match =
    /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(duration);
  if (!match) return undefined;
  const [, hours, minutes, seconds] = match;
  const total =
    (parseInt(hours ?? '0', 10) * 3600) +
    (parseInt(minutes ?? '0', 10) * 60) +
    parseInt(seconds ?? '0', 10);
  return Number.isNaN(total) ? undefined : total;
};

const generateFingerprint = (input: string): string => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return `yt_${Math.abs(hash).toString(16)}`;
};

const parseChannelIdentifier = (
  options: ProviderConnectOptions
): { type: 'id' | 'handle'; value: string } => {
  if (options.channelId) {
    return { type: 'id', value: options.channelId };
  }

  const rawInput =
    options.channelUrl || options.handle || options.manualUrl;

  if (!rawInput) {
    throw new Error('YouTube channel handle or URL required');
  }

  if (rawInput.startsWith('@')) {
    return { type: 'handle', value: rawInput.replace('@', '') };
  }

  try {
    const parsed = new URL(rawInput.startsWith('http') ? rawInput : `https://${rawInput}`);
    const path = parsed.pathname.replace(/\/+$/, '');

    if (path.startsWith('/channel/')) {
      return { type: 'id', value: path.replace('/channel/', '') };
    }

    if (path.startsWith('/@')) {
      return { type: 'handle', value: path.replace('/@', '') };
    }

    if (path.startsWith('/c/')) {
      return { type: 'handle', value: path.replace('/c/', '') };
    }
  } catch (error) {
    // fall through to handle fallback
  }

  return { type: 'handle', value: rawInput.replace('@', '') };
};

const fetchChannel = async (
  identifier: { type: 'id' | 'handle'; value: string }
) => {
  const key = getYoutubeApiKey();

  return fetchWithRetry(async () => {
    const response = await axios.get(`${YOUTUBE_API_BASE}/channels`, {
      params: {
        part: 'snippet,contentDetails,statistics',
        key,
        ...(identifier.type === 'id'
          ? { id: identifier.value }
          : { forHandle: identifier.value }),
      },
    });

    const parsed = channelResponseSchema.parse(response.data);

    if (!parsed.items.length) {
      throw new Error('No YouTube channel found for provided identifier');
    }

    return parsed.items[0];
  });
};

const fetchPlaylistVideos = async (
  playlistId: string,
  since?: Date
) => {
  const key = getYoutubeApiKey();
  let nextPageToken: string | undefined;
  const playlistItems: z.infer<typeof playlistItemSchema>[] = [];
  let keepFetching = true;

  while (keepFetching && playlistItems.length < MAX_RESULTS) {
    const response = await fetchWithRetry(async () => {
      const res = await axios.get(`${YOUTUBE_API_BASE}/playlistItems`, {
        params: {
          part: 'snippet,contentDetails',
          playlistId,
          maxResults: 50,
          pageToken: nextPageToken,
          key,
        },
      });
      return playlistItemsResponseSchema.parse(res.data);
    });

    playlistItems.push(...response.items);

    nextPageToken = response.nextPageToken;
    const lastItem = response.items[response.items.length - 1];
    if (
      !nextPageToken ||
      (since &&
        lastItem?.contentDetails?.videoPublishedAt &&
        dayjs(lastItem.contentDetails.videoPublishedAt).isBefore(since))
    ) {
      keepFetching = false;
    }
  }

  const videoIds = playlistItems.map((item) => item.contentDetails.videoId);

  if (!videoIds.length) {
    return [];
  }

  const detailsResponse = await fetchWithRetry(async () => {
    const res = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
      params: {
        part: 'snippet,statistics,contentDetails',
        id: videoIds.join(','),
        key,
      },
    });
    return videosResponseSchema.parse(res.data);
  });

  return detailsResponse.items.map((details) => {
    const matches = playlistItems.find(
      (item) => item.contentDetails.videoId === details.id
    );

    const publishedAt =
      matches?.contentDetails.videoPublishedAt ??
      details.snippet.publishedAt;

    return {
      id: details.id,
      title: details.snippet.title,
      publishedAt,
      views: parseInt(details.statistics?.viewCount ?? '0', 10),
      likes: parseInt(details.statistics?.likeCount ?? '0', 10),
      tags: details.snippet.tags ?? [],
      durationSeconds: isoDurationToSeconds(details.contentDetails?.duration),
    };
  });
};

class YouTubeAdapter implements ProviderAdapter {
  provider: ProviderKey = PROVIDER;

  async connect(options: ProviderConnectOptions): Promise<AuthResult> {
    try {
      const identifier = parseChannelIdentifier(options);
      const channel = await fetchChannel(identifier);
      const accountId = generateExternalAccountId(options.userId, PROVIDER);

      const metadata = {
        uploadsPlaylistId: channel.contentDetails.relatedPlaylists.uploads,
        channelTitle: channel.snippet.title,
        channelHandle: channel.snippet.customUrl || identifier.value,
      } as const;

      const auth: ExternalAccount['auth'] = options.authTokens
        ? {
            accessToken: options.authTokens.accessToken,
            refreshToken: options.authTokens.refreshToken,
            expiresAt: options.authTokens.expiresAt,
            metadata,
          }
        : { metadata };

      const account: ExternalAccount = {
        id: accountId,
        userId: options.userId,
        provider: PROVIDER,
        handleOrId: channel.id,
        syncStatus: 'ok',
        auth,
      };

      await saveExternalAccount(account);

      secureLogger.info('YouTube account connected', {
        userId: options.userId,
        channelId: channel.id,
      });

      return {
        success: true,
        account,
      };
    } catch (error) {
      secureLogger.error('Failed to connect YouTube account', {
        userId: options.userId,
        error,
      });

      return {
        success: false,
        requiresManualLink: true,
        message:
          error instanceof Error ? error.message : 'Unable to connect YouTube channel',
      };
    }
  }

  async disconnect(userId: string): Promise<void> {
    const accountId = generateExternalAccountId(userId, PROVIDER);
    await deleteExternalAccount(accountId);
    secureLogger.info('YouTube account disconnected', { userId });
  }

  async fetchAssets(userId: string, since?: Date): Promise<ImportedAsset[]> {
    const account = await getExternalAccount(userId, PROVIDER);

    if (!account) {
      throw new Error('YouTube account not linked');
    }

    try {
      const playlistId =
        typeof account.auth?.metadata?.uploadsPlaylistId === 'string'
          ? account.auth.metadata.uploadsPlaylistId
          : (await fetchChannel({ type: 'id', value: account.handleOrId })).contentDetails.relatedPlaylists.uploads;

      const videoDetails = await fetchPlaylistVideos(playlistId, since);

      const newAssets: ImportedAsset[] = [];

      for (const video of videoDetails) {
        if (since && dayjs(video.publishedAt).isBefore(since)) {
          continue;
        }

        const fingerprint = generateFingerprint(
          `${account.handleOrId}:${video.id}:${video.publishedAt}`
        );

        const existing = await findAssetByFingerprint(userId, fingerprint);
        if (existing) {
          continue;
        }

        const publishedDate = new Date(video.publishedAt);
        const asset: ImportedAsset = {
          id: fingerprint,
          userId,
          provider: PROVIDER,
          assetType: 'video',
          sourceUrl: `https://www.youtube.com/watch?v=${video.id}`,
          meta: {
            views: video.views,
            likes: video.likes,
            timestamp: publishedDate,
            tags: video.tags,
          },
          aiTags: [],
          fingerprint,
          createdAt: publishedDate,
        };

        await saveImportedAsset(asset);
        newAssets.push(asset);
      }

      await saveExternalAccount({
        ...account,
        lastSyncAt: new Date(),
        syncStatus: 'ok',
        error: undefined,
      });

      secureLogger.info('YouTube assets synced', {
        userId,
        newAssets: newAssets.length,
      });

      return newAssets;
    } catch (error) {
      secureLogger.error('Failed to fetch YouTube assets', { userId, error });
      await saveExternalAccount({
        ...account,
        syncStatus: 'error',
        error: {
          message: error instanceof Error ? error.message : 'Unknown sync error',
          occurredAt: new Date(),
        },
      });
      throw error;
    }
  }

  async mapToAthleteSignals(assets: ImportedAsset[]): Promise<SignalSummary> {
    const totalViews = assets.reduce((sum, asset) => sum + (asset.meta.views ?? 0), 0);
    const totalLikes = assets.reduce((sum, asset) => sum + (asset.meta.likes ?? 0), 0);
    const now = dayjs();
    const recentUploads = assets.filter((asset) => {
      const timestamp = asset.meta.timestamp ?? asset.createdAt;
      return timestamp ? now.diff(dayjs(timestamp), 'day') <= 30 : false;
    }).length;

    const clips = assets
      .sort((a, b) => {
        const aDate = a.meta.timestamp ?? a.createdAt;
        const bDate = b.meta.timestamp ?? b.createdAt;
        return (bDate?.getTime() ?? 0) - (aDate?.getTime() ?? 0);
      })
      .slice(0, 6)
      .map((asset) => ({
        assetId: asset.id,
        title: asset.meta.tags?.[0] ?? 'Highlight Clip',
        url: asset.sourceUrl,
        durationSeconds: undefined,
        tags: asset.meta.tags ?? [],
        capturedAt: asset.meta.timestamp ?? asset.createdAt,
      }));

    return {
      clips,
      stats: {
        totalAssets: assets.length,
        totalViews,
        totalLikes,
      },
      engagement: [
        {
          metric: 'avg_views',
          value: assets.length ? Math.round(totalViews / assets.length) : 0,
          unit: 'views/video',
        },
        {
          metric: 'recent_uploads_30d',
          value: recentUploads,
          unit: 'uploads',
        },
        {
          metric: 'like_rate',
          value:
            totalViews > 0
              ? Number(((totalLikes / totalViews) * 100).toFixed(2))
              : 0,
          unit: '%',
        },
      ],
    };
  }
}

export const youtubeAdapter = new YouTubeAdapter();

export default youtubeAdapter;
