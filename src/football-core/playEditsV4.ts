// Edit operations on a v4 play. Pure: each returns a new play and never touches its input.
// Every operation addresses a player by his stable id. Nothing here looks a player up by role, label or slot,
// except `playFromConceptV4`, which resolves a library concept's slots ONCE while the play is being created and
// stores the result (see docs/smart-playbook/SCHEMA_V4.md).
import { alignDefense } from './defense';
import { slotsFor, strengthOf } from './formations';
import type { BlockRule, ProtectionRule } from './model';
import { LIMITS, createPlayDocV4, formationOf, type AssignmentV4, type DefenderV4, type PlayDocV4, type PlayerId, type RouteTemplateRef } from './playDocumentV4';
import { ROUTES } from './routes';
import type { Concept, CoverageId, Formation, OffenseRole, RouteId, Yards } from './types';

/** Version of the live route library a template was applied from. Bump when a route's shape changes. */
export const ROUTE_LIBRARY_VERSION = 'cc-routes@1';
/** Version of the defensive alignment logic a stored look was resolved by. */
export const DEFENSE_ALIGNMENT_VERSION = 'cc-align@1';

/** Half-yard grid for players and route points. */
export const snapYd = (v: number): number => Math.round(v * 2) / 2 || 0;
const clampYd = (v: number): number => Math.max(-LIMITS.coordinateYd, Math.min(LIMITS.coordinateYd, v));
const point = (p: Yards): Yards => ({ x: clampYd(snapYd(p.x)), y: clampYd(snapYd(p.y)) });

type Route = Extract<AssignmentV4, { kind: 'route' }>;
type Motion = Extract<AssignmentV4, { kind: 'motion' }>;
/** A player has at most one job: a route, a block, a protection or a run track. Motion is separate. */
const JOB_KINDS: ReadonlySet<AssignmentV4['kind']> = new Set(['route', 'block', 'protect', 'run-track']);

const has = (play: PlayDocV4, id: PlayerId) => play.players.some(p => p.id === id);
const mapPlayer = (play: PlayDocV4, id: PlayerId, f: (p: PlayDocV4['players'][number]) => PlayDocV4['players'][number]): PlayDocV4 =>
  has(play, id) ? { ...play, players: play.players.map(p => (p.id === id ? f(p) : p)) } : play;

export const routeOf = (play: PlayDocV4, id: PlayerId): Route | undefined =>
  play.assignments.find((a): a is Route => a.kind === 'route' && a.playerId === id);
export const jobOf = (play: PlayDocV4, id: PlayerId): AssignmentV4 | undefined =>
  play.assignments.find(a => a.playerId === id && JOB_KINDS.has(a.kind));
export const motionOf = (play: PlayDocV4, id: PlayerId): Motion | undefined =>
  play.assignments.find((a): a is Motion => a.kind === 'motion' && a.playerId === id);

/** Replaces the player's job (keeping its position in the list when he already had one). Other players are untouched. */
function setJob(play: PlayDocV4, id: PlayerId, job: AssignmentV4): PlayDocV4 {
  if (!has(play, id)) return play;
  const isJob = (a: AssignmentV4) => a.playerId === id && JOB_KINDS.has(a.kind);
  const index = play.assignments.findIndex(isJob);
  if (index < 0) return { ...play, assignments: [...play.assignments, job] };
  return { ...play, assignments: play.assignments.flatMap((a, i) => (i === index ? [job] : isJob(a) ? [] : [a])) };
}

// --- Players ---------------------------------------------------------------------------------------------------

/** Moves one player. His route keeps its shape and moves with him; nobody else's assignment changes. */
export const movePlayer = (play: PlayDocV4, id: PlayerId, at: Yards): PlayDocV4 => mapPlayer(play, id, p => ({ ...p, at: point(at) }));
export const setOnLine = (play: PlayDocV4, id: PlayerId, onLine: boolean): PlayDocV4 => mapPlayer(play, id, p => ({ ...p, onLine }));
export const setRole = (play: PlayDocV4, id: PlayerId, role: OffenseRole): PlayDocV4 => mapPlayer(play, id, p => ({ ...p, role }));
export function setLabel(play: PlayDocV4, id: PlayerId, label: string): PlayDocV4 {
  const text = label.trim().slice(0, 12);
  return mapPlayer(play, id, p => {
    const { label: _old, ...rest } = p;
    void _old;
    return text ? { ...rest, label: text } : rest;
  });
}

// --- Routes ----------------------------------------------------------------------------------------------------

/** Which sideline is "outside" for a player: his own side of the ball; on the ball, the formation's strength. */
export function outsideOf(play: PlayDocV4, id: PlayerId): 'left' | 'right' {
  const p = play.players.find(pl => pl.id === id);
  if (!p || p.at.x === 0) return play.formation.strength;
  return p.at.x > 0 ? 'right' : 'left';
}

