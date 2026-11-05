// Read-only, coach-requested AI advisory contract (owner decisions 2 and 3, 2026-11-03).
//
// - Advice is produced only for an explicit coach action (`trigger.kind === 'coach-action'`). The trigger records
//   intent for the UI; it is NOT authorization. A live advisor runs server-side and must first pass
//   `authorizeAdvisoryAccess` with a uid verified by Firebase Admin (never a client-supplied uid) and the team's
//   membership list. Without that gate, no provider is called.
// - The advisor receives a deep-frozen copy of the football context and returns statements only. Every response is
//   validated in full (status, statement basis, text, evidence ids, suggestions); anything malformed or carrying
//   extra fields (a play, patch, write) is rejected.
// - Every statement says what it rests on. A 'verified-knowledge' statement must cite source ids that resolve to the
//   approved registry supplied with the request; unknown or missing citations are rejected, never shown.
// - With live AI disabled (the default), the disabled advisor returns the engine's deterministic findings, and says
//   when a rule comes from a draft profile that is not yet verified against its rule book.
// The provider is chosen behind a server-side gateway (owner decision of 2026-10-13: new OpenAI and Anthropic keys,
// one gateway, provider adapters); nothing here selects a vendor, and nothing in the editor calls an advisor.
import type { Finding } from './findings';
import type { Installation } from './install';

export const ADVISORY_CAPABILITIES = [
  'explain-play',
  'explain-assignment',
  'explain-blocking-scheme',
  'explain-quarterback-read',
  'analyze-supported-matchup',
  'suggest-coaching-alternatives',
  'explain-rule-conflict',
] as const;
export type AdvisoryCapability = (typeof ADVISORY_CAPABILITIES)[number];

export const STATEMENT_BASES = [
  'deterministic-fact',
  'verified-knowledge',
  'coach-provided',
  'assumption',
  'interpretation',
  'unknown',
] as const;
export type StatementBasis = (typeof STATEMENT_BASES)[number];

export const RESPONSE_STATUSES = ['answered', 'disabled', 'unsupported', 'unavailable'] as const;

export type AdvisoryStatement = {
  basis: StatementBasis;
  text: string;
  /** Source-registry ids; required (and must resolve) for 'verified-knowledge'. */
  sourceIds?: string[];
};

export type AdvisoryRequest = {
  capability: AdvisoryCapability;
  /** UI intent only: an explicit coach action (button press, typed question). Not authorization. */
  trigger: { kind: 'coach-action'; action: string };
  teamId: string;
  context: {
    installation: Installation;
    findings: Finding[];
    question?: string;
    /** Ids of approved registry sources the advisor may cite. Empty means no verified-knowledge citations allowed. */
    allowedSourceIds?: string[];
  };
};

export type AdvisoryResponse = {
  status: (typeof RESPONSE_STATUSES)[number];
  statements: AdvisoryStatement[];
  /** Ideas the coach may apply by hand in the editor. Text only; nothing is applied. */
  suggestions: string[];
};

export interface Advisor {
  advise(request: Readonly<AdvisoryRequest>): Promise<AdvisoryResponse>;
}

const MAX_TEXT = 4000;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v);
  }
  return value;
}

const isNonEmptyString = (v: unknown, max = MAX_TEXT): v is string =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= max;

