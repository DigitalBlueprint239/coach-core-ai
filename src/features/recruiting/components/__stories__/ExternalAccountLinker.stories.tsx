import type { Meta, StoryObj } from '@storybook/react';
import { ExternalAccountLinker } from '../ExternalAccountLinker';

const meta: Meta<typeof ExternalAccountLinker> = {
  title: 'Recruiting/ExternalAccountLinker',
  component: ExternalAccountLinker,
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof ExternalAccountLinker>;

export const Default: Story = {
  args: {
    providers: [
      {
        key: 'youtube',
        label: 'YouTube',
        status: 'connected',
        url: 'https://youtube.com/@seedathlete',
        lastSyncedAt: new Date().toISOString(),
      },
      {
        key: 'hudl',
        label: 'Hudl',
        status: 'manual',
        helperText: 'Paste your Hudl profile link for manual sync.',
      },
      {
        key: 'instagram',
        label: 'Instagram',
        status: 'not_linked',
      },
    ],
  },
};

export const Loading: Story = {
  args: {
    providers: [
      {
        key: 'youtube',
        label: 'YouTube',
        status: 'connected',
        url: 'https://youtube.com/@seedathlete',
      },
      {
        key: 'hudl',
        label: 'Hudl',
        status: 'not_linked',
        isLoading: true,
      },
      {
        key: 'instagram',
        label: 'Instagram',
        status: 'manual',
        helperText: 'We will surface IG reels in your highlights grid.',
      },
    ],
  },
};