/** The library shape of a route as offsets from the player. Computed when the coach assigns it, then stored. */
export function templatePoints(routeId: RouteId, side: 'left' | 'right', depth?: number): Yards[] {
  const def = ROUTES[routeId];
  const out = side === 'right' ? 1 : -1;
  return def.shape(depth ?? def.defaultDepth).map(r => ({ x: r.o * out + 0, y: r.d + 0 }));
}

/** Gives the player a library route (replacing any job he had). The resolved shape is stored with the template. */
export function assignRoute(play: PlayDocV4, id: PlayerId, routeId: RouteId, depth?: number): PlayDocV4 {
  if (!has(play, id) || !ROUTES[routeId]) return play;
  if (depth !== undefined && !(Number.isFinite(depth) && depth >= -5 && depth <= 40)) return play;
  const side = outsideOf(play, id);
  const template: RouteTemplateRef = { routeId, side, interpretation: ROUTE_LIBRARY_VERSION };
  if (depth !== undefined) template.depth = depth;
  return setJob(play, id, { kind: 'route', playerId: id, points: templatePoints(routeId, side, depth), template });
}

/** Re-applies the player's own template at a new depth. A hand-drawn route (no template) is left alone. */
export function setRouteDepth(play: PlayDocV4, id: PlayerId, depth: number): PlayDocV4 {
  const route = routeOf(play, id);
  return route?.template ? assignRoute(play, id, route.template.routeId, depth) : play;
}

/** Replaces the route's shape with hand-edited points. The template no longer describes it, so it is dropped. */
export function setRoutePoints(play: PlayDocV4, id: PlayerId, points: Yards[]): PlayDocV4 {
  if (!has(play, id) || points.length < 1 || points.length > LIMITS.routePoints) return play;
  return setJob(play, id, { kind: 'route', playerId: id, points: points.map(point) });
}

export function moveRoutePoint(play: PlayDocV4, id: PlayerId, index: number, offset: Yards): PlayDocV4 {
  const route = routeOf(play, id);
  if (!route || index < 0 || index >= route.points.length) return play;
  return setRoutePoints(play, id, route.points.map((p, i) => (i === index ? offset : p)));
}

/** Extends the route three yards further along its last segment (straight upfield for a new route). */
export function addRoutePoint(play: PlayDocV4, id: PlayerId): PlayDocV4 {
  const route = routeOf(play, id);
  if (!route) return setRoutePoints(play, id, [{ x: 0, y: 5 }]);
  if (route.points.length >= LIMITS.routePoints) return play;
  const last = route.points[route.points.length - 1];
  const prev = route.points[route.points.length - 2] ?? { x: 0, y: 0 };
  const length = Math.hypot(last.x - prev.x, last.y - prev.y) || 1;
  const next = { x: last.x + ((last.x - prev.x) / length) * 3, y: last.y + ((last.y - prev.y) / length) * 3 };
  return setRoutePoints(play, id, [...route.points, next]);
}

export function removeRoutePoint(play: PlayDocV4, id: PlayerId, index: number): PlayDocV4 {
  const route = routeOf(play, id);
  if (!route || route.points.length <= 1 || index < 0 || index >= route.points.length) return play;
  return setRoutePoints(play, id, route.points.filter((_, i) => i !== index));
}

// --- Other assignments -----------------------------------------------------------------------------------------

export const setBlock = (play: PlayDocV4, id: PlayerId, rule: BlockRule): PlayDocV4 => setJob(play, id, { kind: 'block', playerId: id, rule });
export const setProtect = (play: PlayDocV4, id: PlayerId, rule: ProtectionRule): PlayDocV4 => setJob(play, id, { kind: 'protect', playerId: id, rule });

export function setMotion(play: PlayDocV4, id: PlayerId, motion: Motion['motion'] | null): PlayDocV4 {
  if (!has(play, id)) return play;
  const rest = play.assignments.filter(a => !(a.kind === 'motion' && a.playerId === id));
  return { ...play, assignments: motion ? [...rest, { kind: 'motion', playerId: id, motion }] : rest };
}

/** Removes the player's job (route, block, protection or run track). His motion, if any, stays. */
export const removeJob = (play: PlayDocV4, id: PlayerId): PlayDocV4 =>
  ({ ...play, assignments: play.assignments.filter(a => !(a.playerId === id && JOB_KINDS.has(a.kind))) });

/** Removes everything assigned to the player. */
export const clearPlayer = (play: PlayDocV4, id: PlayerId): PlayDocV4 =>
  ({ ...play, assignments: play.assignments.filter(a => a.playerId !== id) });

// --- Play-level ------------------------------------------------------------------------------------------------

export const renamePlay = (play: PlayDocV4, name: string): PlayDocV4 => ({ ...play, name: name.slice(0, LIMITS.nameChars) });
export const setNotes = (play: PlayDocV4, notes: string): PlayDocV4 => ({ ...play, notes: notes.slice(0, LIMITS.notesChars) });
export const setBall = (play: PlayDocV4, hash: PlayDocV4['ball']['hash']): PlayDocV4 => ({ ...play, ball: { hash } });

