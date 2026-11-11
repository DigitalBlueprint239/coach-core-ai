// Schema v4 acceptance tests. The AT-n names are referenced from docs/smart-playbook/SCHEMA_V4.md.
import {
  COORDINATE_PROFILE, FIELD_PROFILES, LIMITS, createPlayDocV4, duplicatePlayDocV4, formationOf, migratePlayToV4,
  playBytes, readPlayDocumentV4, resolveGeometry, validatePlayDocV4, type AssignmentV4, type PlayDocV4,
} from '../playDocumentV4';
import { INTERPRETATION_V1, routeOffsetsV1 } from '../interpretations/v1';
import { migratePlayV2toV3, type PlayV2Like } from '../playDocument';
import { slotsFor, strengthOf, validateFormation } from '../formations';
import { ROUTES, routePath } from '../routes';
import { alignDefense } from '../defense';
import { RULE_PROFILES } from '../rules';
import { PASS_CONCEPTS } from '../content/concepts.pass';
import { SPREAD_FORMATIONS } from '../content/formations.spread';
import type { Formation, RouteId, Slot, Yards } from '../types';

const formation = (id: string): Formation => structuredClone(SPREAD_FORMATIONS.find(f => f.id === id)!);
const concept = (id: string) => structuredClone(PASS_CONCEPTS.find(c => c.id === id)!);

const v2 = (formationId = 'doubles', conceptId = 'smash'): PlayV2Like & { coordinateProfile?: string } => {
  const c = concept(conceptId);
  return {
    id: 'legacy-1', teamId: 't1', schemaVersion: 2, name: c.name, formation: formation(formationId), conceptId: c.id,
    assignments: c.assignments, read: c.read, level: 'jv', tags: ['red zone'], notes: 'Coach note', createdBy: 'coach1',
  };
};

const migrated = (source: unknown = v2(), id = 'legacy-1'): PlayDocV4 => {
  const r = migratePlayToV4(source, id);
  if (r.status !== 'ok') throw new Error(r.reason);
  return r.value;
};

const reload = (play: PlayDocV4): PlayDocV4 => {
  const r = readPlayDocumentV4(JSON.parse(JSON.stringify(play)));
  if (r.status !== 'ok') throw new Error(r.reason);
  return r.value;
};

const routeOf = (play: PlayDocV4, playerId: string) =>
  play.assignments.find((a): a is Extract<AssignmentV4, { kind: 'route' }> => a.kind === 'route' && a.playerId === playerId);

/** What the v2/v3 renderer drew for this play, computed with the live library exactly as geometry.ts does. */
function legacyDrawing(play: PlayV2Like) {
  const slots = slotsFor(play.formation);
  const strong = strengthOf(play.formation);
  const weak = strong === 'right' ? 'left' : 'right';
  const drawn: Array<{ index: number; path: Yards[] }> = [];
  for (const a of play.assignments) {
    if (a.kind !== 'route') continue;
    const player = slots.get(a.slot);
    if (!player) continue;
    drawn.push({ index: play.formation.players.indexOf(player), path: routePath(a.route, player.at, a.slot.startsWith('weak') ? weak : strong, a.depth) });
  }
  return drawn;
}

