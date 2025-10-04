// Responsive Design System
// Mobile-first approach with progressive enhancement

// Breakpoints (following Chakra UI's default breakpoints)
export const BREAKPOINTS = {
  base: '0em', // 0px
  sm: '30em', // 480px
  md: '48em', // 768px
  lg: '62em', // 992px
  xl: '80em', // 1280px
  '2xl': '96em', // 1536px
} as const;

// Responsive spacing scale
export const RESPONSIVE_SPACING = {
  xs: { base: 2, sm: 3, md: 4, lg: 4, xl: 4 },
  sm: { base: 3, sm: 4, md: 5, lg: 6, xl: 6 },
  md: { base: 4, sm: 5, md: 6, lg: 8, xl: 8 },
  lg: { base: 6, sm: 8, md: 10, lg: 12, xl: 12 },
  xl: { base: 8, sm: 10, md: 12, lg: 16, xl: 16 },
  '2xl': { base: 10, sm: 12, md: 16, lg: 20, xl: 24 },
  '3xl': { base: 12, sm: 16, md: 20, lg: 24, xl: 32 },
  '4xl': { base: 16, sm: 20, md: 24, lg: 32, xl: 40 },
} as const;

// Responsive typography scale
export const RESPONSIVE_FONTS = {
  xs: { base: 'xs', sm: 'xs', md: 'sm', lg: 'sm', xl: 'sm' },
  sm: { base: 'sm', sm: 'sm', md: 'md', lg: 'md', xl: 'md' },
  md: { base: 'md', sm: 'md', md: 'lg', lg: 'lg', xl: 'lg' },
  lg: { base: 'lg', sm: 'lg', md: 'xl', lg: 'xl', xl: 'xl' },
  xl: { base: 'xl', sm: 'xl', md: '2xl', lg: '2xl', xl: '2xl' },
  '2xl': { base: '2xl', sm: '2xl', md: '3xl', lg: '3xl', xl: '3xl' },
  '3xl': { base: '3xl', sm: '3xl', md: '4xl', lg: '4xl', xl: '4xl' },
  '4xl': { base: '4xl', sm: '4xl', md: '5xl', lg: '5xl', xl: '5xl' },
} as const;

// Responsive grid columns
export const RESPONSIVE_GRIDS = {
  '1': { base: 1, sm: 1, md: 1, lg: 1, xl: 1 },
  '2': { base: 1, sm: 1, md: 2, lg: 2, xl: 2 },
  '3': { base: 1, sm: 2, md: 2, lg: 3, xl: 3 },
  '4': { base: 1, sm: 2, md: 2, lg: 4, xl: 4 },
  '5': { base: 1, sm: 2, md: 3, lg: 5, xl: 5 },
  '6': { base: 2, sm: 2, md: 3, lg: 6, xl: 6 },
  '12': { base: 6, sm: 6, md: 12, lg: 12, xl: 12 },
} as const;

// Responsive container widths
export const RESPONSIVE_CONTAINERS = {
  sm: { base: '100%', sm: '540px', md: '720px', lg: '960px', xl: '1140px' },
  md: { base: '100%', sm: '100%', md: '720px', lg: '960px', xl: '1140px' },
  lg: { base: '100%', sm: '100%', md: '100%', lg: '960px', xl: '1140px' },
  xl: { base: '100%', sm: '100%', md: '100%', lg: '100%', xl: '1140px' },
  full: { base: '100%', sm: '100%', md: '100%', lg: '100%', xl: '100%' },
} as const;

// Responsive padding scales
export const RESPONSIVE_PADDING = {
  page: { base: 4, sm: 6, md: 8, lg: 12, xl: 16 },
  section: { base: 6, sm: 8, md: 12, lg: 16, xl: 20 },
  card: { base: 4, sm: 5, md: 6, lg: 8, xl: 8 },
  button: {
    base: '12px 16px',
    sm: '14px 18px',
    md: '16px 20px',
    lg: '18px 24px',
    xl: '18px 24px',
  },
} as const;

// Responsive margin scales
export const RESPONSIVE_MARGIN = {
  section: { base: 8, sm: 10, md: 12, lg: 16, xl: 20 },
  component: { base: 4, sm: 5, md: 6, lg: 8, xl: 8 },
  element: { base: 2, sm: 3, md: 4, lg: 4, xl: 4 },
} as const;

