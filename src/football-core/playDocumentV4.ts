// Canonical play document v4. Pure functions only: no Firebase, no UI.
// Specification: docs/smart-playbook/SCHEMA_V4.md (the single authoritative description of this contract).
//
// What v4 fixes: v2 and v3 stored "slot + route name" and recomputed who ran what, and what it looked like, from
// code on every render. Dragging a player could move a route to a different player, and a library change could
// redraw a saved play. In v4:
//   - every player has a stable id that never changes for the life of the play;
//   - an assignment belongs to a player id, never to a role, label or slot;
//   - a route stores its own resolved shape (offsets in yards from the player's alignment). The library template it
//     came from is kept beside it for re-editing only, and is never used to draw a saved play;
//   - the defensive look, ball spot, coordinate profile, field profile and rule profile are stored explicitly;
//   - older plays are converted by a pure function using the frozen interpretation they were drawn with. Anything
//     that cannot be bound with certainty is carried over under `unresolved`, never guessed and never dropped.
import type { Evaluation, Finding } from './findings';
import { INTERPRETATION_V1, knownRouteV1, resolveSlotsV1, routeOffsetsV1 } from './interpretations/v1';
import { isLineSlot, type BlockRule, type ConceptFamily, type ProtectionRule, type RunTrack } from './model';
import { validatePlayDocV3 } from './playDocument';
import { DEFAULT_RULE_PROFILE, RULE_PROFILES } from './rules';
import { LEVEL_ORDER } from './types';
import type { CoverageId, DefenderRole, Formation, Level, OffenseRole, ReadStep, RouteId, Yards } from './types';

export const PLAY_SCHEMA_VERSION_V4 = 4 as const;
export const COORDINATE_PROFILE = 'cc-yards-v1' as const;
export const MIGRATION_ID = 'v4-migrate@1' as const;

/** Field dimensions a play was drawn against. Versioned like rule profiles: a change is a new id, never an edit. */
export type FieldProfile = { id: string; name: string; widthYd: number; hashFromCenterYd: number };
export const FIELD_PROFILES: Readonly<Record<string, FieldProfile>> = Object.freeze({
  // 160 ft wide; high-school hash marks divide the field in thirds (53 ft 4 in apart).
  'hs-11@1': { id: 'hs-11@1', name: 'High school 11-player', widthYd: 53.33, hashFromCenterYd: 8.89 },
});
export const DEFAULT_FIELD_PROFILE_ID = 'hs-11@1';

// Storage limits. Generous for real football, small enough that a play, its revision copy and its published
// snapshot each stay far below Firestore's 1 MiB document limit (see SCHEMA_V4.md, "Size and growth").
export const LIMITS = Object.freeze({
  players: 22,
  defenders: 22,
  assignments: 44,
  routePoints: 12,
  coordinateYd: 80,
  nameChars: 120,
  notesChars: 5000,
  tags: 20,
  tagChars: 40,
  readSteps: 12,
  readChars: 300,
  unresolved: 44,
  bytes: 64 * 1024,
});

export type PlayerId = string;
const PLAYER_ID = /^p[1-9][0-9]{0,3}$/;

export type PlayPlayerV4 = {
  id: PlayerId;
  role: OffenseRole;
  at: Yards;
  onLine: boolean;
  /** The coach's own label for this player in this play. Display only. */
  label?: string;
  /** Optional link to a roster entry. Reserved: nothing reads or writes roster data yet. */
  rosterRef?: string;
};

export type DefenderV4 = { id: string; role: DefenderRole; at: Yards; deep: boolean };

/** Where a route's shape came from. Kept so the editor can offer "change depth"; never used to draw a saved play. */
export type RouteTemplateRef = { routeId: RouteId; depth?: number; side: 'left' | 'right'; interpretation: string };

export type AssignmentV4 =
  | { kind: 'route'; playerId: PlayerId; points: Yards[]; template?: RouteTemplateRef }
  | { kind: 'run-track'; playerId: PlayerId; track: RunTrack }
  | { kind: 'block'; playerId: PlayerId; rule: BlockRule }
  | { kind: 'protect'; playerId: PlayerId; rule: ProtectionRule }
  | { kind: 'motion'; playerId: PlayerId; motion: 'jet' | 'orbit' | 'across' | 'return'; endsAtPlayerId?: PlayerId }
  | { kind: 'read'; playerId: PlayerId; key: string; rule: string };

