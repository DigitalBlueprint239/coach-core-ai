import type { Meta, StoryObj } from '@storybook/react';
import ModernPracticePlanner from './ModernPracticePlanner';

const meta: Meta<typeof ModernPracticePlanner> = {
  title: 'Components/PracticePlanner/ModernPracticePlanner',
  component: ModernPracticePlanner,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A modern practice planner with drag-and-drop functionality, AI integration, and improved visual design.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithGeneratedPlan: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          'Practice planner with an AI-generated practice plan showing periods and drills.',
      },
    },
  },
};
