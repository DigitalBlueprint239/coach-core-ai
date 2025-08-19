import { extendTheme, ThemeConfig, type ThemeComponents } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

// Modern color palette with better contrast and accessibility
const colors = {
  // Primary brand colors
  brand: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  
  // Sports-specific colors
  sports: {
    field: {
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
    court: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
    },
    track: {
      50: '#fefce8',
      100: '#fef9c3',
      200: '#fef08a',
      300: '#fde047',
      400: '#facc15',
      500: '#eab308',
      600: '#ca8a04',
      700: '#a16207',
      800: '#854d0e',
      900: '#713f12',
    }
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

// Enhanced typography
const fonts = {
  heading: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  body: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  mono: 'JetBrains Mono, SF Mono, Monaco, Inconsolata, "Roboto Mono", monospace',
};

// Enhanced component styles
const components: ThemeComponents = {
  Button: {
    baseStyle: {
      fontWeight: 'semibold',
      borderRadius: 'lg',
      _focus: {
        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
      },
    },
    variants: {
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
      gradient: {
        bgGradient: 'linear(to-r, brand.500, brand.600)',
        color: 'white',
        _hover: {
          bgGradient: 'linear(to-r, brand.600, brand.700)',
          transform: 'translateY(-1px)',
          boxShadow: 'lg',
        },
      },
    },
    sizes: {
      sm: {
        px: 3,
        py: 2,
        fontSize: 'sm',
      },
      md: {
        px: 4,
        py: 2.5,
        fontSize: 'md',
      },
      lg: {
        px: 6,
        py: 3,
        fontSize: 'lg',
      },
    },
  },
  
  Card: {
    baseStyle: {
      container: {
        borderRadius: 'xl',
        boxShadow: 'sm',
        border: '1px solid',
        borderColor: 'gray.200',
        bg: 'white',
        _hover: {
          boxShadow: 'md',
          transform: 'translateY(-2px)',
          transition: 'all 0.2s ease-in-out',
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
        borderRadius: 'lg',
        border: '2px solid',
        borderColor: 'gray.200',
        _focus: {
          borderColor: 'brand.500',
          boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
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
        bg: 'brand.100',
        color: 'brand.800',
      },
      outline: {
        border: '1px solid',
        borderColor: 'brand.200',
        color: 'brand.700',
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

// Enhanced shadows
const shadows = {
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  outline: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  none: 'none',
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
      bg: 'gray.50',
      color: 'gray.900',
      fontFamily: 'body',
      lineHeight: 'base',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
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
      bg: 'gray.300',
      borderRadius: '4px',
      '&:hover': {
        bg: 'gray.400',
      },
    },
  }),
};

export const enhancedTheme = extendTheme({
  config,
  colors,
  fonts,
  components,
  space,
  shadows,
  breakpoints,
  styles,
});

export default enhancedTheme;
