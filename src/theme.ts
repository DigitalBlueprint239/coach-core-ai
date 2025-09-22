import { extendTheme, ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

const brandColors = {
  50: 'var(--team-primary-50)',
  100: 'var(--team-primary-100)',
  200: 'var(--team-primary-200)',
  300: 'var(--team-primary-300)',
  400: 'var(--team-primary-400)',
  500: 'var(--team-primary-500)',
  600: 'var(--team-primary-600)',
  700: 'var(--team-primary-700)',
  800: 'var(--team-primary-800)',
  900: 'var(--team-primary-900)',
};

const theme = extendTheme({
  config,
  fonts: {
    heading:
      'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
    body: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  },
  colors: {
    brand: brandColors,
    gray: {
      50: 'var(--team-surface-100)',
      100: 'var(--team-surface-200)',
      200: 'var(--team-surface-300)',
      300: 'var(--team-surface-400)',
      400: 'var(--team-surface-500)',
      500: 'var(--team-surface-600)',
      600: 'var(--team-surface-700)',
      700: 'var(--team-surface-800)',
      800: 'var(--team-surface-900)',
      900: 'var(--team-secondary-900)',
    },
  },
  styles: {
    global: () => ({
      'html, body, #root': {
        height: '100%',
      },
      body: {
        bg: 'var(--team-surface-50)',
        color: 'var(--team-text-primary)',
      },
    }),
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: 'lg',
      },
      variants: {
        solid: {
          bg: 'brand.600',
          color: 'white',
          _hover: { bg: 'brand.700' },
        },
        outline: {
          borderColor: 'brand.600',
          color: 'brand.700',
          _hover: { bg: 'brand.50' },
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          borderRadius: 'xl',
          boxShadow: 'md',
          border: '1px solid',
          borderColor: 'var(--team-border-light)',
        },
      },
    },
  },
});

export default theme;