export type ProvenanceV4 =
  | { origin: 'created' }
  | { origin: 'duplicated'; sourceId: string; sourceRevision: number }
  | {
      origin: 'migrated';
      fromSchemaVersion: 2 | 3;
      sourceId?: string;
      /** The frozen interpretation the source play was drawn with and converted by. */
      interpretation: string;
      migration: string;
      /** v3 carried a self-declared status; v4 does not (publishing is a separate immutable snapshot). */
      sourceStatus?: 'draft' | 'published';
    };

/** A source assignment migration could not bind to a player with certainty. Preserved verbatim, never drawn. */
export type UnresolvedAssignment = { source: Record<string, unknown>; reason: string };

export type PlayDocV4 = {
  schemaVersion: 4;
  teamId: string;
  name: string;
  coordinateProfile: typeof COORDINATE_PROFILE;
  fieldProfileId: string;
  ruleProfileId: string;
  /** Lateral ball spot. Coordinates stay relative to the ball; this records where on the field the ball is. */
  ball: { hash: 'left' | 'middle' | 'right' };
  formation: { sourceId?: string; name: string; personnel: Formation['personnel']; strength: 'left' | 'right' };
  players: PlayPlayerV4[];
  /** Highest player number ever issued in this play. New players get playerSeq + 1, so an id is never reused. */
  playerSeq: number;
  assignments: AssignmentV4[];
  defense?: { coverageId?: CoverageId; frontId?: string; alignedBy: string; defenders: DefenderV4[] };
  concept?: { id: string; family: ConceptFamily };
  read: ReadStep[];
  level: Level;
  tags: string[];
  notes: string;
  provenance: ProvenanceV4;
  unresolved: UnresolvedAssignment[];
  /** Starts at 1; every saved update increments it by exactly one. */
  revision: number;
  createdBy?: string;
};

// ---------------------------------------------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------------------------------------------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;
const isYards = (v: unknown): v is Yards =>
  isObj(v) && [v.x, v.y].every(n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= LIMITS.coordinateYd);

const OFFENSE_ROLES: ReadonlySet<string> = new Set(['LT', 'LG', 'C', 'RG', 'RT', 'QB', 'RB', 'FB', 'TE', 'X', 'Z', 'H', 'Y', 'F']);
const DEFENDER_ROLES: ReadonlySet<string> = new Set(['DE-S', 'DT-S', 'NT', 'DE-W', 'SAM', 'MIKE', 'WILL', 'CB-S', 'CB-W', 'SS', 'FS']);
const PERSONNEL: ReadonlySet<string> = new Set(['10', '11', '12', '20', '21']);
const BLOCK_RULES: ReadonlySet<string> = new Set(['unspecified', 'zone-playside', 'zone-backside', 'down', 'pull-kick', 'pull-lead', 'base', 'combo']);
const PROTECT_RULES: ReadonlySet<string> = new Set(['unspecified', 'slide', 'man', 'big-on-big', 'check-release']);
const MOTIONS: ReadonlySet<string> = new Set(['jet', 'orbit', 'across', 'return']);
const AIMING: ReadonlySet<string> = new Set(['A-gap', 'B-gap', 'C-gap', 'guard-outside-hip', 'tackle-outside-hip', 'edge']);
const side = (v: unknown): v is 'left' | 'right' => v === 'left' || v === 'right';

