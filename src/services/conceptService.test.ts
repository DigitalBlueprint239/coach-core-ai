import { getAllConcepts, getConceptById, getConceptsByCoverage } from './conceptService';

describe('conceptService', () => {
  it('has exactly 15 concept definitions', () => {
    expect(getAllConcepts()).toHaveLength(15);
  });

  it('has no duplicate IDs', () => {
    const ids = getAllConcepts().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every concept has required schema fields', () => {
    for (const concept of getAllConcepts()) {
      expect(concept.id).toBeTruthy();
      expect(concept.name).toBeTruthy();
      expect(Array.isArray(concept.requiredRoutes)).toBe(true);
      expect(concept.requiredRoutes.length).toBeGreaterThan(0);
      expect(typeof concept.minMatchCount).toBe('number');
      expect(concept.minMatchCount).toBeGreaterThan(0);
      expect(Array.isArray(concept.coverageBeaters)).toBe(true);
      expect(concept.coverageBeaters.length).toBeGreaterThan(0);
      expect(concept.coachingCue).toBeTruthy();
      expect(typeof concept.priority).toBe('number');
    }
  });

  it('getConceptById returns correct concept', () => {
    const smash = getConceptById('smash');
    expect(smash).toBeDefined();
    expect(smash!.name).toBe('Smash');
  });

  it('getConceptById returns undefined for unknown ID', () => {
    expect(getConceptById('nonexistent')).toBeUndefined();
  });

  it('getConceptsByCoverage returns concepts that beat cover_2', () => {
    const beaters = getConceptsByCoverage('cover_2');
    expect(beaters.length).toBeGreaterThan(0);
    expect(beaters.some((c) => c.id === 'smash')).toBe(true);
  });

  it('Y-Cross concept loads without error', () => {
    expect(getConceptById('y_cross')).toBeDefined();
  });

  it('Mills concept loads without error', () => {
    expect(getConceptById('mills')).toBeDefined();
  });

  it('Four Verticals concept loads without error', () => {
    expect(getConceptById('four_verticals')).toBeDefined();
  });

  it('Sail concept loads without error', () => {
    expect(getConceptById('sail')).toBeDefined();
  });

  it('Snag concept loads without error', () => {
    expect(getConceptById('snag')).toBeDefined();
  });

  it('Curl-Flat concept loads without error', () => {
    expect(getConceptById('curl_flat')).toBeDefined();
  });

  it('every concept has at least one coverage beater', () => {
    for (const concept of getAllConcepts()) {
      expect(concept.coverageBeaters.length).toBeGreaterThan(0);
    }
  });
});
