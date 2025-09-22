import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

// Modern design system configuration
const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

// Modern color palette
const colors = {
  // Brand colors - Professional blue gradient
  brand: {
    50: '#eff6ff',
    100: '#dbeafe', 
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // Primary brand
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  
  // Sports-specific colors
  sports: {
    football: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e', // Field green
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    basketball: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316', // Court orange
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
    },
    soccer: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9', // Sky blue
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
    },
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
  
  // Neutral grays
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
  },
};

// Modern typography
const fonts = {
  heading: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  mono: '"JetBrains Mono", "Fira Code", Consolas, "Liberation Mono", Menlo, Courier, monospace',
};

// Enhanced font sizes
const fontSizes = {
  xs: '0.75rem',    // 12px
  sm: '0.875rem',   // 14px
  md: '1rem',       // 16px
  lg: '1.125rem',   // 18px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem', // 36px
  '5xl': '3rem',    // 48px
  '6xl': '3.75rem', // 60px
  '7xl': '4.5rem',  // 72px
  '8xl': '6rem',    // 96px
  '9xl': '8rem',    // 128px
};

// Modern spacing scale
const space = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
  36: '9rem',       // 144px
  40: '10rem',      // 160px
  44: '11rem',      // 176px
  48: '12rem',      // 192px
  52: '13rem',      // 208px
  56: '14rem',      // 224px
  60: '15rem',      // 240px
  64: '16rem',      // 256px
  72: '18rem',      // 288px
  80: '20rem',      // 320px
  96: '24rem',      // 384px
};

