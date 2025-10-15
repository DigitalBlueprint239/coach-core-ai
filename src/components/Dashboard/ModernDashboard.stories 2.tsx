import type { Meta, StoryObj } from '@storybook/react';
import ModernDashboard from './ModernDashboard';

const meta: Meta<typeof ModernDashboard> = {
  title: 'Components/Dashboard/ModernDashboard',
  component: ModernDashboard,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A modern, visually appealing dashboard with improved UX, animations, and better visual hierarchy.',
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

export const WithData: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          'Dashboard with sample data showing team statistics and recent activity.',
      },
    },
  },
};