function assignmentProblem(a: unknown, ids: ReadonlySet<string>): string | null {
  if (!isObj(a) || typeof a.playerId !== 'string') return 'is not an assignment with a player id';
  if (!ids.has(a.playerId)) return `refers to a player that is not in the play (${a.playerId})`;
  switch (a.kind) {
    case 'route': {
      if (!Array.isArray(a.points) || a.points.length < 1 || a.points.length > LIMITS.routePoints) return 'route needs 1 to 12 points';
      if (!a.points.every(isYards)) return 'route has a point that is not a finite yard offset';
      if (a.template !== undefined) {
        const t = a.template;
        if (!isObj(t) || typeof t.routeId !== 'string' || !side(t.side) || typeof t.interpretation !== 'string') return 'route template is malformed';
        if (t.depth !== undefined && !(typeof t.depth === 'number' && Number.isFinite(t.depth))) return 'route template depth is not a number';
      }
      return null;
    }
    case 'run-track': {
      const t = a.track;
      return isObj(t) && AIMING.has(String(t.aimingPoint)) && (t.side === 'strong' || t.side === 'weak') ? null : 'run track is malformed';
    }
    case 'block':
      return BLOCK_RULES.has(String(a.rule)) ? null : 'block rule is not recognised';
    case 'protect':
      return PROTECT_RULES.has(String(a.rule)) ? null : 'protection rule is not recognised';
    case 'motion':
      if (!MOTIONS.has(String(a.motion))) return 'motion is not recognised';
      return a.endsAtPlayerId === undefined || (typeof a.endsAtPlayerId === 'string' && ids.has(a.endsAtPlayerId)) ? null : 'motion ends at a player that is not in the play';
    case 'read':
      return isText(a.key, LIMITS.readChars) && isText(a.rule, LIMITS.readChars) ? null : 'read is malformed';
    default:
      return `has an unknown kind (${String(a.kind)})`;
  }
}

/** Structural problems with a v4 document; empty when it is well formed. */
export function validatePlayDocV4(raw: unknown): string[] {
  if (!isObj(raw)) return ['Play document is not an object.'];
  const p: string[] = [];
  if (raw.schemaVersion !== 4) p.push('schemaVersion must be 4.');
  if (typeof raw.teamId !== 'string' || !raw.teamId) p.push('teamId is missing.');
  if (!isText(raw.name, LIMITS.nameChars)) p.push(`name must be text of at most ${LIMITS.nameChars} characters.`);
  if (!isText(raw.notes, LIMITS.notesChars)) p.push(`notes must be text of at most ${LIMITS.notesChars} characters.`);
  if (raw.coordinateProfile !== COORDINATE_PROFILE) p.push(`coordinateProfile must be ${COORDINATE_PROFILE}.`);
  if (typeof raw.fieldProfileId !== 'string' || !FIELD_PROFILES[raw.fieldProfileId]) p.push(`Unknown field profile: ${String(raw.fieldProfileId)}`);
  if (typeof raw.ruleProfileId !== 'string' || !RULE_PROFILES[raw.ruleProfileId]) p.push(`Unknown rule profile: ${String(raw.ruleProfileId)}`);
  if (!isObj(raw.ball) || !['left', 'middle', 'right'].includes(String(raw.ball.hash))) p.push('ball.hash must be left, middle or right.');
  const f = raw.formation;
  if (!isObj(f) || !isText(f.name, LIMITS.nameChars) || !PERSONNEL.has(String(f.personnel)) || !side(f.strength)) p.push('formation needs a name, personnel and strength.');
  if ('status' in raw) p.push('v4 plays have no status field; publishing creates a separate snapshot.');

  const ids = new Set<string>();
  let highest = 0;
  if (!Array.isArray(raw.players) || raw.players.length < 1 || raw.players.length > LIMITS.players) {
    p.push(`players must list 1 to ${LIMITS.players} players.`);
  } else {
    for (const pl of raw.players as unknown[]) {
      if (!isObj(pl) || typeof pl.id !== 'string' || !PLAYER_ID.test(pl.id)) { p.push('A player has no valid id.'); continue; }
      if (ids.has(pl.id)) p.push(`Player id ${pl.id} is used twice.`);
      ids.add(pl.id);
      highest = Math.max(highest, Number(pl.id.slice(1)));
      if (!OFFENSE_ROLES.has(String(pl.role))) p.push(`Player ${pl.id} has an unknown role.`);
      if (!isYards(pl.at)) p.push(`Player ${pl.id} has no valid position.`);
      if (typeof pl.onLine !== 'boolean') p.push(`Player ${pl.id} must say whether he is on the line.`);
      if (pl.label !== undefined && !isText(pl.label, 12)) p.push(`Player ${pl.id} has a label longer than 12 characters.`);
      if (pl.rosterRef !== undefined && !isText(pl.rosterRef, 128)) p.push(`Player ${pl.id} has a malformed roster reference.`);
    }
  }
  if (!Number.isInteger(raw.playerSeq) || (raw.playerSeq as number) < highest) p.push('playerSeq must be at least the highest player number.');

  if (!Array.isArray(raw.assignments) || raw.assignments.length > LIMITS.assignments) {
    p.push(`assignments must be a list of at most ${LIMITS.assignments}.`);
  } else {
    const routed = new Set<string>();
    (raw.assignments as unknown[]).forEach((a, i) => {
      const problem = assignmentProblem(a, ids);
      if (problem) { p.push(`Assignment ${i + 1} ${problem}.`); return; }
      const { kind, playerId } = a as { kind: string; playerId: string };
      if (kind === 'route') {
        if (routed.has(playerId)) p.push(`Player ${playerId} has more than one route.`);
        routed.add(playerId);
      }
    });
  }

  if (raw.defense !== undefined) {
    const d = raw.defense;
    if (!isObj(d) || typeof d.alignedBy !== 'string' || !Array.isArray(d.defenders) || d.defenders.length > LIMITS.defenders) {
      p.push('defense is malformed.');
    } else {
      const seen = new Set<string>();
      for (const def of d.defenders as unknown[]) {
        if (!isObj(def) || typeof def.id !== 'string' || !DEFENDER_ROLES.has(String(def.role)) || !isYards(def.at) || typeof def.deep !== 'boolean') {
          p.push('A defender is malformed.');
        } else if (seen.has(def.id)) p.push(`Defender id ${def.id} is used twice.`);
        else seen.add(def.id);
      }
    }
  }

  if (!Array.isArray(raw.read) || raw.read.length > LIMITS.readSteps || !raw.read.every(s => isObj(s) && isText(s.focus, LIMITS.readChars) && isText(s.text, LIMITS.readChars))) {
    p.push('read must be a short list of steps.');
  }
  if (!Array.isArray(raw.tags) || raw.tags.length > LIMITS.tags || !raw.tags.every(t => isText(t, LIMITS.tagChars))) p.push('tags must be a short list of short labels.');
  if (!(LEVEL_ORDER as readonly unknown[]).includes(raw.level)) p.push('level is not recognised.');
  if (!Number.isInteger(raw.revision) || (raw.revision as number) < 1) p.push('revision must be a whole number of at least 1.');
  if (!Array.isArray(raw.unresolved) || raw.unresolved.length > LIMITS.unresolved || !raw.unresolved.every(u => isObj(u) && isObj(u.source) && typeof u.reason === 'string')) {
    p.push('unresolved must be a list of carried-over source assignments.');
  }

  const prov = raw.provenance;
  const provOk =
    isObj(prov) &&
    (prov.origin === 'created' ||
      (prov.origin === 'duplicated' && typeof prov.sourceId === 'string' && Number.isInteger(prov.sourceRevision)) ||
      (prov.origin === 'migrated' && (prov.fromSchemaVersion === 2 || prov.fromSchemaVersion === 3) && typeof prov.interpretation === 'string' && typeof prov.migration === 'string'));
  if (!provOk) p.push('provenance is missing or malformed.');

  if (p.length === 0 && playBytes(raw) > LIMITS.bytes) p.push(`Play is larger than ${LIMITS.bytes} bytes.`);
  return p;
}

