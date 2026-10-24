// coach-film-annotation.v1 — a coach's mark on a synthetic film sample, saved to a team.
// Firestore: teams/{teamId}/filmAnnotations/{annotationId}. firestore.rules enforces the same schema.
// The source identity (sample id, duration and every allowed encoding hash) is stored with the mark,
// so a mark can only reopen against the exact media it was made on.
import { SyntheticSample } from './samples';

export const ANNOTATION_SCHEMA = 'coach-film-annotation.v1';
export const LIMITS = { labelMax: 80, notesMax: 2000, tagsMax: 8, tagMax: 24, minIntervalMs: 100 } as const;
export const SUGGESTED_TAGS = ['Route', 'Release', 'Break', 'Catch', 'Coverage', 'Technique', 'Alignment', 'Effort'] as const;

export interface SyntheticSource { kind: 'synthetic'; sampleId: string; durationMs: number; sha256: string[] }
export interface AnnotationFields { source: SyntheticSource; startMs: number; endMs: number; label: string; tags: string[]; notes: string }
export interface AnnotationRecord extends AnnotationFields {
  id: string; teamId: string; createdBy: string; revision: number; createdAt: string; updatedAt: string;
}

export class AnnotationValidationError extends Error {}
const fail = (message: string): never => { throw new AnnotationValidationError(message); };
const isPlainObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const exactKeys = (v: Record<string, unknown>, keys: string[], what: string) => {
  const actual = Object.keys(v).sort(); const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((k, i) => k !== expected[i])) fail(`${what} has unexpected or missing fields.`);
};
// Control characters are rejected; ordinary letters, digits, punctuation and spaces are allowed.
// eslint-disable-next-line no-control-regex -- matching control characters is the purpose of this pattern
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
// Built with the constructor: the project's TypeScript target (ES5) rejects the literal `u` flag.
const TAG = new RegExp(String.raw`^[\p{L}\p{N}][\p{L}\p{N} '&/+.-]*$`, 'u');

export function sourceFor(sample: SyntheticSample): SyntheticSource {
  return { kind: 'synthetic', sampleId: sample.id, durationMs: sample.durationMs, sha256: sample.files.map(f => f.sha256).sort() };
}

export function sameSource(a: SyntheticSource, b: SyntheticSource): boolean {
  return a.kind === b.kind && a.sampleId === b.sampleId && a.durationMs === b.durationMs &&
    a.sha256.length === b.sha256.length && a.sha256.every((h, i) => h === b.sha256[i]);
}

export function normalizeTags(tags: string[]): string[] {
  const out: string[] = []; const seen = new Set<string>();
  for (const raw of tags) { const t = raw.trim().replace(/\s+/g, ' '); const key = t.toLowerCase(); if (t && !seen.has(key)) { seen.add(key); out.push(t); } }
  return out;
}

export function parseSource(value: unknown): SyntheticSource {
  if (!isPlainObject(value)) return fail('Source is missing.');
  exactKeys(value, ['kind', 'sampleId', 'durationMs', 'sha256'], 'Source');
  const { kind, sampleId, durationMs, sha256 } = value;
  if (kind !== 'synthetic') fail('Only synthetic sources are supported in this preview.');
  if (typeof sampleId !== 'string' || !/^[a-z0-9-]{1,64}$/.test(sampleId)) fail('Sample id is invalid.');
  if (!Number.isInteger(durationMs) || (durationMs as number) <= 0 || (durationMs as number) > 600000) fail('Sample duration is invalid.');
  if (!Array.isArray(sha256) || sha256.length < 1 || sha256.length > 4 || sha256.some(h => typeof h !== 'string' || !/^[0-9a-f]{64}$/.test(h))) fail('Sample hashes are invalid.');
  const sorted = [...(sha256 as string[])].sort();
  if ((sha256 as string[]).some((h, i) => h !== sorted[i])) fail('Sample hashes must be sorted.');
  return { kind: 'synthetic', sampleId: sampleId as string, durationMs: durationMs as number, sha256: sha256 as string[] };
}

/** Validates editable fields. Throws AnnotationValidationError with a coach-readable message. */
export function validateFields(value: AnnotationFields): AnnotationFields {
  const source = parseSource(value.source);
  const { startMs, endMs, label, tags, notes } = value;
  if (!Number.isInteger(startMs) || !Number.isInteger(endMs)) fail('Start and end must be whole milliseconds.');
  if (startMs < 0) fail('Start cannot be before 0 seconds.');
  if (endMs > source.durationMs) fail(`End cannot be after ${(source.durationMs / 1000).toFixed(1)} seconds.`);
  if (endMs - startMs < LIMITS.minIntervalMs) fail('End must be at least 0.1 seconds after start.');
  if (typeof label !== 'string' || label.trim().length === 0) fail('Add a label.');
  if (label.length > LIMITS.labelMax || label !== label.trim() || CONTROL.test(label)) fail(`Label must be 1–${LIMITS.labelMax} characters without leading or trailing spaces.`);
  if (!Array.isArray(tags) || tags.length > LIMITS.tagsMax) fail(`Use at most ${LIMITS.tagsMax} tags.`);
  for (const t of tags) if (typeof t !== 'string' || t.length < 1 || t.length > LIMITS.tagMax || !TAG.test(t)) fail(`Tags must be 1–${LIMITS.tagMax} letters, numbers or simple punctuation.`);
  if (new Set(tags.map(t => t.toLowerCase())).size !== tags.length) fail('Tags must be unique.');
  if (typeof notes !== 'string' || notes.length > LIMITS.notesMax || CONTROL.test(notes)) fail(`Notes must be at most ${LIMITS.notesMax} characters.`);
  return { source, startMs, endMs, label, tags: [...tags], notes };
}

const iso = (v: unknown): string => {
  if (v && typeof v === 'object' && 'toDate' in v && typeof (v as { toDate: unknown }).toDate === 'function') return (v as { toDate: () => Date }).toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  return fail('Timestamp is invalid.');
};

/** Strictly decodes a stored document. Malformed records are reported, never repaired or overwritten. */
export function parseAnnotationDoc(id: string, data: unknown): AnnotationRecord {
  if (!isPlainObject(data)) return fail('Record is not an object.');
  exactKeys(data, ['schemaVersion', 'teamId', 'createdBy', 'source', 'startMs', 'endMs', 'label', 'tags', 'notes', 'revision', 'createdAt', 'updatedAt'], 'Record');
  if (data.schemaVersion !== ANNOTATION_SCHEMA) fail('Record has an unsupported schema version.');
  if (typeof data.teamId !== 'string' || typeof data.createdBy !== 'string') fail('Record ownership is invalid.');
  if (!Number.isInteger(data.revision) || (data.revision as number) < 1) fail('Record revision is invalid.');
  const fields = validateFields({ source: data.source as SyntheticSource, startMs: data.startMs as number, endMs: data.endMs as number,
    label: data.label as string, tags: data.tags as string[], notes: data.notes as string });
  return { ...fields, id, teamId: data.teamId as string, createdBy: data.createdBy as string, revision: data.revision as number, createdAt: iso(data.createdAt), updatedAt: iso(data.updatedAt) };
}

export function sameFields(a: AnnotationFields, b: AnnotationFields): boolean {
  return sameSource(a.source, b.source) && a.startMs === b.startMs && a.endMs === b.endMs && a.label === b.label && a.notes === b.notes &&
    a.tags.length === b.tags.length && a.tags.every((t, i) => t === b.tags[i]);
}
