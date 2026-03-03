import { test, expect } from '@playwright/test';

const channelResponse = {
  kind: 'youtube#channelListResponse',
  items: [
    {
      id: 'channel-123',
      snippet: {
        title: 'Seed Channel',
        customUrl: '@seedchannel',
      },
      contentDetails: {
        relatedPlaylists: {
          uploads: 'playlist-uploads',
        },
      },
    },
  ],
};

const playlistPage = (videoIds: string[], nextPageToken?: string) => ({
  kind: 'youtube#playlistItemListResponse',
  items: videoIds.map((id) => ({
    snippet: {
      resourceId: { videoId: id },
      title: `Video ${id}`,
      publishedAt: '2024-10-10T12:00:00Z',
    },
    contentDetails: {
      videoId: id,
      videoPublishedAt: '2024-10-10T12:00:00Z',
    },
  })),
  nextPageToken,
});

const videosResponse = {
  kind: 'youtube#videoListResponse',
  items: [
    {
      id: 'video-1',
      snippet: {
        title: 'Highlight 1',
        tags: ['highlight'],
        publishedAt: '2024-10-10T12:00:00Z',
      },
      statistics: {
        viewCount: '1500',
        likeCount: '120',
      },
      contentDetails: {
        duration: 'PT2M30S',
      },
    },
  ],
};

const apiHost = 'https://www.googleapis.com/youtube/v3';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());

  await page.route(`${apiHost}/channels`, (route) => {
    route.fulfill({ json: channelResponse });
  });

  await page.route(`${apiHost}/playlistItems`, (route) => {
    const url = new URL(route.request().url());
    const pageToken = url.searchParams.get('pageToken');
    if (pageToken) {
      route.fulfill({ json: playlistPage([]) });
    } else {
      route.fulfill({ json: playlistPage(['video-1']) });
    }
  });

  await page.route(`${apiHost}/videos`, (route) => {
    route.fulfill({ json: videosResponse });
  });
});

test('syncs YouTube assets after connecting channel', async ({ page }) => {
  await page.goto('/recruiting/profile');
  await page.getByRole('heading', { name: 'Athlete Profile' }).waitFor();
  await expect(page).toHaveURL(/recruiting\/profile/);

  await page.getByLabel('YouTube Channel URL or Handle').fill('https://youtube.com/@seedchannel');
  await page.getByRole('button', { name: 'Connect' }).first().click();

  await expect(page.getByText('YouTube connected')).toBeVisible();
  await expect(page.getByText('YouTube Highlight')).toBeVisible();
});
