import type { Preview } from "@storybook/react";
import { ChakraProvider } from '@chakra-ui/react';
import { enhancedTheme } from '../src/theme/enhanced-theme';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    chakra: {
      theme: enhancedTheme,
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#f9fafb',
        },
        {
          name: 'dark',
          value: '#1a202c',
        },
      ],
    },
  },
  decorators: [
    (Story) => (
      <ChakraProvider theme={enhancedTheme}>
        <Story />
      </ChakraProvider>
    ),
  ],
};

export default preview;
