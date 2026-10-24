import { readFileSync } from 'fs';
import path from 'path';
import { ANNOTATION_SCHEMA, AnnotationFields, LIMITS, normalizeTags, parseAnnotationDoc, sameFields, sameSource, sourceFor, validateFields } from '../annotation';
import { SYNTHETIC_SAMPLES } from '../samples';

const sample = SYNTHETIC_SAMPLES[0];
const source = sourceFor(sample);
const good = (extra: Partial<AnnotationFields> = {}): AnnotationFields =>
  ({ source, startMs: 3500, endMs: 6000, label: 'Out route break', tags: ['Route', 'Break'], notes: 'Break toward the sideline.', ...extra });
const ts = { toDate: () => new Date('2026-10-23T12:00:00Z') };
const stored = (extra: Record<string, unknown> = {}) => ({ schemaVersion: ANNOTATION_SCHEMA, teamId: 't1', createdBy: 'u1', ...good(), revision: 1, createdAt: ts, updatedAt: ts, ...extra });

describe('coach-film-annotation.v1 fields', () => {
  it('accepts a valid mark and the exact boundaries', () => {
    expect(validateFields(good())).toEqual(good());
    expect(() => validateFields(good({ startMs: 0, endMs: sample.durationMs, label: 'x'.repeat(80), tags: Array.from({ length: 8 }, (_, i) => `t${i}`), notes: 'n'.repeat(2000) }))).not.toThrow();
  });
  it.each([
    ['negative start', { startMs: -1 }], ['end past the sample', { endMs: sample.durationMs + 1 }], ['end before start', { startMs: 5000, endMs: 4000 }],
    ['interval under 0.1 s', { startMs: 1000, endMs: 1099 }], ['fractional ms', { startMs: 1000.5 }], ['NaN time', { endMs: NaN }],
    ['empty label', { label: '' }], ['whitespace label', { label: '   ' }], ['label with outer spaces', { label: ' Route ' }], ['label over 80', { label: 'x'.repeat(81) }],
    ['control character in label', { label: 'a\u0007b' }], ['nine tags', { tags: Array.from({ length: 9 }, (_, i) => `t${i}`) }],
    ['duplicate tags (case-insensitive)', { tags: ['Route', 'route'] }], ['tag over 24', { tags: ['x'.repeat(25)] }], ['tag starting with punctuation', { tags: ['-route'] }],
    ['notes over 2000', { notes: 'x'.repeat(LIMITS.notesMax + 1) }],
  ] as [string, Partial<AnnotationFields>][])('rejects %s', (_name, extra) => {
    expect(() => validateFields(good(extra))).toThrow();
  });
  it('allows non-English tags and simple punctuation', () => {
    expect(() => validateFields(good({ tags: ['Défense', 'Trips/Bunch', "O'Brien"] }))).not.toThrow();
  });
  it('normalizes tags: trims, collapses spaces and drops case-insensitive duplicates', () => {
    expect(normalizeTags([' Route ', 'route', 'Break  point', ''])).toEqual(['Route', 'Break point']);
  });
});

describe('pinned source identity', () => {
  it('sorts hashes and compares every identity field', () => {
    expect(source.sha256).toEqual([...source.sha256].sort());
    expect(sameSource(source, { ...source })).toBe(true);
    expect(sameSource(source, { ...source, durationMs: 7999 })).toBe(false);
    expect(sameSource(source, { ...source, sampleId: 'other' })).toBe(false);
    expect(sameSource(source, { ...source, sha256: [source.sha256[0]] })).toBe(false);
  });
  it('rejects malformed sources', () => {
    expect(() => validateFields(good({ source: { ...source, kind: 'film' as 'synthetic' } }))).toThrow();
    expect(() => validateFields(good({ source: { ...source, sha256: [...source.sha256].reverse() } }))).toThrow();
    expect(() => validateFields(good({ source: { ...source, sha256: ['abc'] } }))).toThrow();
  });
  it('matches the identity pinned in firestore.rules', () => {
    const rules = readFileSync(path.resolve(__dirname, '../../../../../firestore.rules'), 'utf8');
    const block = rules.slice(rules.indexOf('function syntheticOutRouteV1()'), rules.indexOf('function isAllowedTag'));
    expect(block).toContain(`'sampleId': '${sample.id}'`);
    expect(block).toContain(`'durationMs': ${sample.durationMs}`);
    for (const h of source.sha256) expect(block).toContain(`'${h}'`);
  });
});

describe('stored documents', () => {
  it('decodes a valid record and compares fields exactly', () => {
    const r = parseAnnotationDoc('a1', stored());
    expect(r).toMatchObject({ id: 'a1', teamId: 't1', createdBy: 'u1', revision: 1, createdAt: '2026-10-23T12:00:00.000Z' });
    expect(sameFields(r, good())).toBe(true);
    expect(sameFields(r, good({ notes: 'changed' }))).toBe(false);
    expect(sameFields(r, good({ tags: ['Break', 'Route'] }))).toBe(false);
  });
  it.each([
    ['unknown field', { extra: 1 }], ['missing notes', { notes: undefined }], ['wrong schema', { schemaVersion: 'coach-film-annotation.v2' }],
    ['revision 0', { revision: 0 }], ['bad timestamp', { updatedAt: 'yesterday' }], ['end past the sample', { endMs: 9000 }],
  ])('rejects a stored record with %s', (_name, extra) => {
    const data: Record<string, unknown> = stored(extra);
    if ('notes' in extra && extra.notes === undefined) delete data.notes;
    expect(() => parseAnnotationDoc('a1', data)).toThrow();
  });
});
