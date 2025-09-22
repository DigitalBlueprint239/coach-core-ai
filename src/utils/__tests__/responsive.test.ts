import { describe, it, expect } from 'vitest';
import {
  BREAKPOINTS,
  RESPONSIVE_SPACING,
  RESPONSIVE_FONTS,
  RESPONSIVE_GRIDS,
  RESPONSIVE_GRID_TEMPLATES,
  createResponsiveValue,
  getResponsiveValue,
} from '../responsive';

describe('Responsive Utilities', () => {
  describe('BREAKPOINTS', () => {
    it('should have correct breakpoint values', () => {
      expect(BREAKPOINTS.base).toBe('0em');
      expect(BREAKPOINTS.sm).toBe('30em');
      expect(BREAKPOINTS.md).toBe('48em');
      expect(BREAKPOINTS.lg).toBe('62em');
      expect(BREAKPOINTS.xl).toBe('80em');
      expect(BREAKPOINTS['2xl']).toBe('96em');
    });
  });

  describe('RESPONSIVE_SPACING', () => {
    it('should have consistent spacing values', () => {
      expect(RESPONSIVE_SPACING.xs.base).toBe(2);
      expect(RESPONSIVE_SPACING.sm.base).toBe(3);
      expect(RESPONSIVE_SPACING.md.base).toBe(4);
      expect(RESPONSIVE_SPACING.lg.base).toBe(6);
      expect(RESPONSIVE_SPACING.xl.base).toBe(8);
      expect(RESPONSIVE_SPACING['2xl'].base).toBe(10);
    });
  });

  describe('RESPONSIVE_FONTS', () => {
    it('should have appropriate font sizes', () => {
      expect(RESPONSIVE_FONTS.xs.base).toBe('xs');
      expect(RESPONSIVE_FONTS.sm.base).toBe('sm');
      expect(RESPONSIVE_FONTS.md.base).toBe('md');
      expect(RESPONSIVE_FONTS.lg.base).toBe('lg');
      expect(RESPONSIVE_FONTS.xl.base).toBe('xl');
      expect(RESPONSIVE_FONTS['2xl'].base).toBe('2xl');
    });
  });

  describe('RESPONSIVE_GRIDS', () => {
    it('should have valid grid templates', () => {
      expect(RESPONSIVE_GRID_TEMPLATES.stats).toBe(
        'repeat(auto-fit, minmax(250px, 1fr))'
      );
      expect(RESPONSIVE_GRIDS['2'].base).toBe(1);
      expect(RESPONSIVE_GRIDS['3'].base).toBe(1);
      expect(RESPONSIVE_GRIDS['4'].base).toBe(1);
    });
  });

  describe('createResponsiveValue', () => {
    it('should create responsive value object when multiple values provided', () => {
      const result = createResponsiveValue('base', 'md', 'lg');
      expect(result).toEqual({ base: 'base', md: 'md', lg: 'lg' });
    });

    it('should return base value when no additional values provided', () => {
      const result = createResponsiveValue('base');
      expect(result).toBe('base');
    });
  });

  describe('getResponsiveValue', () => {
    it('should return correct value for breakpoint', () => {
      const values = { base: 'base', md: 'md', lg: 'lg' };
      expect(getResponsiveValue(values, 'base')).toBe('base');
      expect(getResponsiveValue(values, 'md')).toBe('md');
      expect(getResponsiveValue(values, 'lg')).toBe('lg');
    });

    it('should fallback to base when breakpoint not found', () => {
      const values = { base: 'base', lg: 'lg' };
      expect(getResponsiveValue(values, 'md')).toBe('base');
    });
  });
});
