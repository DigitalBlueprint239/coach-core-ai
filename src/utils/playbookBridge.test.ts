import { toEnginePlay, mirrorPlaybookState, savedPlaysToEngine } from './playbookBridge';

describe('playbookBridge', () => {
  describe('toEnginePlay', () => {
    it('maps route type to FootballRouteId', () => {
      const engine = toEnginePlay(
        [{ id: 'p1', x: 100, y: 150, position: 'WR', number: 1 }],
        [{ id: 'r1', playerId: 'p1', points: [{ x: 100, y: 100 }], type: 'slant', color: '#f00' }],
      );
      expect(engine.players[0].assignedRoute).toBe('slant');
    });

    it('returns undefined assignedRoute for custom type', () => {
      const engine = toEnginePlay(
        [{ id: 'p1', x: 100, y: 150, position: 'WR', number: 1 }],
        [{ id: 'r1', playerId: 'p1', points: [{ x: 100, y: 100 }], type: 'custom', color: '#f00' }],
      );
      expect(engine.players[0].assignedRoute).toBeUndefined();
    });

    it('converts pixel coordinates to yards', () => {
      // x=300 is center of 600px canvas → ~26.67 yards (center of 53.333yd field)
      const engine = toEnginePlay(
        [{ id: 'p1', x: 300, y: 150, position: 'QB', number: 7 }],
        [],
      );
      expect(engine.players[0].x).toBeCloseTo(26.667, 1);
      expect(engine.players[0].y).toBeCloseTo(50, 1);
    });
  });

  describe('mirrorPlaybookState', () => {
    it('mirrors player X positions', () => {
      const result = mirrorPlaybookState(
        [{ id: 'p1', x: 100, y: 150, position: 'WR', number: 1 }],
        [],
        600,
      );
      expect(result.players[0].x).toBe(500);
    });

    it('mirrors route point X positions', () => {
      const result = mirrorPlaybookState(
        [],
        [{ id: 'r1', playerId: 'p1', points: [{ x: 100, y: 50 }, { x: 200, y: 80 }], type: 'go', color: '#f00' }],
        600,
      );
      expect(result.routes[0].points[0].x).toBe(500);
      expect(result.routes[0].points[1].x).toBe(400);
    });

    it('does not mutate originals', () => {
      const players = [{ id: 'p1', x: 100, y: 150, position: 'WR', number: 1 }];
      mirrorPlaybookState(players, [], 600);
      expect(players[0].x).toBe(100);
    });
  });

  describe('savedPlaysToEngine', () => {
    it('converts array of saved plays', () => {
      const result = savedPlaysToEngine([
        {
          id: 'sp1', name: 'Test', phase: 'offense', type: 'pass',
          players: [{ id: 'p1', x: 100, y: 150, position: 'WR', number: 1 }],
          routes: [{ id: 'r1', playerId: 'p1', points: [], type: 'go', color: '#f00' }],
        },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('sp1');
      expect(result[0].players[0].assignedRoute).toBe('go');
    });
  });
});
