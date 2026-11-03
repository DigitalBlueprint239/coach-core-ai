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
export { createDisabledAdvisor, requestAdvice } from './advisory';
export type {
  AdvisoryCapability, AdvisoryRequest, AdvisoryResponse, AdvisoryStatement, Advisor, StatementBasis,
} from './advisory';
