import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';

// Core theme interfaces
export interface TeamBranding {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logo?: string;
  logoMark?: string;
  teamName: string;
  mascot?: string;
  heroImage?: string;
  avatarFrame?: string;
}

export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

export interface TeamTheme {
  id: string;
  teamId: string;
  branding: TeamBranding;
  colors: {
    primary: ColorScale;
    secondary: ColorScale;
    accent: ColorScale;
    background: ColorScale;
    surface: ColorScale;
  };
  gradients: {
    primary: string;
    secondary: string;
    hero: string;
  };
  preferences: {
    darkMode: boolean;
    compactMode: boolean;
    animations: boolean;
    sounds: boolean;
  };
}

export interface UserPreferences {
  nickname?: string;
  avatar?: string;
  position?: string;
  jerseyNumber?: string;
  preferredView: 'player' | 'coach' | 'parent';
  notifications: NotificationPreferences;
  accessibility: AccessibilitySettings;
}

interface NotificationPreferences {
  practice: boolean;
  game: boolean;
  achievement: boolean;
  teamUpdate: boolean;
  email: boolean;
  push: boolean;
}

interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
}

interface ThemeContextType {
  theme: TeamTheme | null;
  userPreferences: UserPreferences | null;
  setTheme: (theme: TeamTheme) => void;
  setUserPreferences: (prefs: UserPreferences) => void;
  applyThemeToDOM: (theme: TeamTheme) => void;
  generateColorScale: (baseColor: string) => ColorScale;
  generateTeamPalette: (primaryColor: string, secondaryColor: string) => any;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Default Coach Core branding
const DEFAULT_BRANDING: TeamBranding = {
  primaryColor: '#00D4FF',
  secondaryColor: '#0A1628',
  accentColor: '#00A8CC',
  teamName: 'Coach Core AI',
  logo: '/logo.png',
  logoMark: '/logo-mark.png',
};

// Default theme
const DEFAULT_THEME: TeamTheme = {
  id: 'default',
  teamId: 'coach-core',
  branding: DEFAULT_BRANDING,
  colors: {
    primary: {
      50: '#E6FBFF',
      100: '#CCF7FF',
      200: '#99EFFF',
      300: '#66E7FF',
      400: '#33DFFF',
      500: '#00D4FF',
      600: '#00A8CC',
      700: '#007C99',
      800: '#005066',
      900: '#002433',
    },
    secondary: {
      50: '#E6E8EB',
      100: '#CCD1D7',
      200: '#99A3AF',
      300: '#667587',
      400: '#33475F',
      500: '#0A1628',
      600: '#08121F',
      700: '#060E16',
      800: '#040A0D',
      900: '#020506',
    },
    accent: {
      50: '#E6F7FF',
      100: '#CCEFFF',
      200: '#99DFFF',
      300: '#66CFFF',
      400: '#33BFFF',
      500: '#00A8CC',
      600: '#0086A3',
      700: '#00647A',
      800: '#004251',
      900: '#002128',
    },
    background: {
      50: '#FFFFFF',
      100: '#F8F9FA',
      200: '#E9ECEF',
      300: '#DEE2E6',
      400: '#CED4DA',
      500: '#ADB5BD',
      600: '#6C757D',
      700: '#495057',
      800: '#343A40',
      900: '#212529',
    },
    surface: {
      50: '#FFFFFF',
      100: '#F8F9FA',
      200: '#E9ECEF',
      300: '#DEE2E6',
      400: '#CED4DA',
      500: '#ADB5BD',
      600: '#6C757D',
      700: '#495057',
      800: '#343A40',
      900: '#212529',
    },
  },
  gradients: {
    primary: 'linear-gradient(135deg, #00D4FF 0%, #0A1628 100%)',
    secondary: 'linear-gradient(135deg, #00A8CC 0%, #0A1628 100%)',
    hero: 'linear-gradient(135deg, #00D4FF 0%, #00A8CC 100%)',
  },
  preferences: {
    darkMode: false,
    compactMode: false,
    animations: true,
    sounds: true,
  },
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [theme, setThemeState] = useState<TeamTheme>(DEFAULT_THEME);
  const [userPreferences, setUserPreferencesState] =
    useState<UserPreferences | null>(null);

  // Generate color scale from base color
  const generateColorScale = (baseColor: string): ColorScale => {
    // Simple color manipulation without external library
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : null;
    };

    const rgbToHex = (r: number, g: number, b: number) => {
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    };

    const mixColor = (color1: string, color2: string, weight: number) => {
      const rgb1 = hexToRgb(color1);
      const rgb2 = hexToRgb(color2);
      if (!rgb1 || !rgb2) return color1;

      const r = Math.round(rgb1.r * (1 - weight) + rgb2.r * weight);
      const g = Math.round(rgb1.g * (1 - weight) + rgb2.g * weight);
      const b = Math.round(rgb1.b * (1 - weight) + rgb2.b * weight);

      return rgbToHex(r, g, b);
    };

    return {
      50: mixColor(baseColor, '#FFFFFF', 0.95),
      100: mixColor(baseColor, '#FFFFFF', 0.9),
      200: mixColor(baseColor, '#FFFFFF', 0.8),
      300: mixColor(baseColor, '#FFFFFF', 0.6),
      400: mixColor(baseColor, '#FFFFFF', 0.4),
      500: baseColor,
      600: mixColor(baseColor, '#000000', 0.2),
      700: mixColor(baseColor, '#000000', 0.4),
      800: mixColor(baseColor, '#000000', 0.6),
      900: mixColor(baseColor, '#000000', 0.8),
    };
  };

