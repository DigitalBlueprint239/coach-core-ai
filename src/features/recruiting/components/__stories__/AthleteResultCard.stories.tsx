import type { Meta, StoryObj } from '@storybook/react';
import { AthleteResultCard } from '../AthleteResultCard';

const meta: Meta<typeof AthleteResultCard> = {
  title: 'Recruiting/AthleteResultCard',
  component: AthleteResultCard,
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof AthleteResultCard>;

export const Default: Story = {
  args: {
    name: 'Jordan Blake',
    position: 'WR',
    gradYear: 2026,
    location: 'Houston, TX',
    readinessScore: 82,
    measurables: {
      forty: 4.51,
      gpa: 3.7,
      heightIn: 73,
      weightLb: 190,
    },
  },
};

export const Minimal: Story = {
  args: {
    name: 'Micah Turner',
    position: 'QB',
    gradYear: 2027,
  },
};
