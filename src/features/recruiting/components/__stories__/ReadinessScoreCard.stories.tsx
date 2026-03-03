import type { Meta, StoryObj } from '@storybook/react';
import { ReadinessScoreCard } from '../ReadinessScoreCard';

const meta: Meta<typeof ReadinessScoreCard> = {
  title: 'Recruiting/ReadinessScoreCard',
  component: ReadinessScoreCard,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    score: { control: { type: 'number', min: 0, max: 100 } },
  },
};

export default meta;

type Story = StoryObj<typeof ReadinessScoreCard>;

export const Default: Story = {
  args: {
    score: 82,
    summary: 'Profile is showcasing consistent academics, verified measurables, and active highlights.',
    nextSteps: ['Confirm camp schedule', 'Add coaching endorsements'],
  },
};

export const NeedsWork: Story = {
  args: {
    score: 55,
    summary: 'Academic details missing. Add GPA and transcript to unlock more programs.',
    nextSteps: ['Upload transcript', 'Connect Hudl account'],
  },
};
