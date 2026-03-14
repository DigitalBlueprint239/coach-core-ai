import { detectConcepts } from './conceptDetection';
import { EnginePlay, FootballRouteId } from '../types/playbook';

/** Helper to create a minimal play with given route assignments */
function makePlay(routes: FootballRouteId[], id = 'test-play'): EnginePlay {
  return {
    id,
    name: 'Test',
    formation: 'Shotgun',
    players: routes.map((r, i) => ({
      id: `p${i}`,
      x: 10 + i * 5,
      y: 20,
      position: i === 0 ? 'WR' : i === 1 ? 'WR' : 'TE',
      assignedRoute: r,
    })),
  };
}

describe('detectConcepts', () => {
  // --- Basic detection ---

  it('detects Smash from corner + hitch combination', () => {
    const results = detectConcepts(makePlay(['corner', 'hitch']));
    const smash = results.find((r) => r.conceptId === 'smash');
    expect(smash).toBeDefined();
    expect(smash!.confidence).toBe('exact');
  });

  it('detects Mesh from two crossing/drag routes', () => {
    const results = detectConcepts(makePlay(['drag', 'drag']));
    const mesh = results.find((r) => r.conceptId === 'mesh');
    expect(mesh).toBeDefined();
    expect(mesh!.confidence).toBe('exact');
  });

  it('detects Flood from three-level vertical stretch', () => {
    const results = detectConcepts(makePlay(['go', 'out', 'flat']));
    const flood = results.find((r) => r.conceptId === 'flood');
    expect(flood).toBeDefined();
    expect(flood!.confidence).toBe('exact');
  });

  it('detects Levels from in + drag', () => {
    const results = detectConcepts(makePlay(['in', 'drag']));
    const levels = results.find((r) => r.conceptId === 'levels');
    expect(levels).toBeDefined();
  });

  it('detects Double Slant from two slant routes', () => {
    const results = detectConcepts(makePlay(['slant', 'slant']));
    const ds = results.find((r) => r.conceptId === 'double_slant');
    expect(ds).toBeDefined();
    expect(ds!.confidence).toBe('exact');
  });

  // --- Disambiguation ---

  it('detects Drive not Dagger when no deep dig is present', () => {
    // Drive = drag + flat. Dagger needs drag + dig + go.
    const results = detectConcepts(makePlay(['drag', 'flat']));
    const drive = results.find((r) => r.conceptId === 'drive');
    const dagger = results.find((r) => r.conceptId === 'dagger');
    expect(drive).toBeDefined();
    expect(dagger).toBeUndefined();
  });

  it('detects Dagger when drag + dig + go are present', () => {
    const results = detectConcepts(makePlay(['drag', 'dig', 'go']));
    const dagger = results.find((r) => r.conceptId === 'dagger');
    expect(dagger).toBeDefined();
    expect(dagger!.confidence).toBe('exact');
  });

  // --- Edge cases ---

  it('returns empty array when no concept matches', () => {
    const results = detectConcepts(makePlay(['go']));
    expect(results).toEqual([]);
  });

  it('returns exact confidence for complete concept match', () => {
    const results = detectConcepts(makePlay(['corner', 'hitch']));
    expect(results[0].confidence).toBe('exact');
  });

  it('returns partial confidence for majority match', () => {
    // Dagger needs drag + dig + go (minMatch=2). Give drag + dig only → partial
    const results = detectConcepts(makePlay(['drag', 'dig']));
    const dagger = results.find((r) => r.conceptId === 'dagger');
    expect(dagger).toBeDefined();
    expect(dagger!.confidence).toBe('partial');
  });

  it('does not mutate the input play', () => {
    const play = makePlay(['corner', 'hitch']);
    const playersBefore = JSON.stringify(play.players);
    detectConcepts(play);
    expect(JSON.stringify(play.players)).toBe(playersBefore);
  });

  it('sorts results with exact matches before partial matches', () => {
    // Give routes that trigger both exact and partial matches
    const results = detectConcepts(makePlay(['drag', 'dig', 'go']));
    const exactIdx = results.findIndex((r) => r.confidence === 'exact');
    const partialIdx = results.findIndex((r) => r.confidence === 'partial');
    if (exactIdx !== -1 && partialIdx !== -1) {
      expect(exactIdx).toBeLessThan(partialIdx);
    }
  });

  it('handles play with no players', () => {
    const play: EnginePlay = { id: 'empty', name: 'E', formation: 'I', players: [] };
    expect(detectConcepts(play)).toEqual([]);
  });

  it('handles players with no assigned routes', () => {
    const play: EnginePlay = {
      id: 'no-routes',
      name: 'NR',
      formation: 'Pro',
      players: [{ id: 'p1', x: 10, y: 20, position: 'WR' }],
    };
    expect(detectConcepts(play)).toEqual([]);
  });
});
