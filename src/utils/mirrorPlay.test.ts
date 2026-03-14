import { mirrorPlay } from './mirrorPlay';
import { EnginePlay } from '../types/playbook';

const FIELD_WIDTH = 53 + 1 / 3; // 53.333...

function makeSamplePlay(overrides?: Partial<EnginePlay>): EnginePlay {
  return {
    id: 'play-1',
    name: 'Test Play',
    formation: 'Shotgun',
    players: [
      {
        id: 'p1',
        x: 10,
        y: 20,
        position: 'WR',
        assignedRoute: 'go',
        routeWaypoints: [{ dx: 5, dy: 15 }],
      },
      {
        id: 'p2',
        x: 43,
        y: 25,
        position: 'WR',
        assignedRoute: 'slant',
        routeWaypoints: [{ dx: -3, dy: 8 }],
      },
      {
        id: 'p3',
        x: 26.667,
        y: 30,
        position: 'QB',
      },
    ],
    ...overrides,
  };
}

describe('mirrorPlay', () => {
  it('reflects player X position across field center', () => {
    const play = makeSamplePlay();
    const mirrored = mirrorPlay(play, FIELD_WIDTH);
    // Player at x=10 should move to 53.333 - 10 = 43.333
    expect(mirrored.players[0].x).toBeCloseTo(43.333, 2);
  });

  it('reflects player on right side to left side', () => {
    const play = makeSamplePlay();
    const mirrored = mirrorPlay(play, FIELD_WIDTH);
    // Player at x=43 should move to 53.333 - 43 = 10.333
    expect(mirrored.players[1].x).toBeCloseTo(10.333, 2);
  });

  it('reflects route waypoints by negating dx', () => {
    const play = makeSamplePlay();
    const mirrored = mirrorPlay(play, FIELD_WIDTH);
    // Waypoint dx=5 should become dx=-5
    expect(mirrored.players[0].routeWaypoints![0].dx).toBe(-5);
    // Waypoint dx=-3 should become dx=3
    expect(mirrored.players[1].routeWaypoints![0].dx).toBe(3);
    // dy should not change
    expect(mirrored.players[0].routeWaypoints![0].dy).toBe(15);
  });

  it('does not mutate the original play', () => {
    const play = makeSamplePlay();
    const originalX = play.players[0].x;
    mirrorPlay(play, FIELD_WIDTH);
    expect(play.players[0].x).toBe(originalX);
  });

  it('double-flip returns to original positions', () => {
    const play = makeSamplePlay();
    const flipped = mirrorPlay(mirrorPlay(play, FIELD_WIDTH), FIELD_WIDTH);
    play.players.forEach((player, i) => {
      expect(flipped.players[i].x).toBeCloseTo(player.x, 8);
      expect(flipped.players[i].y).toBe(player.y);
      if (player.routeWaypoints) {
        player.routeWaypoints.forEach((wp, j) => {
          expect(flipped.players[i].routeWaypoints![j].dx).toBeCloseTo(wp.dx, 8);
          expect(flipped.players[i].routeWaypoints![j].dy).toBe(wp.dy);
        });
      }
    });
  });

  it('handles player with no route', () => {
    const play = makeSamplePlay();
    // p3 (QB) has no routeWaypoints
    const mirrored = mirrorPlay(play, FIELD_WIDTH);
    expect(mirrored.players[2].routeWaypoints).toBeUndefined();
    expect(mirrored.players[2].x).toBeCloseTo(FIELD_WIDTH - 26.667, 2);
  });

  it('handles empty players array', () => {
    const play = makeSamplePlay({ players: [] });
    const mirrored = mirrorPlay(play, FIELD_WIDTH);
    expect(mirrored.players).toEqual([]);
  });
});
