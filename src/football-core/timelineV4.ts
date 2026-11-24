// The shared animation timeline for a v4 play. 2D playback uses it today; any later renderer must use the same one.
// It is computed from `resolveGeometry` alone (never the route library) and is a pure function of the play.
//
// The speed is NOMINAL: one constant teaching speed for every player, so relative path length is what a viewer sees.
// It is not a measurement, not a prediction, and must not be presented as timing advice.
import { resolveGeometry, type PlayDocV4, type PlayerId } from './playDocumentV4';
import type { Yards } from './types';

export const TIMELINE_VERSION = 'cc-timeline@1';
export const NOMINAL_SPEED_YD_PER_S = 6;

export type TimelineTrack = { playerId: PlayerId; path: Yards[]; lengthYd: number; endsAt: number };
export type PlayTimeline = {
  version: typeof TIMELINE_VERSION;
  nominal: true;
  /** Seconds from the snap until the longest route is finished. 0 when nobody has a route. */
  duration: number;
  tracks: TimelineTrack[];
  /** Assignments that have no stored geometry yet, so their players stand still. Never invented. */
  notAnimated: Array<{ playerId: PlayerId; kind: 'block' | 'protect' | 'run-track' | 'motion' }>;
};

const segment = (a: Yards, b: Yards) => Math.hypot(b.x - a.x, b.y - a.y);

export function buildTimeline(play: PlayDocV4): PlayTimeline {
  const tracks = resolveGeometry(play).routes.map(r => {
    const lengthYd = r.path.slice(1).reduce((sum, p, i) => sum + segment(r.path[i], p), 0);
    return { playerId: r.playerId, path: r.path, lengthYd, endsAt: lengthYd / NOMINAL_SPEED_YD_PER_S };
  });
  const notAnimated: PlayTimeline['notAnimated'] = [];
  for (const a of play.assignments) if (a.kind !== 'route' && a.kind !== 'read') notAnimated.push({ playerId: a.playerId, kind: a.kind });
  return { version: TIMELINE_VERSION, nominal: true, duration: tracks.reduce((max, t) => Math.max(max, t.endsAt), 0), tracks, notAnimated };
}

/** Where a player is `t` seconds after the snap. Before the snap he is at the start; after the route, at its end. */
export function positionOnTrack(track: TimelineTrack, t: number): Yards {
  let remaining = Math.max(0, t) * NOMINAL_SPEED_YD_PER_S;
  for (let i = 1; i < track.path.length; i++) {
    const [a, b] = [track.path[i - 1], track.path[i]];
    const length = segment(a, b);
    if (length > 0 && remaining < length) {
      const k = remaining / length;
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
    remaining -= length;
  }
  return { ...track.path[track.path.length - 1] };
}

/** Positions of every moving player at time `t`. Players without a route are absent: they stay where they line up. */
export function positionsAt(timeline: PlayTimeline, t: number): Record<PlayerId, Yards> {
  return Object.fromEntries(timeline.tracks.map(track => [track.playerId, positionOnTrack(track, t)]));
}
