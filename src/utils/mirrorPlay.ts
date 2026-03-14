import { EnginePlay } from '../types/playbook';

/**
 * Returns a new EnginePlay with all X coordinates reflected across the
 * horizontal center of the field. Does not mutate the input.
 *
 * @param play - The play to mirror
 * @param fieldWidthYards - Total field width in yards (53.333...)
 */
export function mirrorPlay(play: EnginePlay, fieldWidthYards: number): EnginePlay {
  return {
    ...play,
    players: play.players.map((player) => ({
      ...player,
      x: fieldWidthYards - player.x,
      routeWaypoints: player.routeWaypoints
        ? player.routeWaypoints.map((wp) => ({
            ...wp,
            dx: -wp.dx,
          }))
        : undefined,
    })),
  };
}
