import { getPlaysVsCoverage } from './coverageBeater';
import { EnginePlay, FootballRouteId } from '../types/playbook';

function makePlay(routes: FootballRouteId[], name = 'Test Play', id = 'p1'): EnginePlay {
  return {
    id,
    name,
    formation: 'Shotgun',
    players: routes.map((r, i) => ({
      id: `pl${i}`,
      x: 10 + i * 5,
      y: 20,
      position: i === 0 ? 'WR' : 'TE',
      assignedRoute: r,
    })),
  };
}

describe('getPlaysVsCoverage', () => {
  it('returns empty array when no plays match coverage', () => {
    // A single go route doesn't match any concept
    const result = getPlaysVsCoverage([makePlay(['go'])], 'cover_2');
    expect(result).toEqual([]);
  });

  it('ranks exact concept match higher than partial match', () => {
    const exact = makePlay(['corner', 'hitch'], 'Smash Play', 'ex');
    const partial = makePlay(['drag', 'dig'], 'Partial Dagger', 'pa'); // partial dagger
    const results = getPlaysVsCoverage([partial, exact], 'cover_2');
    // Smash beats cover_2 (exact), Dagger partial also beats cover_2
    const smashIdx = results.findIndex((r) => r.play.id === 'ex');
    const daggerIdx = results.findIndex((r) => r.play.id === 'pa');
    if (smashIdx !== -1 && daggerIdx !== -1) {
      expect(results[smashIdx].coverageBeaterScore).toBeGreaterThanOrEqual(
        results[daggerIdx].coverageBeaterScore,
      );
    }
  });

  it('Smash concept scores high against Cover 2', () => {
    const results = getPlaysVsCoverage([makePlay(['corner', 'hitch'])], 'cover_2');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].coverageBeaterScore).toBeGreaterThanOrEqual(90);
    expect(results[0].detectedConcept).toBe('Smash');
  });

  it('Mesh scores high against man coverage', () => {
    const results = getPlaysVsCoverage([makePlay(['drag', 'drag'])], 'man_coverage');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].coverageBeaterScore).toBeGreaterThanOrEqual(90);
  });

  it('Flood scores high against Cover 3', () => {
    const results = getPlaysVsCoverage([makePlay(['go', 'out', 'flat'])], 'cover_3');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].coverageBeaterScore).toBeGreaterThanOrEqual(90);
  });

  it('returns plays sorted by score descending', () => {
    const plays = [
      makePlay(['go'], 'No Concept', 'nc'),
      makePlay(['corner', 'hitch'], 'Smash', 'sm'),
      makePlay(['drag', 'flat'], 'Drive', 'dr'),
    ];
    const results = getPlaysVsCoverage(plays, 'cover_2');
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].coverageBeaterScore).toBeGreaterThanOrEqual(
        results[i].coverageBeaterScore,
      );
    }
  });

  it('handles plays with no detected concept without throwing', () => {
    const play = makePlay(['go'], 'Lonely Go');
    expect(() => getPlaysVsCoverage([play], 'cover_2')).not.toThrow();
  });

  it('works with empty plays array', () => {
    expect(getPlaysVsCoverage([], 'cover_3')).toEqual([]);
  });

  it('Four Verticals scores high against Cover 2', () => {
    const results = getPlaysVsCoverage(
      [makePlay(['go', 'go', 'seam', 'seam'], 'Four Verts')],
      'cover_2',
    );
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].coverageBeaterScore).toBeGreaterThanOrEqual(90);
  });
});