/** Full structural validation of an advisor response. Returns the problems found; empty means valid. */
export function validateAdvisoryResponse(response: unknown, allowedSourceIds: readonly string[] = []): string[] {
  const problems: string[] = [];
  if (!response || typeof response !== 'object' || Array.isArray(response)) return ['Response is not an object.'];
  const r = response as Record<string, unknown>;
  const extra = Object.keys(r).filter(k => !['status', 'statements', 'suggestions'].includes(k));
  if (extra.length) problems.push(`Response may not contain: ${extra.join(', ')}`);
  if (!(RESPONSE_STATUSES as readonly unknown[]).includes(r.status)) problems.push(`Unknown status: ${String(r.status)}`);
  if (!Array.isArray(r.suggestions) || !r.suggestions.every(s => isNonEmptyString(s))) {
    problems.push('Suggestions must be a list of non-empty text.');
  }
  if (!Array.isArray(r.statements)) {
    problems.push('Statements must be a list.');
    return problems;
  }
  const allowed = new Set(allowedSourceIds);
  r.statements.forEach((s, i) => {
    if (!s || typeof s !== 'object' || Array.isArray(s)) {
      problems.push(`Statement ${i} is not an object.`);
      return;
    }
    const st = s as Record<string, unknown>;
    const stExtra = Object.keys(st).filter(k => !['basis', 'text', 'sourceIds'].includes(k));
    if (stExtra.length) problems.push(`Statement ${i} may not contain: ${stExtra.join(', ')}`);
    if (!(STATEMENT_BASES as readonly unknown[]).includes(st.basis)) problems.push(`Statement ${i} has unknown basis: ${String(st.basis)}`);
    if (!isNonEmptyString(st.text)) problems.push(`Statement ${i} needs text.`);
    if (st.sourceIds !== undefined && (!Array.isArray(st.sourceIds) || !st.sourceIds.every(id => isNonEmptyString(id, 200)))) {
      problems.push(`Statement ${i} has malformed source ids.`);
    }
    const ids = Array.isArray(st.sourceIds) ? (st.sourceIds as string[]) : [];
    if (st.basis === 'verified-knowledge' && ids.length === 0) problems.push(`Statement ${i} claims verified knowledge without a source.`);
    const unknown = ids.filter(id => !allowed.has(id));
    if (unknown.length) problems.push(`Statement ${i} cites sources outside the approved registry: ${unknown.join(', ')}`);
  });
  return problems;
}

/**
 * Server-side authorization for a live advisor. `verifiedUid` must come from a Firebase Admin-verified ID token on the
 * server, never from the request body; `memberUids` from the team document read with admin credentials.
 */
export function authorizeAdvisoryAccess(input: { verifiedUid: string | null | undefined; teamId: string; memberUids: readonly string[] }): void {
  if (!input.verifiedUid) throw new Error('Advice requires a signed-in coach (verified on the server).');
  if (!input.teamId) throw new Error('Advice needs a team.');
  if (!input.memberUids.includes(input.verifiedUid)) throw new Error('Only members of this team can ask about its plays.');
}

/** The only way the app asks for advice. Enforces the coach-action trigger, read-only context and response shape. */
export async function requestAdvice(advisor: Advisor, request: AdvisoryRequest): Promise<AdvisoryResponse> {
  if (request?.trigger?.kind !== 'coach-action' || !isNonEmptyString(request.trigger.action, 200)) {
    throw new Error('Advice is only available when a coach asks for it.');
  }
  if (!(ADVISORY_CAPABILITIES as readonly unknown[]).includes(request.capability)) {
    throw new Error(`Unknown advice type: ${String(request.capability)}`);
  }
  if (!request.teamId) throw new Error('Advice needs a team.');
  const frozen = deepFreeze(structuredClone(request));
  let response: unknown;
  try {
    response = await advisor.advise(frozen);
  } catch {
    return {
      status: 'unavailable',
      statements: [{ basis: 'unknown', text: 'The coaching assistant is unavailable right now. Your play is unchanged.' }],
      suggestions: [],
    };
  }
  const problems = validateAdvisoryResponse(response, request.context.allowedSourceIds ?? []);
  if (problems.length) throw new Error(`Advisor response rejected: ${problems.join(' ')}`);
  return response as AdvisoryResponse;
}

/** Used whenever live AI is off: explains the engine's own findings, labelled as deterministic facts. */
export function createDisabledAdvisor(): Advisor {
  return {
    async advise(request) {
      const facts: AdvisoryStatement[] = request.context.findings.map(f => {
        if (!f.basis) return { basis: 'deterministic-fact', text: f.message };
        const status =
          f.basis.authority === 'verified'
            ? 'verified rule profile'
            : `${f.basis.authority} rule profile — not yet verified against the governing rule book`;
        return { basis: 'deterministic-fact', text: `${f.message} (Rule: ${f.basis.rule} — ${f.basis.profileId}, ${status}.)` };
      });
      const suggestions = [...new Set(request.context.findings.flatMap(f => f.options))];
      return {
        status: 'disabled',
        statements: [
          ...facts,
          { basis: 'unknown', text: 'Live coaching assistant is turned off. The checks above come from the football rules engine.' },
        ],
        suggestions,
      };
    },
  };
}
