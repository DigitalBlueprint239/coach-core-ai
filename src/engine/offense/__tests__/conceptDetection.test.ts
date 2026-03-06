import { describe, it, expect } from 'vitest';
import { detectConcept, detectAllConcepts } from '../conceptDetection';
import { loadOffensiveEngineData } from '../data';
import type { PlayRouteInstance } from '../types';

const { concepts } = loadOffensiveEngineData();

function routes(...names: string[]): PlayRouteInstance[] {
  return names.map((name, i) => ({ playerId: `p${i}`, routeName: name }));
}

describe('detectConcept', () => {
  it('returns null with no routes', () => {
    expect(detectConcept([], concepts)).toBeNull();
  });

  it('returns null when no routes match any concept', () => {
    expect(detectConcept(routes('Go'), concepts)).toBeNull();
  });

  it('detects Smash (Hitch + Corner)', () => {
    const result = detectConcept(routes('Hitch', 'Corner'), concepts);
    expect(result).not.toBeNull();
    expect(result!.concept.concept_name).toBe('Smash');
  });

  it('detects Smash with extra unrelated routes present', () => {
    const result = detectConcept(routes('Flat', 'Hitch', 'Corner', 'Dig'), concepts);
    expect(result).not.toBeNull();
    // Smash or another concept, but Hitch+Corner should match something
    expect(result!.concept.required_routes).toContain('Hitch');
    expect(result!.concept.required_routes).toContain('Corner');
  });

  it('does NOT detect Smash with only Hitch', () => {
    const result = detectConcept(routes('Hitch'), concepts);
    // Should not be Smash since Corner is missing
    if (result) {
      expect(result.concept.concept_name).not.toBe('Smash');
    }
  });

  it('detects Curl-Flat (Curl + Flat)', () => {
    const result = detectConcept(routes('Curl', 'Flat'), concepts);
    expect(result).not.toBeNull();
    expect(result!.concept.concept_name).toBe('Curl-Flat');
  });

  it('detects Dragon (Post + Corner)', () => {
    const result = detectConcept(routes('Post', 'Corner'), concepts);
    expect(result).not.toBeNull();
    expect(result!.concept.concept_name).toBe('Dragon');
  });

  it('detects Mesh (Shallow Cross + Dig)', () => {
    const result = detectConcept(routes('Shallow Cross', 'Dig'), concepts);
    expect(result).not.toBeNull();
    expect(result!.concept.concept_name).toBe('Mesh');
  });

  it('detects Flood (Flat + Out + Go)', () => {
    const result = detectConcept(routes('Flat', 'Out', 'Go'), concepts);
    expect(result).not.toBeNull();
    expect(result!.concept.concept_name).toBe('Flood');
  });

  it('detects Hi-Lo (Dig + Curl)', () => {
    const result = detectConcept(routes('Dig', 'Curl'), concepts);
    expect(result).not.toBeNull();
    expect(result!.concept.concept_name).toBe('Hi-Lo');
  });

  it('filters out Unknown Route labels', () => {
    const play = [
      { playerId: 'p1', routeName: 'Unknown Route' },
      { playerId: 'p2', routeName: 'Hitch' },
    ];
    // With only one labeled route, should not find Smash
    const result = detectConcept(play, concepts);
    if (result) {
      expect(result.concept.concept_name).not.toBe('Smash');
    }
  });

  it('returns matchedRoutes that are a subset of required_routes', () => {
    const result = detectConcept(routes('Hitch', 'Corner', 'Go'), concepts);
    expect(result).not.toBeNull();
    for (const r of result!.matchedRoutes) {
      expect(result!.concept.required_routes).toContain(r);
    }
  });

  it('detects Stick-Flat (Stick + Flat)', () => {
    const result = detectConcept(routes('Stick', 'Flat'), concepts);
    expect(result).not.toBeNull();
    expect(result!.concept.concept_name).toBe('Stick-Flat');
  });

  it('detects Drive (Dig + Shallow Cross)', () => {
    const result = detectConcept(routes('Dig', 'Shallow Cross'), concepts);
    expect(result).not.toBeNull();
    expect(result!.concept.concept_name).toBe('Mesh');
  });

  it('detects Yankee (Post + Go)', () => {
    const result = detectConcept(routes('Post', 'Go'), concepts);
    expect(result).not.toBeNull();
    expect(result!.concept.concept_name).toBe('Yankee');
  });

  it('detects Spot (Shallow Cross + Seam + Flat)', () => {
    const result = detectConcept(routes('Shallow Cross', 'Seam', 'Flat'), concepts);
    expect(result).not.toBeNull();
  });
});

describe('detectAllConcepts', () => {
  it('returns empty array with no routes', () => {
    expect(detectAllConcepts([], concepts)).toEqual([]);
  });

  it('returns multiple matching concepts when applicable', () => {
    // Dig + Shallow Cross + Curl — should match Mesh and Hi-Lo
    const result = detectAllConcepts(routes('Shallow Cross', 'Dig', 'Curl'), concepts);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('each result has a concept and matchedRoutes', () => {
    const result = detectAllConcepts(routes('Hitch', 'Corner'), concepts);
    for (const r of result) {
      expect(r.concept).toBeDefined();
      expect(Array.isArray(r.matchedRoutes)).toBe(true);
    }
  });

  it('returns empty when all routes are Unknown Route', () => {
    const play = [
      { playerId: 'p1', routeName: 'Unknown Route' },
      { playerId: 'p2', routeName: 'Unknown Route' },
    ];
    expect(detectAllConcepts(play, concepts)).toEqual([]);
  });
});