// Touch-friendly sizing for mobile
export const TOUCH_SIZES = {
  button: { base: '44px', sm: '44px', md: '40px', lg: '40px', xl: '40px' },
  icon: { base: '20px', sm: '20px', md: '18px', lg: '18px', xl: '18px' },
  input: { base: '48px', sm: '48px', md: '44px', lg: '44px', xl: '44px' },
  avatar: { base: '48px', sm: '48px', md: '40px', lg: '40px', xl: '40px' },
} as const;

// Mobile-specific utilities
export const MOBILE_UTILS = {
  safeArea: {
    paddingTop: 'env(safe-area-inset-top)',
    paddingBottom: 'env(safe-area-inset-bottom)',
    paddingLeft: 'env(safe-area-inset-left)',
    paddingRight: 'env(safe-area-inset-right)',
  },
  touchTarget: {
    minHeight: '44px',
    minWidth: '44px',
  },
  swipeArea: {
    minHeight: '60px',
    minWidth: '60px',
  },
} as const;

// Responsive hook for easy usage
export const useResponsive = () => {
  const getResponsiveValue = <T>(
    responsiveObject: Record<string, T>,
    defaultValue?: T
  ): T => {
    // This would typically use a hook like useBreakpointValue
    // For now, return the base value
    return responsiveObject.base || defaultValue || responsiveObject.lg;
  };

  const getSpacing = (size: keyof typeof RESPONSIVE_SPACING) =>
    getResponsiveValue(RESPONSIVE_SPACING[size]);

  const getFontSize = (size: keyof typeof RESPONSIVE_FONTS) =>
    getResponsiveValue(RESPONSIVE_FONTS[size]);

  const getGridColumns = (size: keyof typeof RESPONSIVE_GRIDS) =>
    getResponsiveValue(RESPONSIVE_GRIDS[size]);

  const getContainerWidth = (size: keyof typeof RESPONSIVE_CONTAINERS) =>
    getResponsiveValue(RESPONSIVE_CONTAINERS[size]);

  const getPadding = (size: keyof typeof RESPONSIVE_PADDING) =>
    getResponsiveValue(RESPONSIVE_PADDING[size]);

  const getMargin = (size: keyof typeof RESPONSIVE_MARGIN) =>
    getResponsiveValue(RESPONSIVE_MARGIN[size]);

  const getTouchSize = (size: keyof typeof TOUCH_SIZES) =>
    getResponsiveValue(TOUCH_SIZES[size]);

  return {
    getSpacing,
    getFontSize,
    getGridColumns,
    getContainerWidth,
    getPadding,
    getMargin,
    getTouchSize,
    getResponsiveValue,
  };
};

