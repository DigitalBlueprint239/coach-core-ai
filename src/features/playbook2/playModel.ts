// Version-2 plays: assignments by role on a formation in yards (spec §7, owner-approved 2026-10-30).
// Stored in the existing `plays` collection next to version-1 plays, which are never rewritten.
import type { Assignment, Concept, Formation, Level, ReadStep, Terminology } from '../../football-core';

export type PlayV2 = {
  id?: string;
  teamId: string;
  schemaVersion: 2;
  coordinateProfile: 'cc-yards-v1';
  name: string;
  formation: Formation;
  conceptId?: string;
  assignments: Assignment[];
  read: ReadStep[];
  level: Level;
  tags: string[];
  notes: string;
  fromLibrary?: { kind: 'concept' | 'formation'; id: string };
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

/** A team's own playbook settings, stored on the team document under `playbook`. */
export type TeamPlaybookSettings = {
  terminology: Terminology;
  level: Level;
  /** The coach's own formations; ids start with `team:`. */
  formations: Formation[];
};

export const DEFAULT_SETTINGS: TeamPlaybookSettings = { terminology: {}, level: 'jv', formations: [] };

/** Plain data copy: a play never shares objects with the library it came from (Review Focus 1). */
const clone = <T>(value: T): T => structuredClone(value);

const today = () => new Date().toISOString().slice(0, 10);

function newId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function newBlankPlay(teamId: string, formation: Formation): PlayV2 {
  return {
    teamId,
    schemaVersion: 2,
    coordinateProfile: 'cc-yards-v1',
    name: 'New play',
    formation: clone(formation),
    assignments: [],
    read: [],
    level: formation.levels[0] ?? 'jv',
    tags: [],
    notes: '',
    fromLibrary: formation.id.startsWith('team:') ? undefined : { kind: 'formation', id: formation.id },
  };
}

export function playFromConcept(teamId: string, concept: Concept, formation: Formation): PlayV2 {
  return {
    ...newBlankPlay(teamId, formation),
    name: concept.name,
    conceptId: concept.id,
    assignments: clone(concept.assignments),
    read: clone(concept.read),
    level: concept.minLevel,
    fromLibrary: { kind: 'concept', id: concept.id },
  };
}

/** The coach's own copy of a formation. Marked approved by the team so the engine can use it. */
export function formationCopy(f: Formation, name: string): Formation {
  return {
    ...clone(f),
    id: `team:${newId()}`,
    name,
    verification: { status: 'approved', reviewer: 'team', date: today(), sources: [] },
  };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

export function isPlayV2(doc: unknown): doc is PlayV2 {
  if (!isObject(doc)) return false;
  return (
    doc.schemaVersion === 2 &&
    doc.coordinateProfile === 'cc-yards-v1' &&
    typeof doc.teamId === 'string' &&
    typeof doc.name === 'string' &&
    isObject(doc.formation) &&
    Array.isArray((doc.formation as Record<string, unknown>).players) &&
    Array.isArray(doc.assignments) &&
    Array.isArray(doc.read)
  );
}