/** Tags from free text: trimmed, lower-cased, de-duplicated, at most 20. */
export function setTags(play: PlayDocV4, tags: string[]): PlayDocV4 {
  const clean = [...new Set(tags.map(t => t.trim().toLowerCase().slice(0, LIMITS.tagChars)).filter(Boolean))].slice(0, LIMITS.tags);
  return { ...play, tags: clean };
}

const mirrorX = (p: Yards): Yards => ({ x: -p.x + 0, y: p.y });
const other = (s: 'left' | 'right') => (s === 'left' ? 'right' : 'left');

/** Mirrors the whole play left to right: players, every route, and the stored defense. Ids do not change. */
export function flipPlay(play: PlayDocV4): PlayDocV4 {
  const flipped: PlayDocV4 = {
    ...play,
    formation: { ...play.formation, strength: other(play.formation.strength) },
    ball: { hash: play.ball.hash === 'middle' ? 'middle' : other(play.ball.hash) },
    players: play.players.map(p => ({ ...p, at: mirrorX(p.at) })),
    assignments: play.assignments.map(a => {
      if (a.kind !== 'route') return a;
      const route: Route = { ...a, points: a.points.map(mirrorX) };
      if (a.template) route.template = { ...a.template, side: other(a.template.side) };
      return route;
    }),
  };
  if (play.defense) flipped.defense = { ...play.defense, defenders: play.defense.defenders.map(d => ({ ...d, at: mirrorX(d.at) })) };
  return flipped;
}

/**
 * Shows a defensive look against the play. The alignment is resolved now, against the current offense, and stored;
 * later edits to the offense do not move it. `null` removes the look.
 */
export function setDefense(play: PlayDocV4, coverageId: CoverageId | null): PlayDocV4 {
  if (coverageId === null) {
    const { defense: _defense, ...rest } = play;
    void _defense;
    return rest;
  }
  const defenders: DefenderV4[] = alignDefense(coverageId, formationOf(play)).map((d, i) => ({ id: `d${i + 1}`, role: d.role, at: { ...d.at }, deep: d.deep }));
  return { ...play, defense: { coverageId, frontId: '43-over', alignedBy: DEFENSE_ALIGNMENT_VERSION, defenders } };
}

/** Plain words for one assignment, for the panel, the print card and screen readers. */
export function describeAssignment(a: AssignmentV4): string {
  switch (a.kind) {
    case 'route': {
      if (!a.template) return 'Custom route';
      const def = ROUTES[a.template.routeId];
      const name = def ? def.name : a.template.routeId;
      return a.template.depth === undefined ? name : `${name} at ${a.template.depth} yd`;
    }
    case 'block':
      return a.rule === 'unspecified' ? 'Block' : `Block: ${a.rule.replace(/-/g, ' ')}`;
    case 'protect':
      return a.rule === 'unspecified' ? 'Pass protect' : `Pass protect: ${a.rule.replace(/-/g, ' ')}`;
    case 'run-track':
      return `Run to the ${a.track.side} side, ${a.track.aimingPoint.replace(/-/g, ' ')}`;
    case 'motion':
      return `${a.motion[0].toUpperCase()}${a.motion.slice(1)} motion`;
    case 'read':
      return `Read ${a.key}: ${a.rule}`;
  }
}

// --- Creating a play from the library --------------------------------------------------------------------------

/**
 * A new play running a library concept from a library formation. The concept names receivers by slot (#1 strong,
 * back, …); those slots are resolved to players here, once, and each player gets a stored route. Slots the
 * formation does not have are returned in `missing` and nothing is invented for them.
 */
export function playFromConceptV4(teamId: string, concept: Concept, formation: Formation): { play: PlayDocV4; missing: string[] } {
  let play = createPlayDocV4(teamId, formation, concept.name);
  const slots = slotsFor(formation);
  const strong = strengthOf(formation);
  const missing: string[] = [];
  for (const a of concept.assignments) {
    const player = slots.get(a.slot);
    const index = player ? formation.players.indexOf(player) : -1;
    if (index < 0) { missing.push(a.slot); continue; }
    const id = play.players[index].id;
    if (a.kind === 'route') {
      const side = a.slot.startsWith('weak') ? other(strong) : strong;
      const template: RouteTemplateRef = { routeId: a.route, side, interpretation: ROUTE_LIBRARY_VERSION };
      if (a.depth !== undefined) template.depth = a.depth;
      play = setJob(play, id, { kind: 'route', playerId: id, points: templatePoints(a.route, side, a.depth), template });
    } else if (a.kind === 'protect') play = setProtect(play, id, 'unspecified');
    else play = setBlock(play, id, 'unspecified');
  }
  return {
    play: { ...play, formation: { ...play.formation, strength: strong }, concept: { id: concept.id, family: 'pass' }, read: structuredClone(concept.read), level: concept.minLevel },
    missing,
  };
}
