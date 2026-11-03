// Canonical play document v3 (T-104, ADR-001/002 approved in principle). Pure functions only: no Firebase here.
//
// Safeguards: explicit schema version; v2 documents are migrated in memory by a pure function and the original record
// is never rewritten (saving a migrated play creates a new v3 document whose provenance points at the original);
// v1 pixel plays are reported as unsupported until a coordinate profile exists for them (never guessed); unknown
// block/protection details stay `unspecified`; every reader result is an Evaluation (ok / unsupported).
import type { Evaluation } from './findings';
import { fromV2Assignment, type AssignmentV3, type ConceptFamily } from './model';
import { DEFAULT_RULE_PROFILE, RULE_PROFILES } from './rules';
import type { Assignment, Formation, Level, ReadStep } from './types';
import { LEVEL_ORDER } from './types';

export const PLAY_SCHEMA_VERSION = 3 as const;

export type PlayProvenance =
  | { origin: 'created' }
  | { origin: 'migrated'; fromSchemaVersion: 2; sourceId?: string };

export type PlayDocV3 = {
  schemaVersion: 3;
  teamId: string;
  name: string;
  /** Versioned rule profile the play was built and validated under. */
  ruleProfileId: string;
  formation: Formation;
  concept?: { id: string; family: ConceptFamily };
  assignments: AssignmentV3[];
  read: ReadStep[];
  level: Level;
  tags: string[];
  notes: string;
  provenance: PlayProvenance;
  /** Starts at 1; every saved update increments it by exactly one (optimistic concurrency, T-109). */
  revision: number;
  status: 'draft' | 'published';
  createdBy?: string;
};

/** The v2 fields this module needs (structural, so football-core does not import UI code). */
export type PlayV2Like = {
  id?: string;
  teamId: string;
  schemaVersion: 2;
  name: string;
  formation: Formation;
  conceptId?: string;
  assignments: Assignment[];
  read: ReadStep[];
  level: Level;
  tags: string[];
  notes: string;
  createdBy?: string;
};

/** Pure, deterministic v2 → v3 migration. The input is not modified. */
export function migratePlayV2toV3(v2: PlayV2Like): PlayDocV3 {
  const copy = structuredClone(v2);
  const doc: PlayDocV3 = {
    schemaVersion: 3,
    teamId: copy.teamId,
    name: copy.name,
    // v2 plays were validated with the engine's default 11-player rules.
    ruleProfileId: DEFAULT_RULE_PROFILE.id,
    formation: copy.formation,
    assignments: copy.assignments.map(fromV2Assignment),
    read: copy.read,
    level: copy.level,
    tags: copy.tags,
    notes: copy.notes,
    provenance: copy.id ? { origin: 'migrated', fromSchemaVersion: 2, sourceId: copy.id } : { origin: 'migrated', fromSchemaVersion: 2 },
    revision: 1,
    status: 'draft',
  };
  if (copy.conceptId) doc.concept = { id: copy.conceptId, family: 'pass' }; // every v2 library concept is a pass concept
  if (copy.createdBy) doc.createdBy = copy.createdBy;
  return doc;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const ASSIGNMENT_KINDS = new Set(['route', 'run-track', 'block', 'protect', 'motion', 'read']);

/** Structural problems with a v3 document; empty when it is well formed. */
export function validatePlayDocV3(raw: unknown): string[] {
  if (!isObj(raw)) return ['Play document is not an object.'];
  const p: string[] = [];
  if (raw.schemaVersion !== 3) p.push('schemaVersion must be 3.');
  for (const k of ['teamId', 'name', 'ruleProfileId', 'notes'] as const) if (typeof raw[k] !== 'string') p.push(`${k} must be text.`);
  if (typeof raw.ruleProfileId === 'string' && !RULE_PROFILES[raw.ruleProfileId]) p.push(`Unknown rule profile: ${raw.ruleProfileId}`);
  if (!isObj(raw.formation) || !Array.isArray((raw.formation as Record<string, unknown>).players)) p.push('formation is missing players.');
  if (!Array.isArray(raw.assignments) || !raw.assignments.every(a => isObj(a) && ASSIGNMENT_KINDS.has(String(a.kind)) && typeof a.slot === 'string')) {
    p.push('assignments must be typed v3 assignments with a slot.');
  }
  if (!Array.isArray(raw.read) || !Array.isArray(raw.tags)) p.push('read and tags must be lists.');
  if (!(LEVEL_ORDER as readonly unknown[]).includes(raw.level)) p.push('level is not recognised.');
  if (!Number.isInteger(raw.revision) || (raw.revision as number) < 1) p.push('revision must be a whole number of at least 1.');
  if (raw.status !== 'draft' && raw.status !== 'published') p.push('status must be draft or published.');
  if (!isObj(raw.provenance) || (raw.provenance.origin !== 'created' && raw.provenance.origin !== 'migrated')) p.push('provenance is missing.');
  return p;
}

/**
 * Reads any stored play document by version. v3 is validated; v2 is migrated in memory (the stored original is
 * untouched); anything else (v1 pixel plays, unknown versions) is unsupported rather than guessed.
 */
export function readPlayDocument(raw: unknown, id?: string): Evaluation<PlayDocV3> {
  const version = isObj(raw) ? raw.schemaVersion : undefined;
  if (version === 3) {
    const problems = validatePlayDocV3(raw);
    return problems.length
      ? { status: 'unsupported', reason: `Damaged v3 play: ${problems.join(' ')}`, findings: [] }
      : { status: 'ok', value: structuredClone(raw) as PlayDocV3, findings: [] };
  }
  if (version === 2) {
    const v2 = { ...(raw as PlayV2Like), ...(id ? { id } : {}) };
    return { status: 'ok', value: migratePlayV2toV3(v2), findings: [] };
  }
  return {
    status: 'unsupported',
    reason:
      version === undefined
        ? 'Version-1 play (pixel drawing): it needs a coordinate profile before it can be read as football data.'
        : `Unknown play version: ${String(version)}`,
    findings: [],
  };
}