describe('AT-1 every player has a stable, persistent identity', () => {
  it('issues unique ids in formation order and never reuses a number', () => {
    const play = createPlayDocV4('t1', formation('doubles'));
    expect(play.players.map(p => p.id)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11']);
    expect(play.playerSeq).toBe(11);
    // Removing the last player must not free his id for the next one added.
    const removed = { ...play, players: play.players.slice(0, 10) };
    expect(validatePlayDocV4(removed)).toEqual([]);
    expect(validatePlayDocV4({ ...removed, playerSeq: 10 })).toEqual([]);
    expect(validatePlayDocV4({ ...removed, playerSeq: 9 })).not.toEqual([]);
  });

  it('keeps the same ids through save and reload, and through migration run twice', () => {
    const play = migrated();
    expect(reload(play).players.map(p => p.id)).toEqual(play.players.map(p => p.id));
    expect(migrated().players).toEqual(play.players);
  });

  it('rejects duplicate or malformed ids', () => {
    const play = createPlayDocV4('t1', formation('doubles'));
    const dup = structuredClone(play);
    dup.players[1].id = 'p1';
    expect(validatePlayDocV4(dup).join(' ')).toMatch(/used twice/);
    const bad = structuredClone(play);
    bad.players[0].id = 'QB';
    expect(validatePlayDocV4(bad).join(' ')).toMatch(/no valid id/);
  });
});

describe('AT-2 roles and labels are attributes, not assignment keys', () => {
  it('changing a role or label leaves every assignment and all geometry untouched', () => {
    const play = migrated();
    const before = { assignments: structuredClone(play.assignments), geometry: resolveGeometry(play).routes.map(r => r.path) };
    const edited = structuredClone(play);
    const receiver = edited.players.find(p => routeOf(edited, p.id))!;
    receiver.role = receiver.role === 'X' ? 'Z' : 'X';
    receiver.label = 'Jet';
    expect(validatePlayDocV4(edited).filter(m => !/used twice/.test(m))).toEqual([]);
    expect(edited.assignments).toEqual(before.assignments);
    expect(resolveGeometry(edited).routes.map(r => r.path)).toEqual(before.geometry);
  });

  it('an assignment that names a role, slot or missing player is refused', () => {
    const play = migrated();
    for (const playerId of ['X', 'strong-1', 'p99', '']) {
      const broken = structuredClone(play);
      broken.assignments[0] = { ...broken.assignments[0], playerId };
      expect(validatePlayDocV4(broken)).not.toEqual([]);
    }
  });
});

describe('AT-3 moving players never moves a route to a different player', () => {
  it('reproduces the v2 defect, then shows v4 does not have it', () => {
    const source = v2('doubles', 'smash');
    const play = migrated(source);

    // Swap the two strong-side receivers' depths past each other, as a coach dragging #2 outside #1 would.
    const strongSide = strengthOf(source.formation) === 'right' ? 1 : -1;
    const slots = slotsFor(source.formation);
    const one = source.formation.players.indexOf(slots.get('strong-1')!);
    const two = source.formation.players.indexOf(slots.get('strong-2')!);
    const farOutside = { x: source.formation.players[one].at.x + strongSide * 3, y: source.formation.players[two].at.y };

    // v2: the slot numbering flips, so the routes change hands.
    const legacyBefore = legacyDrawing(source);
    const draggedV2 = structuredClone(source);
    draggedV2.formation.players[two].at = farOutside;
    const shape = (drawing: ReturnType<typeof legacyDrawing>, index: number) => {
      const path = drawing.find(d => d.index === index)!.path;
      return path.map(pt => ({ x: Math.round((pt.x - path[0].x) * 1e6) / 1e6, y: Math.round((pt.y - path[0].y) * 1e6) / 1e6 }));
    };
    expect(slotsFor(draggedV2.formation).get('strong-1')).toBe(draggedV2.formation.players[two]);
    expect(shape(legacyBefore, one)).not.toEqual(shape(legacyBefore, two));
    expect(shape(legacyDrawing(draggedV2), two)).toEqual(shape(legacyBefore, one)); // #2 now runs #1's route

    // v4: same drag. Each player keeps his own route, and its shape is unchanged.
    const dragged = structuredClone(play);
    dragged.players[two].at = farOutside;
    expect(validatePlayDocV4(dragged)).toEqual([]);
    expect(dragged.assignments).toEqual(play.assignments);
    const delta = { x: farOutside.x - play.players[two].at.x, y: farOutside.y - play.players[two].at.y };
    const pathBefore = resolveGeometry(play).routes.find(r => r.playerId === play.players[two].id)!.path;
    const pathAfter = resolveGeometry(dragged).routes.find(r => r.playerId === play.players[two].id)!.path;
    expect(pathAfter).toEqual(pathBefore.map(pt => ({ x: pt.x + delta.x, y: pt.y + delta.y })));
    const otherBefore = resolveGeometry(play).routes.find(r => r.playerId === play.players[one].id)!.path;
    expect(resolveGeometry(dragged).routes.find(r => r.playerId === play.players[one].id)!.path).toEqual(otherBefore);
  });
});

describe('AT-4 route geometry survives route-library changes', () => {
  it('a saved play draws the same after the live library is edited or a route is deleted', () => {
    const play = migrated();
    const saved = JSON.stringify(play);
    const before = resolveGeometry(play);
    const live = ROUTES as Record<string, { defaultDepth: number; shape: (d: number) => Array<{ o: number; d: number }> }>;
    const originals = { corner: live.corner, hitch: live.hitch };
    try {
      live.corner = { ...live.corner, defaultDepth: 30, shape: () => [{ o: 20, d: 40 }] };
      delete live.hitch;
      expect(resolveGeometry(reload(JSON.parse(saved) as PlayDocV4))).toEqual(before);
      // Converting the legacy original again after the library changed still gives the historical drawing.
      expect(migrated()).toEqual(JSON.parse(saved));
    } finally {
      live.corner = originals.corner;
      live.hitch = originals.hitch;
    }
  });

  it('the frozen interpretation has fixed, literal values', () => {
    expect(INTERPRETATION_V1).toBe('cc-interp@1');
    expect(routeOffsetsV1('corner', 'right')).toEqual([{ x: 0, y: 7 }, { x: 6, y: 12 }]);
    expect(routeOffsetsV1('corner', 'left')).toEqual([{ x: 0, y: 7 }, { x: -6, y: 12 }]);
    expect(routeOffsetsV1('hitch', 'left')).toEqual([{ x: 0, y: 5 }, { x: 0, y: 4 }]);
    expect(routeOffsetsV1('drag', 'right', 3)).toEqual([{ x: -4, y: 3 }, { x: -18, y: 3 }]);
    expect(routeOffsetsV1('swing', 'left')).toEqual([{ x: -3, y: -0.5 }, { x: -9, y: 1 }]);
    expect(routeOffsetsV1('slant', 'left')).toBeNull();
  });
});

describe('AT-5 save and reload returns the same play', () => {
  it('round-trips a created, an edited and a migrated play without any change', () => {
    const created = createPlayDocV4('t1', formation('trips-right'), 'Flood');
    created.assignments.push({ kind: 'route', playerId: 'p7', points: [{ x: 0, y: 8 }, { x: 5.5, y: 12.25 }] });
    created.defense = { coverageId: 'cover-3', frontId: '43-over', alignedBy: 'cc-align@1', defenders: alignDefense('cover-3', formationOf(created)).map((d, i) => ({ id: `d${i + 1}`, ...d })) };
    for (const play of [created, migrated(), migrated(v2('trips-right', 'flood'))]) {
      expect(validatePlayDocV4(play)).toEqual([]);
      expect(reload(play)).toEqual(play);
      expect(reload(reload(play))).toEqual(play);
      expect(resolveGeometry(reload(play))).toEqual(resolveGeometry(play));
    }
  });
});

describe('AT-6 migration is pure, deterministic and records provenance', () => {
  it('does not modify the source and gives identical output every time', () => {
    const source = v2();
    const frozen = JSON.stringify(source);
    const a = migratePlayToV4(source, 'legacy-1');
    const b = migratePlayToV4(source, 'legacy-1');
    expect(JSON.stringify(source)).toBe(frozen);
    expect(a).toEqual(b);
    expect(a.status === 'ok' && a.value.players[0].at).not.toBe(source.formation.players[0].at);
  });

  it('records where the play came from and how it was interpreted', () => {
    expect(migrated().provenance).toEqual({ origin: 'migrated', fromSchemaVersion: 2, sourceId: 'legacy-1', interpretation: 'cc-interp@1', migration: 'v4-migrate@1' });
    const v3 = { ...migratePlayV2toV3(v2()), status: 'published' as const };
    const fromV3 = migrated(v3, 'legacy-3');
    expect(fromV3.provenance).toEqual({ origin: 'migrated', fromSchemaVersion: 3, sourceId: 'legacy-3', interpretation: 'cc-interp@1', migration: 'v4-migrate@1', sourceStatus: 'published' });
    expect('status' in fromV3).toBe(false);
    expect(fromV3.revision).toBe(1);
  });

  it('v2 and its v3 conversion migrate to the same football', () => {
    const fromV2 = migrated();
    const fromV3 = migrated(migratePlayV2toV3(v2()), 'legacy-1');
    expect(fromV3.players).toEqual(fromV2.players);
    expect(fromV3.assignments).toEqual(fromV2.assignments);
  });

  it('a reader reports which stored version a play came from', () => {
    expect(readPlayDocumentV4(v2(), 'x').sourceSchemaVersion).toBe(2);
    expect(readPlayDocumentV4(migratePlayV2toV3(v2()), 'x').sourceSchemaVersion).toBe(3);
    expect(readPlayDocumentV4(migrated()).sourceSchemaVersion).toBe(4);
  });
});

describe('AT-7 unsupported or ambiguous input is never guessed', () => {
  it('refuses version-1 pixel drawings, unknown versions and unknown coordinate profiles', () => {
    for (const raw of [{ name: 'Old', players: [{ x: 120, y: 40 }] }, { schemaVersion: 5 }, { schemaVersion: 1 }, null, 'play', { ...v2(), coordinateProfile: 'pixels-600x300' }]) {
      expect(readPlayDocumentV4(raw).status).toBe('unsupported');
    }
  });

  it('refuses a play whose formation is damaged', () => {
    const noPlayers = { ...v2(), formation: { ...formation('doubles'), players: [] } };
    const badRole = v2();
    (badRole.formation.players[0] as { role: string }).role = 'WR9';
    const badSpot = v2();
    (badSpot.formation.players[0].at as { x: unknown }).x = 'wide';
    const noStrength = { ...v2(), formation: { ...formation('doubles'), strength: 'middle' } };
    for (const raw of [noPlayers, badRole, badSpot, noStrength]) expect(migratePlayToV4(raw).status).toBe('unsupported');
  });

  it('keeps, but does not draw, an assignment it cannot attach with certainty', () => {
    const source = v2();
    const original = source.assignments.length;
    source.assignments.push(
      { slot: 'weak-3', kind: 'route', route: 'go' }, // doubles has no weak #3
      { slot: 'strong-1', kind: 'route', route: 'slant' as RouteId }, // not in the library when saved
      { slot: 'back', kind: 'route', route: 'swing', depth: 'deep' as unknown as number },
      { slot: 'nobody' as Slot, kind: 'block' },
    );
    const r = migratePlayToV4(source, 'legacy-1');
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.value.assignments).toHaveLength(original);
    expect(r.value.unresolved.map(u => u.source)).toEqual(JSON.parse(JSON.stringify(source.assignments.slice(original))));
    expect(r.findings).toHaveLength(4);
    expect(r.findings.every(f => f.code === 'migration.unresolved-assignment')).toBe(true);
    // Nothing unresolved reaches the field.
    expect(resolveGeometry(r.value).routes).toHaveLength(r.value.assignments.filter(a => a.kind === 'route').length);
    // And it survives a save and reload.
    expect(reload(r.value).unresolved).toEqual(r.value.unresolved);
  });

  it('does not attach a second route to a player who already has one', () => {
    const source = v2();
    const first = source.assignments.find(a => a.kind === 'route')!;
    source.assignments.push({ slot: first.slot, kind: 'route', route: 'go' });
    const play = migrated(source);
    expect(play.unresolved).toHaveLength(1);
    expect(play.unresolved[0].reason).toMatch(/already has a route/);
  });

  it('a v3 line assignment binds by role only when exactly one player has that role', () => {
    const v3 = migratePlayV2toV3(v2());
    v3.assignments.push({ kind: 'block', slot: 'LT', rule: 'zone-playside' });
    const play = migrated(v3);
    const lt = play.players.find(p => p.role === 'LT')!;
    expect(play.assignments).toContainEqual({ kind: 'block', playerId: lt.id, rule: 'zone-playside' });

    const twoTackles = structuredClone(v3);
    twoTackles.formation.players.find(p => p.role === 'RT')!.role = 'LT';
    const ambiguous = migrated(twoTackles);
    expect(ambiguous.assignments.some(a => a.kind === 'block' && a.rule === 'zone-playside')).toBe(false);
    expect(ambiguous.unresolved).toHaveLength(1);
  });

  it('a damaged v4 or v3 document is unsupported, not repaired', () => {
    const play = migrated();
    expect(readPlayDocumentV4({ ...play, players: play.players.slice(0, 3) }).status).toBe('unsupported');
    expect(readPlayDocumentV4({ ...migratePlayV2toV3(v2()), revision: 0 }).status).toBe('unsupported');
  });
});

