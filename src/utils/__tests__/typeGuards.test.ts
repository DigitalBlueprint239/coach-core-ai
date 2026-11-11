/**
 * Type Guards Tests
 */

import { isPoint, isPlayer, isRoute, isPlay, assertPlay, assertPlayer } from '../typeGuards';

describe('isPoint', () => {
  it('returns true for valid point', () => {
    expect(isPoint({ x: 0, y: 0 })).toBe(true);
    expect(isPoint({ x: 100.5, y: -3.2 })).toBe(true);
  });

  it('returns false for non-objects', () => {
    expect(isPoint(null)).toBe(false);
    expect(isPoint(undefined)).toBe(false);
    expect(isPoint('string')).toBe(false);
    expect(isPoint(42)).toBe(false);
  });

  it('returns false for objects missing x or y', () => {
    expect(isPoint({ x: 0 })).toBe(false);
    expect(isPoint({ y: 0 })).toBe(false);
    expect(isPoint({})).toBe(false);
  });

  it('returns false for non-numeric x or y', () => {
    expect(isPoint({ x: '0', y: 0 })).toBe(false);
    expect(isPoint({ x: 0, y: '0' })).toBe(false);
  });
});

describe('isPlayer', () => {
  const valid = { id: 'p1', number: 12, position: 'QB', x: 100, y: 200 };

  it('returns true for valid player', () => {
    expect(isPlayer(valid)).toBe(true);
  });

  it('returns false for missing fields', () => {
    expect(isPlayer({ id: 'p1', number: 12, position: 'QB', x: 100 })).toBe(false);
    expect(isPlayer({ id: 'p1' })).toBe(false);
    expect(isPlayer(null)).toBe(false);
  });

  it('returns false for wrong types', () => {
    expect(isPlayer({ ...valid, number: '12' })).toBe(false);
    expect(isPlayer({ ...valid, id: 123 })).toBe(false);
  });
});

describe('isRoute', () => {
  const valid = {
    id: 'r1',
    playerId: 'p1',
    path: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
    type: 'pass',
    timing: 2.5,
  };

  it('returns true for valid route', () => {
    expect(isRoute(valid)).toBe(true);
  });

  it('returns false for invalid type', () => {
    expect(isRoute({ ...valid, type: 'fly' })).toBe(false);
  });

  it('returns false for invalid path points', () => {
    expect(isRoute({ ...valid, path: [{ x: 'a', y: 0 }] })).toBe(false);
  });

  it('returns false for non-array path', () => {
    expect(isRoute({ ...valid, path: 'not-array' })).toBe(false);
  });
});

describe('isPlay', () => {
  const valid = {
    teamId: 't1',
    name: 'Play',
    formation: 'Shotgun',
    description: 'Test',
    routes: [],
    players: [],
    tags: [],
    sport: 'football',
    createdBy: 'coach-1',
  };

  it('returns true for valid play', () => {
    expect(isPlay(valid)).toBe(true);
  });

  it('returns false for missing required fields', () => {
    const { teamId, ...missing } = valid;
    expect(isPlay(missing)).toBe(false);
  });
});

describe('assertPlay', () => {
  it('returns the value for valid data', () => {
    const data = {
      teamId: 't1', name: 'P', formation: 'F', description: 'D',
      routes: [], players: [], tags: [], sport: 'football', createdBy: 'c1',
    };
    expect(assertPlay(data)).toBe(data);
  });

  it('throws for invalid data with context', () => {
    expect(() => assertPlay(null, 'from API')).toThrow('Invalid play data (from API)');
  });
});

describe('assertPlayer', () => {
  it('throws for invalid data', () => {
    expect(() => assertPlayer({ id: 'p1' })).toThrow('Invalid player data');
  });
});