/** Size of the play as stored JSON (UTF-8). Used for the storage limit and for growth estimates. */
export function playBytes(play: unknown): number {
  return new TextEncoder().encode(JSON.stringify(play)).length;
}

// ---------------------------------------------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------------------------------------------

/** A new, empty v4 play on a formation. Player ids are issued in formation order: p1, p2, … */
export function createPlayDocV4(teamId: string, formation: Formation, name = 'New play'): PlayDocV4 {
  const players: PlayPlayerV4[] = formation.players.map((pl, i) => ({ id: `p${i + 1}`, role: pl.role, at: { x: pl.at.x, y: pl.at.y }, onLine: pl.onLine }));
  return {
    schemaVersion: 4,
    teamId,
    name,
    coordinateProfile: COORDINATE_PROFILE,
    fieldProfileId: DEFAULT_FIELD_PROFILE_ID,
    ruleProfileId: DEFAULT_RULE_PROFILE.id,
    ball: { hash: 'middle' },
    formation: { sourceId: formation.id, name: formation.name, personnel: formation.personnel, strength: formation.strength },
    players,
    playerSeq: players.length,
    assignments: [],
    read: [],
    level: formation.levels[0] ?? 'jv',
    tags: [],
    notes: '',
    provenance: { origin: 'created' },
    unresolved: [],
    revision: 1,
  };
}

