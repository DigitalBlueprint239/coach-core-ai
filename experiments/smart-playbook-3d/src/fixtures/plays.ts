/**
 * Test/demo fixtures. EXPERIMENT ONLY.
 *
 * - Player alignments come from formationReferences.v1_1.json (verbatim copy of
 *   coach-core-ai blob f5fa06f2, identical in PR #91 and PR #92; status "proposed
 *   reference presets; Coach Drew review pending").
 * - Modern fixtures convert those yards to stored pixels with PR #91's exact loader
 *   formula (SmartPlaybook.tsx:462 @916919c): x = 300 + x_yards*10, y = 190 - y_yards*10,
 *   number = index + 1.
 * - Legacy fixtures reproduce recovery PlayController.js shotgunFormation(300, 150) output.
 * - Every route here is an ILLUSTRATION drawn for the prototype, not a saved assignment.
 */
import references from './formationReferences.v1_1.json';
import type { PlayEnvelope, StoredPlay, StoredPlayer, StoredPoint, StoredRoute } from '../model/types';

interface ReferencePlayer { id: string; role: string; x_yards: number; y_yards: number; on_line: boolean }
interface ReferenceFormation { id: string; title: string; subtitle: string; side: 'offense' | 'defense'; players: ReferencePlayer[] }

const FIXTURE_TIME = '2026-10-22T00:00:00.000Z';
const formations = (references as { formations: ReferenceFormation[] }).formations;

export const referenceFormation = (id: string): ReferenceFormation => {
  const f = formations.find(x => x.id === id);
  if (!f) throw new Error(`Formation ${id} missing from reference fixture`);
  return f;
};

/** PR #91 loader arithmetic, reproduced only to build fixtures. */
const pr91Px = (xYd: number, yYd: number): StoredPoint => ({ x: 300 + xYd * 10, y: 190 - yYd * 10 });

function storedFromReference(formationId: string, idPrefix: string): StoredPlay & { players: StoredPlayer[] } {
  const f = referenceFormation(formationId);
  return {
    name: f.title,
    formation: f.id,
    phase: f.side,
    players: f.players.map((p, i) => ({
      id: `${idPrefix}-${p.id}`,
      ...pr91Px(p.x_yards, p.y_yards),
      position: p.role,
      number: i + 1,
      selected: false,
      createdAt: FIXTURE_TIME,
    })),
    routes: [],
  };
}

const route = (id: string, playerId: string, yardPts: [number, number][], key: 'points' | 'path' = 'points'): StoredRoute => {
  const pts = yardPts.map(([x, y]) => pr91Px(x, y));
  return { id, playerId, [key]: pts, type: 'custom', color: '#19E3FF', createdAt: FIXTURE_TIME };
};

const offense = storedFromReference('shotgun-doubles', 'off');
// Illustration-only "Doubles verticals with a swing". Start points equal the player anchors.
const offenseWithRoutes: StoredPlay = {
  ...offense,
  description: 'Prototype fixture. Routes are illustrative, not a saved assignment.',
  routes: [
    route('r-x-go', 'off-X', [[-18, 0], [-18, 6], [-17.2, 17]]),
    route('r-h-seam', 'off-H', [[-11, -2], [-11, 5], [-9.5, 17]]),
    route('r-y-seam', 'off-Y', [[11, -2], [11, 5], [9.5, 17]]),
    route('r-z-curl', 'off-Z', [[18, 0], [18, 12], [16.6, 10.6]]),
    // Stored under the historical `path` key to exercise route compatibility.
    route('r-rb-swing', 'off-RB', [[-4, -5.5], [-7, -6], [-11, -4.5], [-14, -2]], 'path'),
  ],
};
const defense = storedFromReference('4-3-over', 'def');

export const MODERN_OFFENSE: PlayEnvelope = {
  key: 'offense',
  play: offenseWithRoutes,
  provenance: { profileId: 'cc-halffield-px-v1', source: 'Written by the PR #91 formation loader (documented contract)' },
  illustrativeRoutes: true,
};

export const MODERN_DEFENSE: PlayEnvelope = {
  key: 'defense',
  play: defense,
  provenance: { profileId: 'cc-halffield-px-v1', source: 'Written by the PR #91 formation loader (documented contract)' },
};

/** recovery PlayController.js shotgunFormation(300, 150), spacing 48, with ids made deterministic. */
function legacyShotgun(): StoredPlay {
  const cx = 300, cy = 150, s = 48;
  const raw: [number, number, string, number][] = [
    [cx - s * 2, cy, 'LT', 76], [cx - s, cy, 'LG', 66], [cx, cy, 'C', 55], [cx + s, cy, 'RG', 67],
    [cx + s * 2, cy, 'RT', 77], [cx, cy + 56, 'QB', 12], [cx - s, cy + 72, 'RB', 21],
    [cx - s * 4, cy, 'WR', 80], [cx + s * 4, cy, 'WR', 81], [cx - s * 2.5, cy - 32, 'WR', 11],
    [cx + s * 2.5, cy + 32, 'TE', 88],
  ];
  return {
    name: 'Legacy Shotgun (saved before LOS contract)',
    phase: 'offense',
    players: raw.map(([x, y, position, number], i) => ({
      id: `legacy-${i + 1}`, x, y, position, number, selected: false, createdAt: '2025-06-01T00:00:00.000Z',
    })),
    routes: [
      { id: 'legacy-r1', playerId: 'legacy-8', path: [{ x: 108, y: 150 }, { x: 108, y: 60 }], type: 'go', color: '#ff0000' },
    ],
  };
}

export const LEGACY_CLASSIFIED: PlayEnvelope = {
  key: 'legacy',
  play: legacyShotgun(),
  provenance: {
    profileId: 'legacy-shotgun-px-test-classification',
    source: 'Legacy horizontal-field editor (recovery Field.js)',
    classifiedBy: 'TEST FIXTURE classification — not a coach confirmation',
  },
  illustrativeRoutes: true,
};

export const LEGACY_AMBIGUOUS: PlayEnvelope = {
  key: 'legacy',
  play: legacyShotgun(),
  provenance: { profileId: null, source: 'Legacy horizontal-field editor (recovery Field.js); no LOS drawn, scale unknown' },
  illustrativeRoutes: true,
};

export interface Scenario {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly envelopes: readonly PlayEnvelope[];
}

export const SCENARIOS: readonly Scenario[] = [
  { id: 'matchup', label: 'Shotgun Doubles vs 4-3 Over', detail: 'Verified profile · 22-player preview composition', envelopes: [MODERN_OFFENSE, MODERN_DEFENSE] },
  { id: 'offense', label: 'Shotgun Doubles', detail: 'Verified profile · single stored play', envelopes: [MODERN_OFFENSE] },
  { id: 'legacy-classified', label: 'Legacy Shotgun · classified', detail: 'Test-only classification · not coach-verified', envelopes: [LEGACY_CLASSIFIED] },
  { id: 'legacy-ambiguous', label: 'Legacy Shotgun · unknown profile', detail: 'No provenance · 3D withheld', envelopes: [LEGACY_AMBIGUOUS] },
];