// CSS-in-JS responsive utilities
export const responsiveStyles = {
  // Container styles
  container: {
    sm: { maxW: RESPONSIVE_CONTAINERS.sm },
    md: { maxW: RESPONSIVE_CONTAINERS.md },
    lg: { maxW: RESPONSIVE_CONTAINERS.lg },
    xl: { maxW: RESPONSIVE_CONTAINERS.xl },
    full: { maxW: RESPONSIVE_CONTAINERS.full },
  },

  // Grid styles
  grid: {
    '1': {
      gridTemplateColumns: { base: 'repeat(1, 1fr)', lg: 'repeat(1, 1fr)' },
    },
    '2': {
      gridTemplateColumns: { base: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' },
    },
    '3': {
      gridTemplateColumns: {
        base: 'repeat(1, 1fr)',
        sm: 'repeat(2, 1fr)',
        lg: 'repeat(3, 1fr)',
      },
    },
    '4': {
      gridTemplateColumns: {
        base: 'repeat(1, 1fr)',
        sm: 'repeat(2, 1fr)',
        lg: 'repeat(4, 1fr)',
      },
    },
    '6': {
      gridTemplateColumns: {
        base: 'repeat(2, 1fr)',
        md: 'repeat(3, 1fr)',
        lg: 'repeat(6, 1fr)',
      },
    },
    '12': {
      gridTemplateColumns: { base: 'repeat(6, 1fr)', md: 'repeat(12, 1fr)' },
    },
  },

  // Flex styles
  flex: {
    column: { flexDirection: { base: 'column', md: 'row' } },
    wrap: { flexWrap: { base: 'wrap', lg: 'nowrap' } },
    center: { justifyContent: 'center', alignItems: 'center' },
    between: { justifyContent: 'space-between', alignItems: 'center' },
    start: { justifyContent: 'flex-start', alignItems: 'center' },
    end: { justifyContent: 'flex-end', alignItems: 'center' },
  },

  // Spacing styles
  spacing: {
    page: { p: RESPONSIVE_PADDING.page },
    section: { p: RESPONSIVE_PADDING.section },
    card: { p: RESPONSIVE_PADDING.card },
    button: { px: { base: 4, md: 6 }, py: { base: 3, md: 4 } },
  },

  // Typography styles
  text: {
    h1: { fontSize: RESPONSIVE_FONTS['4xl'], fontWeight: 'bold' },
    h2: { fontSize: RESPONSIVE_FONTS['3xl'], fontWeight: 'bold' },
    h3: { fontSize: RESPONSIVE_FONTS['2xl'], fontWeight: 'semibold' },
    h4: { fontSize: RESPONSIVE_FONTS.xl, fontWeight: 'semibold' },
    body: { fontSize: RESPONSIVE_FONTS.md },
    small: { fontSize: RESPONSIVE_FONTS.sm },
    caption: { fontSize: RESPONSIVE_FONTS.xs },
  },

  // Button styles
  button: {
    primary: {
      size: { base: 'lg', md: 'md' },
      px: { base: 6, md: 8 },
      py: { base: 4, md: 3 },
      fontSize: { base: 'md', md: 'sm' },
    },
    secondary: {
      size: { base: 'md', md: 'sm' },
      px: { base: 5, md: 6 },
      py: { base: 3, md: 2 },
      fontSize: { base: 'sm', md: 'xs' },
    },
  },

  // Card styles
  card: {
    base: {
      p: RESPONSIVE_PADDING.card,
      m: RESPONSIVE_MARGIN.component,
      borderRadius: { base: 'lg', md: 'md' },
      boxShadow: { base: 'lg', md: 'sm' },
    },
    elevated: {
      p: RESPONSIVE_PADDING.card,
      m: RESPONSIVE_MARGIN.component,
      borderRadius: { base: 'xl', md: 'lg' },
      boxShadow: { base: '2xl', md: 'lg' },
    },
  },

  // Form styles
  form: {
    input: {
      size: { base: 'lg', md: 'md' },
      height: TOUCH_SIZES.input,
      fontSize: { base: 'md', md: 'sm' },
    },
    label: {
      fontSize: { base: 'md', md: 'sm' },
      mb: { base: 2, md: 1 },
    },
    helper: {
      fontSize: { base: 'sm', md: 'xs' },
      mt: { base: 2, md: 1 },
    },
  },

  // Navigation styles
  navigation: {
    mobile: {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      bg: 'white',
      borderTop: '1px solid',
      borderColor: 'gray.200',
      p: 2,
    },
    desktop: {
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      bg: 'white',
      borderBottom: '1px solid',
      borderColor: 'gray.200',
      p: 4,
    },
  },

  // Modal styles
  modal: {
    mobile: {
      size: 'full',
      borderRadius: 0,
      m: 0,
    },
    desktop: {
      size: 'xl',
      borderRadius: 'lg',
      m: 4,
    },
  },

  // Table styles
  table: {
    mobile: {
      display: 'block',
      overflowX: 'auto',
      whiteSpace: 'nowrap',
    },
    desktop: {
      display: 'table',
      width: '100%',
    },
  },
};

// Utility functions for responsive values
export const createResponsiveValue = <T>(
  base: T,
  ...values: T[]
): T | Record<string, T> => {
  if (values.length === 0) {
    return base;
  }
  
  const responsiveObject: Record<string, T> = { base };
  const breakpoints = ['sm', 'md', 'lg', 'xl'] as const;
  
  values.forEach((value, index) => {
    if (index < breakpoints.length) {
      responsiveObject[breakpoints[index]] = value;
    }
  });
  
  return responsiveObject;
};

export const getResponsiveValue = <T>(
  responsiveObject: Record<string, T>,
  breakpoint: string = 'base'
): T => {
  return responsiveObject[breakpoint] || responsiveObject.base || Object.values(responsiveObject)[0];
};

// Export all utilities
export default {
  BREAKPOINTS,
  RESPONSIVE_SPACING,
  RESPONSIVE_FONTS,
  RESPONSIVE_GRIDS,
  RESPONSIVE_CONTAINERS,
  RESPONSIVE_PADDING,
  RESPONSIVE_MARGIN,
  TOUCH_SIZES,
  MOBILE_UTILS,
  responsiveStyles,
  useResponsive,
  createResponsiveValue,
  getResponsiveValue,
};
