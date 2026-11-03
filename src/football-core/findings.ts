// Explainable, deterministic results (Milestone 1). The engine reports football problems as structured findings —
// what was found, about whom, under which rule-profile version, how authoritative that rule is, and what the coach
// could change by hand — so no generative AI is needed to know a formation is illegal or a receiver ineligible.
import type { OffenseRole, Slot, Verification } from './types';

export type FindingSeverity = 'error' | 'warning' | 'info';

export type RuleBasis = {
  /** Versioned rule profile the finding was evaluated under, e.g. `eleven-player@1`. */
  profileId: string;
  /** The rule in plain words. */
  rule: string;
  /** How authoritative the rule is: the profile's verification status (a draft profile is not yet rule-book sourced). */
  authority: Verification['status'];
};

export type Finding = {
  /** Stable machine code, e.g. `eligibility.ineligible-receiver`. */
  code: string;
  severity: FindingSeverity;
  message: string;
  subject?: { role?: OffenseRole; slot?: Slot };
  basis?: RuleBasis;
  /** Manual changes the coach could make. The engine never applies them. */
  options: string[];
};

/**
 * Either a value with findings, or an explicit "unsupported" when the engine cannot evaluate the input —
 * never a fabricated answer.
 */
export type Evaluation<T> =
  | { status: 'ok'; value: T; findings: Finding[] }
  | { status: 'unsupported'; reason: string; findings: Finding[] };

export const hasErrors = (findings: readonly Finding[]): boolean => findings.some(f => f.severity === 'error');
