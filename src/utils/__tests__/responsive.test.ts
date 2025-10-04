import { describe, it, expect } from 'vitest';
import {
  BREAKPOINTS,
  RESPONSIVE_SPACING,
  RESPONSIVE_FONTS,
  RESPONSIVE_GRIDS,
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
      expect(RESPONSIVE_SPACING.xs).toEqual({ base: 2, sm: 3, md: 4, lg: 4, xl: 4 });
      expect(RESPONSIVE_SPACING.sm).toEqual({ base: 3, sm: 4, md: 5, lg: 6, xl: 6 });
      expect(RESPONSIVE_SPACING.md).toEqual({ base: 4, sm: 5, md: 6, lg: 8, xl: 8 });
      expect(RESPONSIVE_SPACING.lg).toEqual({ base: 6, sm: 8, md: 10, lg: 12, xl: 12 });
      expect(RESPONSIVE_SPACING.xl).toEqual({ base: 8, sm: 10, md: 12, lg: 16, xl: 16 });
      expect(RESPONSIVE_SPACING['2xl']).toEqual({ base: 10, sm: 12, md: 16, lg: 20, xl: 24 });
    });
  });

  describe('RESPONSIVE_FONTS', () => {
    it('should have appropriate font sizes', () => {
      expect(RESPONSIVE_FONTS.xs).toEqual({ base: 'xs', sm: 'xs', md: 'sm', lg: 'sm', xl: 'sm' });
      expect(RESPONSIVE_FONTS.sm).toEqual({ base: 'sm', sm: 'sm', md: 'md', lg: 'md', xl: 'md' });
      expect(RESPONSIVE_FONTS.md).toEqual({ base: 'md', sm: 'md', md: 'lg', lg: 'lg', xl: 'lg' });
      expect(RESPONSIVE_FONTS.lg).toEqual({ base: 'lg', sm: 'lg', md: 'xl', lg: 'xl', xl: 'xl' });
      expect(RESPONSIVE_FONTS.xl).toEqual({ base: 'xl', sm: 'xl', md: '2xl', lg: '2xl', xl: '2xl' });
      expect(RESPONSIVE_FONTS['2xl']).toEqual({ base: '2xl', sm: '2xl', md: '3xl', lg: '3xl', xl: '3xl' });
    });
  });

  describe('RESPONSIVE_GRIDS', () => {
    it('should have valid grid templates', () => {
      expect(RESPONSIVE_GRIDS['1']).toEqual({ base: 1, sm: 1, md: 1, lg: 1, xl: 1 });
      expect(RESPONSIVE_GRIDS['2']).toEqual({ base: 1, sm: 1, md: 2, lg: 2, xl: 2 });
      expect(RESPONSIVE_GRIDS['3']).toEqual({ base: 1, sm: 2, md: 2, lg: 3, xl: 3 });
      expect(RESPONSIVE_GRIDS['4']).toEqual({ base: 1, sm: 2, md: 2, lg: 4, xl: 4 });
      expect(RESPONSIVE_GRIDS['6']).toEqual({ base: 2, sm: 2, md: 3, lg: 6, xl: 6 });
      expect(RESPONSIVE_GRIDS['12']).toEqual({ base: 6, sm: 6, md: 12, lg: 12, xl: 12 });
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
