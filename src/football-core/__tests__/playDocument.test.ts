import { migratePlayV2toV3, readPlayDocument, validatePlayDocV3, type PlayV2Like } from '../playDocument';
import { toV2Assignment } from '../model';
import { SPREAD_FORMATIONS } from '../content/formations.spread';
import { PASS_CONCEPTS } from '../content/concepts.pass';

const v2Fixture = (): PlayV2Like => {
  const smash = PASS_CONCEPTS.find(c => c.id === 'smash')!;
  return {
    id: 'p-v2-1',
    teamId: 't1',
    schemaVersion: 2,
    name: 'Smash',
    formation: structuredClone(SPREAD_FORMATIONS.find(f => f.id === 'doubles')!),
    conceptId: 'smash',
    assignments: structuredClone(smash.assignments),
    read: structuredClone(smash.read),
    level: 'jv',
    tags: ['red zone'],
    notes: 'Coach note',
    createdBy: 'coach1',
  };
};

describe('migratePlayV2toV3', () => {
  it('is pure: the original v2 record is not modified', () => {
    const v2 = v2Fixture();
    const before = JSON.stringify(v2);
    migratePlayV2toV3(v2);
    expect(JSON.stringify(v2)).toBe(before);
  });

  it('keeps every field and records provenance back to the original', () => {
    const v2 = v2Fixture();
    const v3 = migratePlayV2toV3(v2);
    expect(v3).toMatchObject({
      schemaVersion: 3, teamId: 't1', name: 'Smash', ruleProfileId: 'eleven-player@1', level: 'jv',
      tags: ['red zone'], notes: 'Coach note', revision: 1, status: 'draft', createdBy: 'coach1',
      concept: { id: 'smash', family: 'pass' },
      provenance: { origin: 'migrated', fromSchemaVersion: 2, sourceId: 'p-v2-1' },
    });
    expect(v3.formation).toEqual(v2.formation);
    expect(v3.read).toEqual(v2.read);
    expect(v3.assignments.map(toV2Assignment)).toEqual(v2.assignments); // lossless
  });

  it('is deterministic', () => {
    expect(migratePlayV2toV3(v2Fixture())).toEqual(migratePlayV2toV3(v2Fixture()));
  });
});

describe('readPlayDocument', () => {
  it('round-trips a v3 document through JSON without changing its meaning', () => {
    const v3 = migratePlayV2toV3(v2Fixture());
    const r = readPlayDocument(JSON.parse(JSON.stringify(v3)));
    expect(r.status).toBe('ok');
    if (r.status === 'ok') expect(r.value).toEqual(v3);
  });

  it('migrates a stored v2 document in memory, using its document id for provenance', () => {
    const stored: Record<string, unknown> = { ...v2Fixture() };
    delete stored.id;
    const r = readPlayDocument(stored, 'doc-7');
    expect(r.status === 'ok' && r.value.provenance).toEqual({ origin: 'migrated', fromSchemaVersion: 2, sourceId: 'doc-7' });
  });

  it('reports v1 pixel plays and unknown versions as unsupported, never guessing geometry', () => {
    const v1 = readPlayDocument({ name: 'Old', players: [{ x: 300, y: 190 }], routes: [] });
    expect(v1.status).toBe('unsupported');
    if (v1.status === 'unsupported') expect(v1.reason).toContain('coordinate profile');
    expect(readPlayDocument({ schemaVersion: 9 }).status).toBe('unsupported');
  });

  it('rejects a damaged v3 document instead of loading it', () => {
    const bad = { ...migratePlayV2toV3(v2Fixture()), revision: 0, assignments: [{ kind: 'teleport', slot: 'qb' }] };
    const r = readPlayDocument(bad);
    expect(r.status).toBe('unsupported');
    expect(validatePlayDocV3(bad).join(' ')).toContain('revision must be');
    expect(validatePlayDocV3(bad).join(' ')).toContain('typed v3 assignments');
  });

  it('rejects an unknown rule profile', () => {
    expect(validatePlayDocV3({ ...migratePlayV2toV3(v2Fixture()), ruleProfileId: 'nfl@1' })).toContain('Unknown rule profile: nfl@1');
  });
});
