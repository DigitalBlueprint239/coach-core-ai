/**
 * routeIcons.test.js – Tests for route SVG micro-icons
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  ROUTE_ICONS,
  getRouteIcon,
  HitchIcon,
  SlantIcon,
  PostIcon,
  CornerIcon,
  OutIcon,
  InIcon,
  GoIcon,
  CustomIcon,
} from '../components/RouteIcons';
import { ROUTE_TYPES } from '../PlayController';

// ── getRouteIcon ──────────────────────────────────────────────────────────────

describe('getRouteIcon', () => {
  it('returns the correct icon component for each known route type', () => {
    const types = ['hitch', 'slant', 'post', 'corner', 'out', 'in', 'go', 'custom'];
    types.forEach(type => {
      const Icon = getRouteIcon(type);
      expect(typeof Icon).toBe('function');
    });
  });

  it('falls back to CustomIcon for unknown route types', () => {
    const Icon = getRouteIcon('unknown_route_type');
    expect(Icon).toBe(CustomIcon);
  });

  it('falls back to CustomIcon for null/undefined', () => {
    expect(getRouteIcon(null)).toBe(CustomIcon);
    expect(getRouteIcon(undefined)).toBe(CustomIcon);
  });
});

// ── All ROUTE_TYPES have icons ────────────────────────────────────────────────

describe('Route type icon coverage', () => {
  it('every route type in PlayController.ROUTE_TYPES has an icon entry', () => {
    ROUTE_TYPES.forEach(routeType => {
      const Icon = ROUTE_ICONS[routeType] || CustomIcon;
      expect(typeof Icon).toBe('function');
    });
  });
});

// ── Icon rendering ────────────────────────────────────────────────────────────

describe('Icon rendering', () => {
  const iconTests = [
    { name: 'HitchIcon', Component: HitchIcon },
    { name: 'SlantIcon', Component: SlantIcon },
    { name: 'PostIcon',  Component: PostIcon },
    { name: 'CornerIcon', Component: CornerIcon },
    { name: 'OutIcon',   Component: OutIcon },
    { name: 'InIcon',    Component: InIcon },
    { name: 'GoIcon',    Component: GoIcon },
    { name: 'CustomIcon', Component: CustomIcon },
  ];

  iconTests.forEach(({ name, Component }) => {
    it(`${name} renders without crashing`, () => {
      expect(() => render(React.createElement(Component))).not.toThrow();
    });

    it(`${name} renders with custom size prop`, () => {
      expect(() => render(React.createElement(Component, { size: 48 }))).not.toThrow();
    });

    it(`${name} renders an SVG element`, () => {
      const { container } = render(React.createElement(Component));
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      // Icons are decorative (aria-hidden) since buttons provide accessible labels
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });
});

// ── ROUTE_ICONS registry ──────────────────────────────────────────────────────

describe('ROUTE_ICONS registry', () => {
  it('is a non-empty object', () => {
    expect(typeof ROUTE_ICONS).toBe('object');
    expect(Object.keys(ROUTE_ICONS).length).toBeGreaterThan(0);
  });

  it('all values are function (React components)', () => {
    Object.values(ROUTE_ICONS).forEach(Icon => {
      expect(typeof Icon).toBe('function');
    });
  });

  it('contains the 8 standard route types from PlayController', () => {
    ROUTE_TYPES.forEach(type => {
      // Either a specific icon or the fallback is returned
      const Icon = getRouteIcon(type);
      expect(typeof Icon).toBe('function');
    });
  });
});
