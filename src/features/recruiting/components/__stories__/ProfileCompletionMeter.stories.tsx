import type { Meta, StoryObj } from '@storybook/react';
import { ProfileCompletionMeter } from '../ProfileCompletionMeter';

const meta: Meta<typeof ProfileCompletionMeter> = {
  title: 'Recruiting/ProfileCompletionMeter',
  component: ProfileCompletionMeter,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    completion: { control: { type: 'number', min: 0, max: 100 } },
    readinessScore: { control: { type: 'number', min: 0, max: 100 } },
    saveStatus: {
      control: 'radio',
      options: ['idle', 'saving', 'saved'],
    },
  },
};

export default meta;

type Story = StoryObj<typeof ProfileCompletionMeter>;

export const Default: Story = {
  args: {
    completion: 72,
    readinessScore: 80,
    saveStatus: 'saved',
    nextActions: [
      'Upload transcript PDF to unlock academic visibility',
      'Tag top clips in highlight reel',
    ],
  },
};

export const Saving: Story = {
  args: {
    completion: 45,
    readinessScore: 60,
    saveStatus: 'saving',
    nextActions: ['Complete measurable data'],
  },
};
