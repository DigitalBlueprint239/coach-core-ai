import Button from './Button';

export default {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['solid', 'outline', 'ghost'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    onClick: { action: 'clicked' },
  },
};

export const Default = {
  args: {
    children: 'Button',
    variant: 'solid',
    size: 'md',
  },
};

export const Outline = {
  args: {
    children: 'Outline Button',
    variant: 'outline',
  },
};

export const Ghost = {
  args: {
    children: 'Ghost Button',
    variant: 'ghost',
  },
};

export const Small = {
  args: {
    children: 'Small Button',
    size: 'sm',
  },
};

export const Large = {
  args: {
    children: 'Large Button',
    size: 'lg',
  },
};

export const Loading = {
  args: {
    children: 'Loading Button',
    isLoading: true,
    loadingText: 'Loading...',
  },
};

export const Disabled = {
  args: {
    children: 'Disabled Button',
    isDisabled: true,
  },
};

export const WithIcons = {
  args: {
    children: 'Button with Icons',
    leftIcon: '🚀',
    rightIcon: '→',
  },
}; 