describe('AT-8 migrated plays draw exactly what the old renderer drew', () => {
  it('for every library concept on every library formation', () => {
    let compared = 0;
    for (const f of SPREAD_FORMATIONS) {
      for (const c of PASS_CONCEPTS) {
        const source = v2(f.id, c.id);
        const legacy = legacyDrawing(source);
        const play = migrated(source);
        const drawn = resolveGeometry(play).routes;
        expect(drawn).toHaveLength(legacy.length);
        for (const old of legacy) {
          const now = drawn.find(r => r.playerId === play.players[old.index].id)!;
          expect(now.path).toHaveLength(old.path.length);
          now.path.forEach((pt, i) => {
            expect(pt.x).toBeCloseTo(old.path[i].x, 9);
            expect(pt.y).toBeCloseTo(old.path[i].y, 9);
          });
          compared++;
        }
        // Routes the old renderer silently skipped are preserved as unresolved instead of vanishing.
        expect(play.assignments.length + play.unresolved.length).toBe(source.assignments.length);
      }
    }
    expect(compared).toBeGreaterThan(40);
  });
});

describe('AT-9 offensive and defensive alignment are both stored', () => {
  it('stores the resolved defensive look and never recomputes it', () => {
    const play = migrated();
    const defenders = alignDefense('cover-3', formationOf(play)).map((d, i) => ({ id: `d${i + 1}`, ...d }));
    const withDefense: PlayDocV4 = { ...play, defense: { coverageId: 'cover-3', frontId: '43-over', alignedBy: 'cc-align@1', defenders } };
    expect(validatePlayDocV4(withDefense)).toEqual([]);
    // Moving a receiver after the look was saved does not move any defender.
    const moved = structuredClone(withDefense);
    moved.players.find(p => routeOf(moved, p.id))!.at = { x: 3, y: -1 };
    expect(resolveGeometry(reload(moved)).defenders).toEqual(defenders);
    expect(validatePlayDocV4({ ...withDefense, defense: { ...withDefense.defense!, defenders: [{ ...defenders[0] }, { ...defenders[0] }] } })).not.toEqual([]);
  });

  it('the stored alignment feeds the existing legality check', () => {
    expect(validateFormation(formationOf(migrated()))).toEqual([]);
  });
});