// Modern breakpoints
const breakpoints = {
  base: '0px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// Enhanced shadows
const shadows = {
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  none: 'none',
  // Custom shadows
  'brand-glow': '0 0 0 3px rgba(59, 130, 246, 0.1)',
  'success-glow': '0 0 0 3px rgba(34, 197, 94, 0.1)',
  'warning-glow': '0 0 0 3px rgba(245, 158, 11, 0.1)',
  'error-glow': '0 0 0 3px rgba(239, 68, 68, 0.1)',
  'card-hover': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  'elevated': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
};

// Modern border radius
const radii = {
  none: '0',
  sm: '0.125rem',   // 2px
  base: '0.25rem',  // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
};

// Enhanced component styles
const components = {
  Button: {
    baseStyle: {
      fontWeight: '600',
      borderRadius: 'xl',
      transition: 'all 0.2s ease-in-out',
      _focus: {
        boxShadow: 'brand-glow',
      },
    },
    sizes: {
      sm: {
        h: '2rem',
        minW: '2rem',
        fontSize: 'sm',
        px: 3,
      },
      md: {
        h: '2.5rem',
        minW: '2.5rem',
        fontSize: 'md',
        px: 4,
      },
      lg: {
        h: '3rem',
        minW: '3rem',
        fontSize: 'lg',
        px: 6,
      },
    },
    variants: {
      solid: {
        bg: 'brand.500',
        color: 'white',
        _hover: {
          bg: 'brand.600',
          transform: 'translateY(-1px)',
          boxShadow: 'lg',
        },
        _active: {
          bg: 'brand.700',
          transform: 'translateY(0)',
        },
      },
      outline: {
        border: '2px solid',
        borderColor: 'brand.500',
        color: 'brand.500',
        bg: 'transparent',
        _hover: {
          bg: 'brand.50',
          borderColor: 'brand.600',
          color: 'brand.600',
        },
      },
      ghost: {
        color: 'brand.500',
        bg: 'transparent',
        _hover: {
          bg: 'brand.50',
          color: 'brand.600',
        },
      },
      'sports-football': {
        bg: 'sports.football.500',
        color: 'white',
        _hover: {
          bg: 'sports.football.600',
          transform: 'translateY(-1px)',
        },
      },
      'sports-basketball': {
        bg: 'sports.basketball.500',
        color: 'white',
        _hover: {
          bg: 'sports.basketball.600',
          transform: 'translateY(-1px)',
        },
      },
    },
    defaultProps: {
      variant: 'solid',
      size: 'md',
    },
  },

  Card: {
    baseStyle: {
      container: {
        borderRadius: '2xl',
        boxShadow: 'sm',
        border: '1px solid',
        borderColor: 'gray.200',
        bg: 'white',
        transition: 'all 0.2s ease-in-out',
        _hover: {
          boxShadow: 'card-hover',
          transform: 'translateY(-2px)',
        },
        _dark: {
          bg: 'gray.800',
          borderColor: 'gray.700',
        },
      },
    },
    variants: {
      elevated: {
        container: {
          boxShadow: 'elevated',
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
      'sports-card': {
        container: {
          borderLeft: '4px solid',
          borderLeftColor: 'brand.500',
          _hover: {
            borderLeftColor: 'brand.600',
          },
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
        bg: 'white',
        transition: 'all 0.2s ease-in-out',
        _focus: {
          borderColor: 'brand.500',
          boxShadow: 'brand-glow',
        },
        _hover: {
          borderColor: 'gray.300',
        },
        _invalid: {
          borderColor: 'error.500',
          boxShadow: 'error-glow',
        },
        _dark: {
          bg: 'gray.800',
          borderColor: 'gray.600',
        },
      },
    },
    sizes: {
      sm: {
        field: {
          h: '2rem',
          fontSize: 'sm',
        },
      },
      md: {
        field: {
          h: '2.5rem',
          fontSize: 'md',
        },
      },
      lg: {
        field: {
          h: '3rem',
          fontSize: 'lg',
        },
      },
    },
  },

  Modal: {
    baseStyle: {
      dialog: {
        borderRadius: '2xl',
        boxShadow: '2xl',
        bg: 'white',
        _dark: {
          bg: 'gray.800',
        },
      },
      header: {
        fontWeight: '700',
        fontSize: 'xl',
        color: 'gray.900',
        _dark: {
          color: 'white',
        },
      },
      body: {
        px: 6,
        py: 4,
      },
      footer: {
        px: 6,
        py: 4,
      },
    },
  },

  Badge: {
    baseStyle: {
      borderRadius: 'full',
      fontWeight: '600',
      textTransform: 'none',
      fontSize: 'sm',
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
        bg: 'transparent',
      },
      success: {
        bg: 'success.100',
        color: 'success.800',
      },
      warning: {
        bg: 'warning.100',
        color: 'warning.800',
      },
      error: {
        bg: 'error.100',
        color: 'error.800',
      },
    },
  },

  Heading: {
    baseStyle: {
      fontWeight: '700',
      color: 'gray.900',
      _dark: {
        color: 'white',
      },
    },
    sizes: {
      '4xl': {
        fontSize: '4xl',
        lineHeight: '1.1',
      },
      '3xl': {
        fontSize: '3xl',
        lineHeight: '1.2',
      },
      '2xl': {
        fontSize: '2xl',
        lineHeight: '1.3',
      },
      xl: {
        fontSize: 'xl',
        lineHeight: '1.4',
      },
      lg: {
        fontSize: 'lg',
        lineHeight: '1.5',
      },
    },
  },

  Text: {
    baseStyle: {
      color: 'gray.700',
      _dark: {
        color: 'gray.300',
      },
    },
  },
};

// Global styles
const styles = {
  global: {
    body: {
      bg: 'gray.50',
      color: 'gray.900',
      fontFamily: 'body',
      lineHeight: 'base',
      _dark: {
        bg: 'gray.900',
        color: 'white',
      },
    },
    '*': {
      borderColor: 'gray.200',
      _dark: {
        borderColor: 'gray.700',
      },
    },
    'html, body': {
      height: '100%',
    },
    '#root': {
      height: '100%',
    },
  },
};

// Animation keyframes
const keyframes = {
  fadeIn: {
    '0%': {
      opacity: '0',
      transform: 'translateY(10px)',
    },
    '100%': {
      opacity: '1',
      transform: 'translateY(0)',
    },
  },
  slideIn: {
    '0%': {
      transform: 'translateX(-100%)',
    },
    '100%': {
      transform: 'translateX(0)',
    },
  },
  pulse: {
    '0%, 100%': {
      opacity: '1',
    },
    '50%': {
      opacity: '0.5',
    },
  },
  bounce: {
    '0%, 100%': {
      transform: 'translateY(-25%)',
      animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
    },
    '50%': {
      transform: 'translateY(0)',
      animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
    },
  },
};

// Animation utilities
const animations = {
  fadeIn: 'fadeIn 0.5s ease-in-out',
  slideIn: 'slideIn 0.3s ease-out',
  pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  bounce: 'bounce 1s infinite',
};

// Create the theme
const theme = extendTheme({
  config,
  colors,
  fonts,
  fontSizes,
  space,
  breakpoints,
  shadows,
  radii,
  components,
  styles,
  keyframes,
  animations,
});

export default theme;

