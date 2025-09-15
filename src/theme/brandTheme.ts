import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

// Brand colors matching the Coach Core logo with better contrast
const brandColors = {
  // Primary cyan from logo - adjusted for better contrast
  primary: {
    50: '#e6ffff',
    100: '#b3ffff',
    200: '#80ffff',
    300: '#4dffff',
    400: '#1affff',
    500: '#00cccc', // Darker cyan for better contrast
    600: '#009999',
    700: '#006666',
    800: '#004d4d',
    900: '#003333',
  },
  // Dark backgrounds like logo - softer for better readability
  dark: {
    50: '#f8f9fa',
    100: '#e9ecef',
    200: '#dee2e6',
    300: '#ced4da',
    400: '#adb5bd',
    500: '#6c757d',
    600: '#495057',
    700: '#343a40',
    800: '#212529',
    900: '#1a1d20', // Softer dark background
    950: '#0d1117',
  },
  // Accent colors for inclusivity - better contrast
  accent: {
    success: '#198754',
    warning: '#fd7e14',
    error: '#dc3545',
    info: '#0dcaf0',
  },
  // Inclusive color palette - improved contrast
  inclusive: {
    blue: '#0d6efd',
    green: '#198754',
    purple: '#6f42c1',
    orange: '#fd7e14',
    pink: '#d63384',
    teal: '#20c997',
  },
};

// Modern typography
const fonts = {
  heading:
    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  mono: '"JetBrains Mono", "Fira Code", Consolas, "Liberation Mono", Menlo, Courier, monospace',
};

// Inclusive spacing scale
const space = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
  '4xl': '6rem',
  '5xl': '8rem',
  '6xl': '12rem',
};

// Modern shadows with softer cyan glow
const shadows = {
  'brand-glow': '0 0 20px rgba(0, 204, 204, 0.2)',
  'brand-glow-lg': '0 0 40px rgba(0, 204, 204, 0.3)',
  'brand-glow-xl': '0 0 60px rgba(0, 204, 204, 0.4)',
  'dark-glow': '0 0 20px rgba(26, 29, 32, 0.6)',
  'inclusive-glow': '0 0 20px rgba(13, 110, 253, 0.15)',
};

// Inclusive component styles
const components = {
  Button: {
    baseStyle: {
      fontWeight: '600',
      borderRadius: 'xl',
      _focus: {
        boxShadow: 'brand-glow',
      },
    },
    variants: {
      'brand-primary': {
        bg: 'primary.500',
        color: 'white',
        _hover: {
          bg: 'primary.600',
          transform: 'translateY(-2px)',
          boxShadow: 'brand-glow-lg',
        },
        _active: {
          bg: 'primary.700',
          transform: 'translateY(0)',
        },
      },
      'brand-outline': {
        bg: 'transparent',
        color: 'primary.500',
        border: '2px solid',
        borderColor: 'primary.500',
        _hover: {
          bg: 'primary.500',
          color: 'white',
          boxShadow: 'brand-glow',
        },
      },
      inclusive: {
        bg: 'inclusive.blue',
        color: 'white',
        _hover: {
          bg: 'inclusive.purple',
          transform: 'translateY(-2px)',
        },
      },
    },
    defaultProps: {
      variant: 'brand-primary',
    },
  },
  Input: {
    baseStyle: {
      field: {
        borderRadius: 'xl',
        border: '2px solid',
        borderColor: 'dark.300',
        _focus: {
          borderColor: 'primary.500',
          boxShadow: 'brand-glow',
        },
        _hover: {
          borderColor: 'primary.400',
        },
      },
    },
  },
  Card: {
    baseStyle: {
      container: {
        borderRadius: '2xl',
        border: '1px solid',
        borderColor: 'dark.200',
        bg: 'white',
        _dark: {
          bg: 'dark.800',
          borderColor: 'dark.700',
        },
      },
    },
  },
};

// Inclusive color mode config
const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: true,
};

// Extended theme
const theme = extendTheme({
  config,
  colors: {
    ...brandColors,
    brand: brandColors.primary,
  },
  fonts,
  space,
  shadows,
  components,
  styles: {
    global: {
      body: {
        bg: 'dark.50',
        color: 'dark.900',
        _dark: {
          bg: 'dark.950',
          color: 'dark.50',
        },
      },
    },
  },
  // Inclusive design tokens
  semanticTokens: {
    colors: {
      'chakra-body-text': { _light: 'dark.900', _dark: 'dark.50' },
      'chakra-body-bg': { _light: 'dark.50', _dark: 'dark.950' },
      'chakra-border-color': { _light: 'dark.200', _dark: 'dark.700' },
    },
  },
});

export default theme;
export { brandColors, shadows };
