// Football core: the Smart Playbook's football engine. Pure data and functions; no UI, storage or network.
export { LEVEL_ORDER } from './types';
export type {
  Assignment, Concept, Coverage, CoverageId, Defender, DefenderRole, Formation, FormationPlayer, Front, Level,
  Library, Matchup, OffenseRole, ReadStep, RouteId, Slot, Source, Verification, Yards,
} from './types';
export { isPublishable } from './verification';
export { mirrorFormation, slotsFor, strengthOf, validateFormation } from './formations';
export { ROUTES, routePath } from './routes';
export { applyConcept } from './concepts';
export type { AppliedConcept, ConceptRoute } from './concepts';
export { alignDefense } from './defense';
export { recommend } from './assistant';
export type { OpponentProfile, Recommendation } from './assistant';
export { applyTerminology, labelFor } from './terminology';
export type { Terminology } from './terminology';
export { draftQueue, fullLibrary, publishedLibrary } from './library';
export type { DraftItem } from './library';
