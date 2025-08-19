import { extendTheme, ThemeConfig, type ThemeComponents } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: true,
};

// Unified color palette with better contrast and accessibility
const colors = {
  // Primary brand colors (from brandTheme)
  primary: {
    50: '#e6ffff',
    100: '#b3ffff',
    200: '#80ffff',
    300: '#4dffff',
    400: '#1affff',
    500: '#00cccc',
    600: '#009999',
    700: '#006666',
    800: '#004d4d',
    900: '#003333',
  },
  
  // Brand alias for compatibility
  brand: {
    50: '#e6ffff',
    100: '#b3ffff',
    200: '#80ffff',
    300: '#4dffff',
    400: '#1affff',
    500: '#00cccc',
    600: '#009999',
    700: '#006666',
    800: '#004d4d',
    900: '#003333',
  },
  
  // Dark backgrounds (from brandTheme)
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
    900: '#1a1d20',
    950: '#0d1117',
  },
  
  // Semantic colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  
  // Inclusive color palette
  inclusive: {
    blue: '#0d6efd',
    green: '#198754',
    purple: '#6f42c1',
    orange: '#fd7e14',
    pink: '#d63384',
    teal: '#20c997',
  },
  
  // Neutral colors
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  }
};

// Modern typography
const fonts = {
  heading: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  mono: '"JetBrains Mono", "Fira Code", Consolas, "Liberation Mono", Menlo, Courier, monospace',
};

// Enhanced shadows with brand glow
const shadows = {
  'brand-glow': '0 0 20px rgba(0, 204, 204, 0.2)',
  'brand-glow-lg': '0 0 40px rgba(0, 204, 204, 0.3)',
  'brand-glow-xl': '0 0 60px rgba(0, 204, 204, 0.4)',
  'dark-glow': '0 0 20px rgba(26, 29, 32, 0.6)',
  'inclusive-glow': '0 0 20px rgba(13, 110, 253, 0.15)',
};

// Enhanced component styles
const components: ThemeComponents = {
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
      'inclusive': {
        bg: 'inclusive.blue',
        color: 'white',
        _hover: {
          bg: 'inclusive.purple',
          transform: 'translateY(-2px)',
        },
      },
      solid: {
        bg: 'brand.600',
        color: 'white',
        _hover: {
          bg: 'brand.700',
          transform: 'translateY(-1px)',
          boxShadow: 'lg',
        },
        _active: {
          bg: 'brand.800',
          transform: 'translateY(0)',
        },
      },
      outline: {
        border: '2px solid',
        borderColor: 'brand.600',
        color: 'brand.700',
        _hover: {
          bg: 'brand.50',
          borderColor: 'brand.700',
        },
      },
      ghost: {
        color: 'gray.700',
        _hover: {
          bg: 'gray.100',
        },
      },
    },
    defaultProps: {
      variant: 'brand-primary',
    },
  },
  
  Card: {
    parts: ['container'],
    baseStyle: {
      container: {
        borderRadius: '2xl',
        boxShadow: 'sm',
        border: '1px solid',
        borderColor: 'gray.200',
        bg: 'white',
        _hover: {
          boxShadow: 'md',
          transform: 'translateY(-2px)',
          transition: 'all 0.2s ease-in-out',
        },
        _dark: {
          bg: 'dark.800',
          borderColor: 'dark.700',
        },
      },
    },
    variants: {
      elevated: {
        container: {
          boxShadow: 'lg',
          border: 'none',
        },
      },
      outline: {
        container: {
          boxShadow: 'none',
          border: '2px solid',
          borderColor: 'gray.200',
        },
      },
    },
  },
  
  Input: {
    baseStyle: {
      field: {
        borderRadius: 'xl',
        border: '2px solid',
        borderColor: 'gray.200',
        _focus: {
          borderColor: 'primary.500',
          boxShadow: 'brand-glow',
        },
        _hover: {
          borderColor: 'gray.300',
        },
      },
    },
  },
  
  Modal: {
    baseStyle: {
      dialog: {
        borderRadius: 'xl',
        boxShadow: '2xl',
      },
      header: {
        fontWeight: 'bold',
        fontSize: 'xl',
      },
    },
  },
  
  Badge: {
    baseStyle: {
      borderRadius: 'full',
      fontWeight: 'medium',
      textTransform: 'none',
    },
    variants: {
      solid: {
        bg: 'primary.100',
        color: 'primary.800',
      },
      outline: {
        border: '1px solid',
        borderColor: 'primary.200',
        color: 'primary.700',
      },
    },
  },
};

// Enhanced spacing and sizing
const space = {
  px: '1px',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  28: '7rem',
  32: '8rem',
  36: '9rem',
  40: '10rem',
  44: '11rem',
  48: '12rem',
  52: '13rem',
  56: '14rem',
  60: '15rem',
  64: '16rem',
  72: '18rem',
  80: '20rem',
  96: '24rem',
};

// Enhanced breakpoints
const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// Enhanced global styles
const styles = {
  global: (props: any) => ({
    'html, body, #root': {
      height: '100%',
    },
    body: {
      bg: 'dark.50',
      color: 'dark.900',
      fontFamily: 'body',
      lineHeight: 'base',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
      _dark: {
        bg: 'dark.950',
        color: 'dark.50',
      },
    },
    '*::placeholder': {
      color: 'gray.400',
    },
    '*, *::before, &::after': {
      borderColor: 'gray.200',
    },
    '::-webkit-scrollbar': {
      width: '8px',
      height: '8px',
    },
    '::-webkit-scrollbar-track': {
      bg: 'gray.100',
      borderRadius: '4px',
    },
    '::-webkit-scrollbar-thumb': {
      bg: 'primary.500',
      borderRadius: '4px',
      '&:hover': {
        bg: 'primary.600',
      },
    },
  }),
};

export const unifiedTheme = extendTheme({
  config,
  colors,
  fonts,
  components,
  space,
  shadows,
  breakpoints,
  styles,
});

export default unifiedTheme;
