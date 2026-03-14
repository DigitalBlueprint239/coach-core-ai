import { ConceptDefinition, CoverageShell, FootballRouteId } from '../types/playbook';

/**
 * 15 passing concepts.
 * Priority determines evaluation order in detection disambiguation.
 */
const concepts: ConceptDefinition[] = [
  {
    id: 'mesh',
    name: 'Mesh',
    requiredRoutes: ['drag', 'drag'] as FootballRouteId[],
    minMatchCount: 2,
    coverageBeaters: ['man_coverage', 'cover_1'],
    weakVs: ['cover_2', 'cover_3'],
    mechanism: 'Two crossing routes create natural picks against man coverage',
    coachingCue: 'Crossers run at 5–6 yards, nearly touching — the mesh point creates a natural rub',
    priority: 1,
  },
  {
    id: 'drive',
    name: 'Drive',
    requiredRoutes: ['drag', 'flat'] as FootballRouteId[],
    minMatchCount: 2,
    coverageBeaters: ['cover_2', 'cover_3'],
    weakVs: ['man_coverage'],
    mechanism: 'Horizontal stretch of the flat defender with shallow cross and flat',
    coachingCue: 'The flat defender can\'t cover both — throw drive or flat based on his movement',
    priority: 2,
  },
  {
    id: 'dagger',
    name: 'Dagger',
    requiredRoutes: ['drag', 'dig', 'go'] as FootballRouteId[],
    minMatchCount: 2,
    coverageBeaters: ['cover_2', 'cover_3'],
    weakVs: ['cover_4'],
    mechanism: 'Deep dig behind the underneath crosser, with a go route clearing the safety',
    coachingCue: 'The go clears the safety, the drag occupies the underneath — the dig sits in the void',
    priority: 3,
  },
  {
    id: 'smash',
    name: 'Smash',
    requiredRoutes: ['corner', 'hitch'] as FootballRouteId[],
    minMatchCount: 2,
    coverageBeaters: ['cover_2', 'cover_4'],
    weakVs: ['cover_3'],
    mechanism: 'High-low on the corner — hitch underneath, corner route over the top',
    coachingCue: 'High-low on the corner — if he sinks with the corner, throw the hitch; if he jumps the hitch, throw the corner',
    priority: 4,
  },
  {
    id: 'flood',
    name: 'Flood',
    requiredRoutes: ['go', 'out', 'flat'] as FootballRouteId[],
    minMatchCount: 3,
    coverageBeaters: ['cover_3'],
    weakVs: ['cover_2'],
    mechanism: 'Three-level vertical stretch to one side — deep, intermediate, short',
    coachingCue: 'Three routes, three levels — someone is always open in the outside third',
    priority: 5,
  },
  {
    id: 'levels',
    name: 'Levels',
    requiredRoutes: ['in', 'drag'] as FootballRouteId[],
    minMatchCount: 2,
    coverageBeaters: ['cover_3', 'cover_2'],
    weakVs: ['man_coverage'],
    mechanism: 'Two crossing routes at different depths stress the hook/curl defenders',
    coachingCue: 'One high crosser, one low crosser — the linebackers can\'t cover both levels',
    priority: 6,
  },
  {
    id: 'spacing',
    name: 'Spacing',
    requiredRoutes: ['hitch', 'flat', 'slant'] as FootballRouteId[],
    minMatchCount: 3,
    coverageBeaters: ['cover_2', 'cover_3'],
    weakVs: ['man_coverage'],
    mechanism: 'Three short horizontal routes spread across the field overwhelm underneath defenders',
    coachingCue: 'Find grass — receivers adjust to voids, not fixed landmarks',
    priority: 7,
  },
  {
    id: 'stick',
    name: 'Stick',
    requiredRoutes: ['hitch', 'flat'] as FootballRouteId[],
    minMatchCount: 2,
    coverageBeaters: ['cover_3', 'cover_2'],
    weakVs: ['cover_4'],
    mechanism: 'Stick route (6-yard hitch) with flat — high-low on the flat defender',
    coachingCue: 'Read the flat defender — if he widens to the flat, throw the stick; if he stays, throw the flat',
    priority: 8,
  },
  {
    id: 'double_slant',
    name: 'Double Slant',
    requiredRoutes: ['slant', 'slant'] as FootballRouteId[],
    minMatchCount: 2,
    coverageBeaters: ['cover_3', 'man_coverage'],
    weakVs: ['cover_2'],
    mechanism: 'Two inside-breaking routes create quick-game overload in the middle',
    coachingCue: 'Quick slants — read the Mike backer, throw away from his drop',
    priority: 9,
  },

  // ---- Session 9 Additions (8 concepts) ----
  {
    id: 'y_cross',
    name: 'Y-Cross',
    requiredRoutes: ['in', 'drag', 'go'] as FootballRouteId[],
    minMatchCount: 2,
    coverageBeaters: ['cover_3', 'cover_1'],
    weakVs: ['cover_2', 'cover_4'],
    mechanism: 'Deep cross by TE lands where the deep defender vacated — vertical clears coverage',
    coachingCue: 'The Y\'s cross lands where the deep defender just vacated',
    priority: 11,
  },
  {
    id: 'mills',
    name: 'Mills',
    requiredRoutes: ['drag', 'in'] as FootballRouteId[],
    minMatchCount: 2,
    coverageBeaters: ['cover_2', 'cover_3'],
    weakVs: ['man_coverage'],
    mechanism: 'Two crossing routes at different depths create a high-low on hook/curl defenders',
    coachingCue: 'High-low the hook/curl defender — one shallow, one deep crossing route',
    priority: 10,
  },
  {
    id: 'four_verticals',
    name: 'Four Verticals',
    requiredRoutes: ['go', 'go', 'seam', 'seam'] as FootballRouteId[],
    minMatchCount: 3,
    coverageBeaters: ['cover_2', 'tampa_2'],
    weakVs: ['cover_4'],
    mechanism: 'Vertical stress — safety must choose which seam to help, leaving the other open',
    coachingCue: 'Inside receivers own the seams — find the void at 15 yards',
    priority: 12,
  },
  {
    id: 'curl_flat',
    name: 'Curl-Flat',
    requiredRoutes: ['curl', 'flat'] as FootballRouteId[],
    minMatchCount: 2,
    coverageBeaters: ['cover_2', 'cover_3'],
    weakVs: ['man_coverage'],
    mechanism: 'High-low the flat defender — curl is high, flat is low',
    coachingCue: 'Read the flat defender — if he takes curl, throw flat; if flat, throw curl',
    priority: 13,
  },
  {
    id: 'sail',
    name: 'Sail',
    requiredRoutes: ['corner', 'out', 'flat'] as FootballRouteId[],
    minMatchCount: 3,
    coverageBeaters: ['cover_3'],
    weakVs: ['cover_2'],
    mechanism: 'Three-level vertical stretch of the outside third — deep corner, intermediate out, short flat',
    coachingCue: 'Three routes, one defender — someone is always open on the outside',
    priority: 14,
  },
  {
    id: 'snag',
    name: 'Snag',
    requiredRoutes: ['corner', 'hitch', 'flat'] as FootballRouteId[],
    minMatchCount: 3,
    coverageBeaters: ['cover_2', 'man_coverage'],
    weakVs: ['cover_3'],
    mechanism: 'Triangle concept — corner clears, snag/hitch sits, flat stretches underneath',
    coachingCue: 'Run the triangle — the corner clears the flat for the snag',
    priority: 15,
  },
];

export function getAllConcepts(): ConceptDefinition[] {
  return concepts;
}

export function getConceptById(id: string): ConceptDefinition | undefined {
  return concepts.find((c) => c.id === id);
}

/**
 * Returns all concepts that list the given coverage as a beater.
 */
export function getConceptsByCoverage(coverage: CoverageShell): ConceptDefinition[] {
  return concepts.filter((c) => c.coverageBeaters.includes(coverage));
}