  // Generate intelligent team palette
  const generateTeamPalette = (
    primaryColor: string,
    secondaryColor: string
  ) => {
    // Simple color manipulation functions
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : null;
    };

    const rgbToHex = (r: number, g: number, b: number) => {
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    };

    const mixColor = (color1: string, color2: string, weight: number) => {
      const rgb1 = hexToRgb(color1);
      const rgb2 = hexToRgb(color2);
      if (!rgb1 || !rgb2) return color1;

      const r = Math.round(rgb1.r * (1 - weight) + rgb2.r * weight);
      const g = Math.round(rgb1.g * (1 - weight) + rgb2.g * weight);
      const b = Math.round(rgb1.b * (1 - weight) + rgb2.b * weight);

      return rgbToHex(r, g, b);
    };

    // Generate a simple accent color by rotating hue
    const generateAccent = (color: string) => {
      const rgb = hexToRgb(color);
      if (!rgb) return '#00A8CC';

      // Simple hue rotation by adjusting RGB values
      const newR = Math.min(255, rgb.r + 50);
      const newG = Math.min(255, rgb.g + 30);
      const newB = Math.min(255, rgb.b + 40);

      return rgbToHex(newR, newG, newB);
    };

    const accentColor = generateAccent(primaryColor);

    return {
      primary: generateColorScale(primaryColor),
      secondary: generateColorScale(secondaryColor),
      accent: generateColorScale(accentColor),
      semantic: {
        success: mixColor('#10B981', primaryColor, 0.2),
        warning: mixColor('#F59E0B', primaryColor, 0.1),
        error: mixColor('#EF4444', secondaryColor, 0.1),
      },
    };
  };

  // Apply theme to DOM
  const applyThemeToDOM = (theme: TeamTheme) => {
    const root = document.documentElement;

    // Apply team colors
    root.style.setProperty('--team-primary', theme.branding.primaryColor);
    root.style.setProperty('--team-secondary', theme.branding.secondaryColor);
    root.style.setProperty('--team-accent', theme.branding.accentColor);

    // Apply color scales
    Object.entries(theme.colors.primary).forEach(([key, value]) => {
      root.style.setProperty(`--team-primary-${key}`, value);
    });

    Object.entries(theme.colors.secondary).forEach(([key, value]) => {
      root.style.setProperty(`--team-secondary-${key}`, value);
    });

    Object.entries(theme.colors.accent).forEach(([key, value]) => {
      root.style.setProperty(`--team-accent-${key}`, value);
    });

    // Apply gradients
    root.style.setProperty('--team-gradient-primary', theme.gradients.primary);
    root.style.setProperty(
      '--team-gradient-secondary',
      theme.gradients.secondary
    );
    root.style.setProperty('--team-gradient-hero', theme.gradients.hero);

    // Apply preferences
    root.style.setProperty(
      '--team-animations',
      theme.preferences.animations ? '1' : '0'
    );
    root.style.setProperty(
      '--team-sounds',
      theme.preferences.sounds ? '1' : '0'
    );

    // Update favicon if team has custom logo
    if (theme.branding.logoMark) {
      updateFavicon(theme.branding.logoMark);
    }

    // Update document title
    document.title = `${theme.branding.teamName} - Coach Core AI`;
  };

  // Update favicon dynamically
  const updateFavicon = (logoUrl: string) => {
    const link =
      (document.querySelector("link[rel*='icon']") as HTMLLinkElement) ||
      document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = logoUrl;
    document.getElementsByTagName('head')[0].appendChild(link);
  };

  // Set theme and apply to DOM
  const setTheme = (newTheme: TeamTheme) => {
    setThemeState(newTheme);
    applyThemeToDOM(newTheme);
  };

  // Set user preferences
  const setUserPreferences = (prefs: UserPreferences) => {
    setUserPreferencesState(prefs);

    // Apply accessibility settings
    const root = document.documentElement;
    root.style.setProperty(
      '--high-contrast',
      prefs.accessibility.highContrast ? '1' : '0'
    );
    root.style.setProperty(
      '--large-text',
      prefs.accessibility.largeText ? '1' : '0'
    );
    root.style.setProperty(
      '--reduced-motion',
      prefs.accessibility.reducedMotion ? '1' : '0'
    );
  };

  // Load team theme on mount
  useEffect(() => {
    // TODO: Load from Firebase based on user's team
    // For now, apply default theme
    applyThemeToDOM(theme);
  }, []);

  const value: ThemeContextType = {
    theme,
    userPreferences,
    setTheme,
    setUserPreferences,
    applyThemeToDOM,
    generateColorScale,
    generateTeamPalette,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