describe('AT-10 coordinate, field and rule profiles are explicit and versioned', () => {
  it('every play names its profiles and unknown ones are refused', () => {
    const play = migrated();
    expect(play.coordinateProfile).toBe(COORDINATE_PROFILE);
    expect(FIELD_PROFILES[play.fieldProfileId]).toBeDefined();
    expect(RULE_PROFILES[play.ruleProfileId]).toBeDefined();
    expect(play.ball).toEqual({ hash: 'middle' });
    expect(validatePlayDocV4({ ...play, coordinateProfile: 'pixels' })).not.toEqual([]);
    expect(validatePlayDocV4({ ...play, fieldProfileId: 'nfl@1' })).not.toEqual([]);
    expect(validatePlayDocV4({ ...play, ruleProfileId: 'eleven-player@9' })).not.toEqual([]);
    expect(validatePlayDocV4({ ...play, ball: { hash: 'far' } })).not.toEqual([]);
  });
});

describe('AT-11 one resolved geometry for every renderer', () => {
  it('is derived only from the stored document', () => {
    const play = migrated();
    const g = resolveGeometry(play);
    expect(g.players.map(p => p.id)).toEqual(play.players.map(p => p.id));
    for (const r of g.routes) {
      const player = play.players.find(p => p.id === r.playerId)!;
      expect(r.path[0]).toEqual(player.at);
      expect(r.path).toHaveLength(routeOf(play, r.playerId)!.points.length + 1);
    }
    // Returned geometry is a copy: a renderer cannot corrupt the play by mutating it.
    g.players[0].at.x = 99;
    g.routes[0].path[0].x = 99;
    expect(resolveGeometry(play)).not.toEqual(g);
    expect(validatePlayDocV4(play)).toEqual([]);
  });
});

