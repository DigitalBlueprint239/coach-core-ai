// Safe, read-only projection of canonical v3 data onto the existing v2 field sheet.
// Rich typed v3 assignments are NEVER discarded from the saved document.
import { migratePlayV2toV3, toV2Assignment } from '../../../football-core';
import type { PlayDocV3 } from '../../../football-core';
import type { PlayV2 } from '../playModel';
import { insideZoneSide } from '../run/insideZoneDraft';

export function makeCanonicalDraft(v2: PlayV2): PlayDocV3 {
  const migrated = migratePlayV2toV3(v2);
  const runSide = insideZoneSide(v2.tags);
  return {
    ...migrated,
    // Unpersisted v2 play is a new v3 play; a persisted v2 play records exact source provenance.
    provenance: v2.id ? migrated.provenance : { origin: 'created' },
    // A tagged research run draft is not a pass concept; no unsupported OL instructions are synthesized.
    ...(runSide !== null ? { concept: { id: 'inside-zone', family: 'run' } as const } : {}),
    status: 'draft',
    revision: 1,
  };
}

export function projectV3ForField(doc: PlayDocV3): { play: PlayV2; undisplayedAssignments: number } {
  const assignments = doc.assignments.flatMap(a => {
    const converted = toV2Assignment(a);
    return converted ? [converted] : [];
  });
  return {
    play: {
      schemaVersion: 2,
      coordinateProfile: 'cc-yards-v1',
      teamId: doc.teamId,
      name: doc.name,
      formation: structuredClone(doc.formation),
      assignments,
      read: structuredClone(doc.read),
      level: doc.level,
      tags: [...doc.tags],
      notes: doc.notes,
      ...(doc.concept?.family === 'pass' ? { conceptId: doc.concept.id } : {}),
    },
    undisplayedAssignments: doc.assignments.length - assignments.length,
  };
}