/** The coach's own copy of a saved play: same football, new identity, revision 1, provenance pointing at the source. */
export function duplicatePlayDocV4(source: PlayDocV4, sourceId: string, name: string): PlayDocV4 {
  const copy = structuredClone(source);
  delete copy.createdBy;
  return { ...copy, name, revision: 1, provenance: { origin: 'duplicated', sourceId, sourceRevision: source.revision } };
}

// ---------------------------------------------------------------------------------------------------------------
// Resolved geometry: the one description of "what is on the field" that every renderer (2D, print, playback, 3D)
// must consume. Nothing here looks at the route library.
// ---------------------------------------------------------------------------------------------------------------

export type ResolvedRoute = { playerId: PlayerId; role: OffenseRole; path: Yards[] };
export type ResolvedGeometry = {
  coordinateProfile: typeof COORDINATE_PROFILE;
  players: Array<{ id: PlayerId; role: OffenseRole; at: Yards; onLine: boolean }>;
  routes: ResolvedRoute[];
  defenders: DefenderV4[];
};

export function resolveGeometry(play: PlayDocV4): ResolvedGeometry {
  const byId = new Map(play.players.map(pl => [pl.id, pl]));
  const routes: ResolvedRoute[] = [];
  for (const a of play.assignments) {
    if (a.kind !== 'route') continue;
    const pl = byId.get(a.playerId);
    if (!pl) continue; // cannot happen in a validated document
    routes.push({ playerId: pl.id, role: pl.role, path: [{ ...pl.at }, ...a.points.map(o => ({ x: pl.at.x + o.x, y: pl.at.y + o.y }))] });
  }
  return {
    coordinateProfile: play.coordinateProfile,
    players: play.players.map(pl => ({ id: pl.id, role: pl.role, at: { ...pl.at }, onLine: pl.onLine })),
    routes,
    defenders: structuredClone(play.defense?.defenders ?? []),
  };
}

