import { describe, it, expect } from 'vitest';
import { loadOffensiveEngineData } from '../data';

describe('loadOffensiveEngineData', () => {
  const data = loadOffensiveEngineData();

  describe('routes', () => {
    it('returns exactly 18 routes', () => {
      expect(data.routes).toHaveLength(18);
    });

    it('every route has required fields', () => {
      for (const r of data.routes) {
        expect(r.route_id, `${r.route_name} missing route_id`).toBeTruthy();
        expect(r.route_name, `route ${r.route_id} missing route_name`).toBeTruthy();
        expect(typeof r.depth_yards).toBe('number');
        expect(r.break_direction).toBeTruthy();
        expect(Array.isArray(r.tags)).toBe(true);
      }
    });

    it('routes numbered 0-9 are present (the standard tree)', () => {
      const treeNumbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      for (const n of treeNumbers) {
        const found = data.routes.some(r => r.route_number === n);
        expect(found, `No route with route_number ${n}`).toBe(true);
      }
    });

    it('all specialty routes have route_number -1', () => {
      const specialty = data.routes.filter(r => r.route_number === -1);
      expect(specialty.length).toBeGreaterThanOrEqual(1);
    });

    it('route IDs are unique', () => {
      const ids = data.routes.map(r => r.route_id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('route names are unique', () => {
      const names = data.routes.map(r => r.route_name);
      expect(new Set(names).size).toBe(names.length);
    });

    it('quick routes (0-2) have depth < 6 yards', () => {
      const quick = data.routes.filter(r => [0, 1, 2].includes(r.route_number));
      for (const r of quick) {
        expect(r.depth_yards).toBeLessThan(6);
      }
    });

    it('deep routes (7-9) have depth >= 14 yards', () => {
      const deep = data.routes.filter(r => [7, 8, 9].includes(r.route_number));
      for (const r of deep) {
        expect(r.depth_yards).toBeGreaterThanOrEqual(14);
      }
    });

    it('Slant route exists with inside break', () => {
      const slant = data.routes.find(r => r.route_name === 'Slant');
      expect(slant).toBeDefined();
      expect(slant!.break_direction).toBe('inside');
    });

    it('Go route is vertical', () => {
      const go = data.routes.find(r => r.route_name === 'Go');
      expect(go).toBeDefined();
      expect(go!.break_direction).toBe('vertical');
    });

    it('Post route exists with diagonal-in break', () => {
      const post = data.routes.find(r => r.route_name === 'Post');
      expect(post).toBeDefined();
      expect(post!.break_direction).toBe('diagonal-in');
    });

    it('Corner route exists with diagonal-out break', () => {
      const corner = data.routes.find(r => r.route_name === 'Corner');
      expect(corner).toBeDefined();
      expect(corner!.break_direction).toBe('diagonal-out');
    });
  });

  describe('concepts', () => {
    it('returns exactly 15 concepts', () => {
      expect(data.concepts).toHaveLength(15);
    });

    it('every concept has required fields', () => {
      for (const c of data.concepts) {
        expect(c.concept_id, `${c.concept_name} missing id`).toBeTruthy();
        expect(c.concept_name).toBeTruthy();
        expect(Array.isArray(c.required_routes)).toBe(true);
        expect(c.required_routes.length).toBeGreaterThan(0);
        expect(c.coaching_cue).toBeTruthy();
      }
    });

    it('concept IDs are unique', () => {
      const ids = data.concepts.map(c => c.concept_id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('Smash concept exists and requires Hitch + Corner', () => {
      const smash = data.concepts.find(c => c.concept_name === 'Smash');
      expect(smash).toBeDefined();
      expect(smash!.required_routes).toContain('Hitch');
      expect(smash!.required_routes).toContain('Corner');
    });

    it('Curl-Flat concept exists', () => {
      expect(data.concepts.find(c => c.concept_name === 'Curl-Flat')).toBeDefined();
    });

    it('Four Verticals concept exists', () => {
      expect(data.concepts.find(c => c.concept_name === 'Four Verticals')).toBeDefined();
    });

    it('all concept required_routes refer to known route names', () => {
      const routeNames = new Set(data.routes.map(r => r.route_name));
      for (const c of data.concepts) {
        for (const name of c.required_routes) {
          expect(routeNames.has(name), `Concept "${c.concept_name}" requires unknown route "${name}"`).toBe(true);
        }
      }
    });
  });

  describe('spacingRules', () => {
    it('has at least 2 spacing rules', () => {
      expect(data.spacingRules.length).toBeGreaterThanOrEqual(2);
    });

    it('every rule has a min_yards_apart and message', () => {
      for (const r of data.spacingRules) {
        expect(typeof r.min_yards_apart).toBe('number');
        expect(r.min_yards_apart).toBeGreaterThan(0);
        expect(r.message).toBeTruthy();
      }
    });

    it('horizontal-separation rule exists', () => {
      expect(data.spacingRules.find(r => r.context === 'horizontal-separation')).toBeDefined();
    });

    it('vertical-stack rule exists', () => {
      expect(data.spacingRules.find(r => r.context === 'vertical-stack')).toBeDefined();
    });
  });
});