describe('validation, duplication and size', () => {
  it('refuses non-finite or out-of-field geometry, extra routes and a self-declared status', () => {
    const play = migrated();
    const route = play.assignments.findIndex(a => a.kind === 'route');
    const withPoints = (points: unknown) => ({ ...play, assignments: play.assignments.map((a, i) => (i === route ? { ...a, points } : a)) });
    for (const points of [[], [{ x: Number.NaN, y: 1 }], [{ x: 500, y: 1 }], [{ x: 1 }], Array.from({ length: LIMITS.routePoints + 1 }, () => ({ x: 1, y: 1 }))]) {
      expect(validatePlayDocV4(withPoints(points))).not.toEqual([]);
    }
    expect(validatePlayDocV4({ ...play, assignments: [...play.assignments, play.assignments[route]] }).join(' ')).toMatch(/more than one route/);
    expect(validatePlayDocV4({ ...play, status: 'published' }).join(' ')).toMatch(/no status field/);
    expect(validatePlayDocV4({ ...play, notes: 'x'.repeat(LIMITS.notesChars + 1) })).not.toEqual([]);
  });

  it('a duplicate is a new revision-1 play that points at its source and shares no objects with it', () => {
    const source = { ...migrated(), revision: 7 };
    const copy = duplicatePlayDocV4(source, 'play-123', 'Smash (copy)');
    expect(copy.provenance).toEqual({ origin: 'duplicated', sourceId: 'play-123', sourceRevision: 7 });
    expect(copy.revision).toBe(1);
    expect(copy.createdBy).toBeUndefined();
    expect(copy.assignments).toEqual(source.assignments);
    copy.players[0].at.x = 42;
    expect(source.players[0].at.x).not.toBe(42);
    expect(validatePlayDocV4(copy)).toEqual([]);
  });

  it('a realistic play with a full defense is a few kilobytes', () => {
    const play = migrated(v2('trips-right', 'flood'));
    play.defense = { coverageId: 'cover-3', frontId: '43-over', alignedBy: 'cc-align@1', defenders: alignDefense('cover-3', formationOf(play)).map((d, i) => ({ id: `d${i + 1}`, ...d })) };
    play.notes = 'x'.repeat(400);
    const bytes = playBytes(play);
    expect(bytes).toBeGreaterThan(1500);
    expect(bytes).toBeLessThan(8 * 1024);
    expect(LIMITS.bytes).toBeLessThan(1024 * 1024 / 8);
  });
});