/** The play's offensive alignment as a `Formation`, for the existing deterministic checks (legality, eligibility). */
export function formationOf(play: PlayDocV4): Formation {
  return {
    id: play.formation.sourceId ?? 'play',
    name: play.formation.name,
    personnel: play.formation.personnel,
    strength: play.formation.strength,
    players: play.players.map(pl => ({ role: pl.role, at: { ...pl.at }, onLine: pl.onLine })),
    levels: [play.level],
    verification: { status: 'draft', sources: [], note: 'Alignment taken from a saved play.' },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Migration (pure; the source is never modified and never rewritten)
// ---------------------------------------------------------------------------------------------------------------

const unsupported = (reason: string): Evaluation<PlayDocV4> => ({ status: 'unsupported', reason, findings: [] });

type SourceAssignment = Record<string, unknown>;

function migrate(raw: Record<string, unknown>, from: 2 | 3, sourceId?: string): Evaluation<PlayDocV4> {
  const f = raw.formation;
  if (!isObj(f) || !Array.isArray(f.players) || f.players.length < 1 || f.players.length > LIMITS.players) {
    return unsupported('The saved formation is missing or has an impossible number of players.');
  }
  const sourcePlayers = f.players as unknown[];
  if (!sourcePlayers.every(pl => isObj(pl) && OFFENSE_ROLES.has(String(pl.role)) && isYards(pl.at) && typeof pl.onLine === 'boolean')) {
    return unsupported('The saved formation has a player with an unknown role or position.');
  }
  if (!side(f.strength) || !PERSONNEL.has(String(f.personnel)) || typeof f.name !== 'string') {
    return unsupported('The saved formation has no recognisable strength, personnel or name.');
  }
  if (typeof raw.teamId !== 'string' || typeof raw.name !== 'string' || !Array.isArray(raw.assignments)) {
    return unsupported('The saved play is missing its team, name or assignments.');
  }
  const typed = sourcePlayers as Array<{ role: OffenseRole; at: Yards; onLine: boolean }>;
  const players: PlayPlayerV4[] = typed.map((pl, i) => ({ id: `p${i + 1}`, role: pl.role, at: { x: pl.at.x, y: pl.at.y }, onLine: pl.onLine }));
  const { strength, slots } = resolveSlotsV1(typed, f.strength);
  const weak = strength === 'right' ? 'left' : 'right';

  /** Player id for a v2/v3 slot. Line positions (v3) bind by role only when exactly one player has that role. */
  const bind = (slot: unknown): PlayerId | null => {
    if (typeof slot !== 'string') return null;
    if (isLineSlot(slot)) {
      const matches = players.filter(pl => pl.role === slot);
      return matches.length === 1 ? matches[0].id : null;
    }
    const index = slots.get(slot);
    return index === undefined ? null : players[index].id;
  };

  const assignments: AssignmentV4[] = [];
  const unresolved: UnresolvedAssignment[] = [];
  const routed = new Set<PlayerId>();
  const keep = (source: SourceAssignment, reason: string) => unresolved.push({ source: structuredClone(source), reason });

  for (const item of raw.assignments as unknown[]) {
    if (!isObj(item)) { keep({ value: String(item) }, 'Not an assignment.'); continue; }
    const playerId = bind(item.slot);
    if (!playerId) { keep(item, `No single player fills "${String(item.slot)}" in this formation.`); continue; }
    switch (item.kind) {
      case 'route': {
        const routeId = String(item.route);
        const depth = item.depth;
        if (!knownRouteV1(routeId)) { keep(item, `Route "${routeId}" did not exist when this play was saved.`); break; }
        if (depth !== undefined && !(typeof depth === 'number' && Number.isFinite(depth) && Math.abs(depth) <= LIMITS.coordinateYd)) { keep(item, 'Route depth is not a usable number.'); break; }
        if (routed.has(playerId)) { keep(item, 'This player already has a route; a second one cannot be attached with certainty.'); break; }
        const routeSide = String(item.slot).startsWith('weak') ? weak : strength;
        const points = routeOffsetsV1(routeId, routeSide, depth as number | undefined);
        if (!points || !points.every(isYards)) { keep(item, 'Route shape falls outside the field.'); break; }
        routed.add(playerId);
        const template: RouteTemplateRef = { routeId: routeId as RouteId, side: routeSide, interpretation: INTERPRETATION_V1 };
        if (depth !== undefined) template.depth = depth as number;
        assignments.push({ kind: 'route', playerId, points, template });
        break;
      }
      case 'block': {
        const rule = from === 3 ? String(item.rule) : 'unspecified';
        if (BLOCK_RULES.has(rule)) assignments.push({ kind: 'block', playerId, rule: rule as BlockRule });
        else keep(item, 'Block rule is not recognised.');
        break;
      }
      case 'protect': {
        const rule = from === 3 ? String(item.rule) : 'unspecified';
        if (PROTECT_RULES.has(rule)) assignments.push({ kind: 'protect', playerId, rule: rule as ProtectionRule });
        else keep(item, 'Protection rule is not recognised.');
        break;
      }
      case 'run-track': {
        const candidate = { kind: 'run-track', playerId, track: item.track };
        if (from === 3 && !assignmentProblem(candidate, new Set([playerId]))) assignments.push(structuredClone(candidate) as unknown as AssignmentV4);
        else keep(item, 'Run track is malformed.');
        break;
      }
      case 'motion': {
        const endsAt = item.endsAt === undefined ? undefined : bind(item.endsAt);
        if (from !== 3 || !MOTIONS.has(String(item.motion)) || endsAt === null) { keep(item, 'Motion cannot be attached with certainty.'); break; }
        const motion: AssignmentV4 = { kind: 'motion', playerId, motion: item.motion as 'jet' | 'orbit' | 'across' | 'return' };
        if (endsAt) motion.endsAtPlayerId = endsAt;
        assignments.push(motion);
        break;
      }
      case 'read': {
        if (from === 3 && isText(item.key, LIMITS.readChars) && isText(item.rule, LIMITS.readChars)) assignments.push({ kind: 'read', playerId, key: item.key, rule: item.rule });
        else keep(item, 'Read is malformed.');
        break;
      }
      default:
        keep(item, `Unknown assignment kind "${String(item.kind)}".`);
    }
  }

  const provenance: ProvenanceV4 = { origin: 'migrated', fromSchemaVersion: from, interpretation: INTERPRETATION_V1, migration: MIGRATION_ID };
  if (sourceId) provenance.sourceId = sourceId;
  if (from === 3 && (raw.status === 'draft' || raw.status === 'published')) provenance.sourceStatus = raw.status;

  const doc: PlayDocV4 = {
    schemaVersion: 4,
    teamId: raw.teamId,
    name: raw.name,
    coordinateProfile: COORDINATE_PROFILE,
    fieldProfileId: DEFAULT_FIELD_PROFILE_ID,
    // v2 plays were validated with the default 11-player rules; v3 recorded its profile.
    ruleProfileId: from === 3 && typeof raw.ruleProfileId === 'string' ? raw.ruleProfileId : DEFAULT_RULE_PROFILE.id,
    ball: { hash: 'middle' },
    formation: { name: f.name, personnel: f.personnel as Formation['personnel'], strength },
    players,
    playerSeq: players.length,
    assignments,
    read: structuredClone(Array.isArray(raw.read) ? raw.read : []) as ReadStep[],
    level: raw.level as Level,
    tags: structuredClone(Array.isArray(raw.tags) ? raw.tags : []) as string[],
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    provenance,
    unresolved,
    revision: 1,
  };
  if (typeof f.id === 'string') doc.formation.sourceId = f.id;
  if (from === 3 && isObj(raw.concept) && typeof raw.concept.id === 'string') doc.concept = { id: raw.concept.id, family: raw.concept.family as ConceptFamily };
  if (from === 2 && typeof raw.conceptId === 'string') doc.concept = { id: raw.conceptId, family: 'pass' }; // every v2 library concept is a pass concept
  if (typeof raw.createdBy === 'string') doc.createdBy = raw.createdBy;

  const problems = validatePlayDocV4(doc);
  if (problems.length) return unsupported(`This play cannot be converted without guessing: ${problems.join(' ')}`);

  const findings: Finding[] = unresolved.map(u => ({
    code: 'migration.unresolved-assignment',
    severity: 'warning',
    message: `One saved assignment was kept but not attached to a player: ${u.reason}`,
    options: ['Open the play and assign it by hand.', 'Leave it; the original play is unchanged.'],
  }));
  return { status: 'ok', value: doc, findings };
}

/**
 * Converts a stored v2 or v3 play to v4 in memory. Pure and deterministic: the same input always gives the same
 * output, the input is not modified, and the stored original is never rewritten (saving creates a new document).
 */
export function migratePlayToV4(raw: unknown, sourceId?: string): Evaluation<PlayDocV4> {
  if (!isObj(raw)) return unsupported('Not a play document.');
  if (raw.schemaVersion === 2) {
    if (raw.coordinateProfile !== undefined && raw.coordinateProfile !== COORDINATE_PROFILE) {
      return unsupported(`Unknown coordinate profile: ${String(raw.coordinateProfile)}`);
    }
    return migrate(structuredClone(raw), 2, sourceId);
  }
  if (raw.schemaVersion === 3) {
    const problems = validatePlayDocV3(raw);
    if (problems.length) return unsupported(`Damaged v3 play: ${problems.join(' ')}`);
    return migrate(structuredClone(raw), 3, sourceId);
  }
  return unsupported(`Only version 2 and 3 plays can be converted (this is ${String(raw.schemaVersion ?? 'version 1')}).`);
}

export type ReadPlayV4 = Evaluation<PlayDocV4> & { sourceSchemaVersion?: 2 | 3 | 4 };

/**
 * Reads any stored play by version. v4 is validated as stored; v2 and v3 are converted in memory; version-1 pixel
 * drawings and unknown versions are reported as unsupported rather than guessed.
 */
export function readPlayDocumentV4(raw: unknown, id?: string): ReadPlayV4 {
  const version = isObj(raw) ? raw.schemaVersion : undefined;
  if (version === 4) {
    const problems = validatePlayDocV4(raw);
    return problems.length
      ? { status: 'unsupported', reason: `Damaged v4 play: ${problems.join(' ')}`, findings: [], sourceSchemaVersion: 4 }
      : { status: 'ok', value: structuredClone(raw) as PlayDocV4, findings: [], sourceSchemaVersion: 4 };
  }
  if (version === 2 || version === 3) return { ...migratePlayToV4(raw, id), sourceSchemaVersion: version };
  return unsupported(
    version === undefined
      ? 'Version-1 play (pixel drawing): it has no football coordinates, so it cannot be read as football data.'
      : `Unknown play version: ${String(version)}`,
  );
}
