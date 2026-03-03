import type { Meta, StoryObj } from '@storybook/react';
import { AssetGrid } from '../AssetGrid';

const meta: Meta<typeof AssetGrid> = {
  title: 'Recruiting/AssetGrid',
  component: AssetGrid,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'light' },
  },
};

export default meta;

type Story = StoryObj<typeof AssetGrid>;

export const Default: Story = {
  args: {
    assets: [
      {
        id: 'asset-1',
        provider: 'youtube',
        title: 'Junior Year Highlights',
        url: 'https://youtu.be/example1',
        metrics: { views: 24000, likes: 1200, timestamp: new Date().toISOString() },
      },
      {
        id: 'asset-2',
        provider: 'hudl',
        title: 'Hudl: State Championship vs Central',
        url: 'https://www.hudl.com/video/example',
        metrics: { timestamp: new Date().toISOString() },
      },
      {
        id: 'asset-3',
        provider: 'instagram',
        title: 'Training Day Reels',
        url: 'https://instagram.com/p/example',
      },
    ],
  },
};

export const Empty: Story = {
  args: {
    assets: [],
  },
};
