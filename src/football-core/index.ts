// Football core: the Smart Playbook's football engine. Pure data and functions; no UI, storage or network.
export { LEVEL_ORDER } from './types';
export type {
  Assignment, Concept, Coverage, CoverageId, Defender, DefenderRole, Formation, FormationPlayer, Front, Level,
  Library, Matchup, OffenseRole, ReadStep, RouteId, Slot, Source, Verification, Yards,
} from './types';
export { isPublishable } from './verification';
export { mirrorFormation, slotsFor, strengthOf, validateFormation } from './formations';
export { DEFAULT_RULE_PROFILE, RULE_PROFILES, ruleProfile } from './rules';
export type { RuleProfile } from './rules';
export { ROUTES, routePath } from './routes';
export { applyConcept } from './concepts';
export type { AppliedConcept, ConceptRoute } from './concepts';
export { alignDefense } from './defense';
export { recommend } from './assistant';
export type { OpponentProfile, Recommendation } from './assistant';
export { applyTerminology, labelFor } from './terminology';
export type { Terminology } from './terminology';
export { applyDecisions, committedDecisions, draftQueue, fullLibrary, publishedLibrary } from './library';
export type { ContentDecision, DraftItem } from './library';
export { hasErrors } from './findings';
export type { Evaluation, Finding, FindingSeverity, RuleBasis } from './findings';
export { receiverEligibility, ELIGIBILITY_RULE_TEXT } from './eligibility';
export type { Eligibility } from './eligibility';
export { MODEL_VERSION, fromV2Assignment, toV2Assignment } from './model';
export type { AssignmentV3, BallAction, BlockRule, ConceptFamily, ProtectionRule, RunTrack } from './model';
export { installConcept } from './install';
export type { InstalledAssignment, Installation } from './install';
export {
  ADVISORY_CAPABILITIES, RESPONSE_STATUSES, STATEMENT_BASES, authorizeAdvisoryAccess, createDisabledAdvisor, requestAdvice,
  validateAdvisoryResponse,
} from './advisory';
export type {
  AdvisoryCapability, AdvisoryRequest, AdvisoryResponse, AdvisoryStatement, Advisor, StatementBasis,
} from './advisory';
export { PLAY_SCHEMA_VERSION, migratePlayV2toV3, readPlayDocument, validatePlayDocV3 } from './playDocument';
export type { PlayDocV3, PlayProvenance, PlayV2Like } from './playDocument';
export { LINE_SLOTS, isLineSlot } from './model';
export type { LineSlot } from './model';
export { resolveInsideZone, INSIDE_ZONE_CONVENTION } from './runGame';
export type { BlockAssignment, InsideZoneResolution, RunSide, TimelineEvent } from './runGame';
export {
  COORDINATE_PROFILE, DEFAULT_FIELD_PROFILE_ID, FIELD_PROFILES, LIMITS as PLAY_LIMITS_V4, MIGRATION_ID, PLAY_SCHEMA_VERSION_V4,
  createPlayDocV4, duplicatePlayDocV4, formationOf, migratePlayToV4, playBytes, readPlayDocumentV4, resolveGeometry,
  validatePlayDocV4,
} from './playDocumentV4';
export type {
  AssignmentV4, DefenderV4, FieldProfile, PlayDocV4, PlayPlayerV4, PlayerId, ProvenanceV4, ReadPlayV4, ResolvedGeometry,
  ResolvedRoute, RouteTemplateRef, UnresolvedAssignment,
} from './playDocumentV4';
export { INTERPRETATION_V1 } from './interpretations/v1';
export {
  DEFENSE_ALIGNMENT_VERSION, ROUTE_LIBRARY_VERSION, addRoutePoint, assignRoute, clearPlayer, describeAssignment, flipPlay, jobOf,
  motionOf, movePlayer, moveRoutePoint, outsideOf, playFromConceptV4, removeJob, removeRoutePoint, renamePlay, routeOf, setBall,
  setBlock, setDefense, setLabel, setMotion, setNotes, setOnLine, setProtect, setRole, setRouteDepth, setRoutePoints, setTags,
  snapYd, templatePoints,
} from './playEditsV4';
