// Read-only, coach-requested AI advisory contract (owner decisions 2 and 3, 2026-11-03).
// - Advice is only produced for an explicit coach action (`trigger.kind === 'coach-action'`); anything else is refused.
// - The advisor receives a deep-frozen copy of the football context and returns statements only. The response type
//   has no field that can carry a play, patch or mutation, and `requestAdvice` rejects responses that try.
// - Every statement says what it rests on (deterministic fact, verified knowledge, coach-provided, assumption,
//   interpretation, unknown), so a coach can tell a rule-engine fact from an opinion.
// - With live AI disabled (the default), the disabled advisor still returns the engine's deterministic findings.
// The live provider runs server-side only (Functions + Genkit), behind auth and team checks; it is not part of this
// module, and nothing in the editor calls it automatically.
import type { Finding } from './findings';
import type { Installation } from './install';

export type AdvisoryCapability =
  | 'explain-play'
  | 'explain-assignment'
  | 'explain-blocking-scheme'
  | 'explain-quarterback-read'
  | 'analyze-supported-matchup'
  | 'suggest-coaching-alternatives'
  | 'explain-rule-conflict';

export type StatementBasis =
  | 'deterministic-fact'
  | 'verified-knowledge'
  | 'coach-provided'
  | 'assumption'
  | 'interpretation'
  | 'unknown';

export type AdvisoryStatement = {
  basis: StatementBasis;
  text: string;
  /** Source-registry ids for verified knowledge; must resolve, never invented. */
  sourceIds?: string[];
};

export type AdvisoryRequest = {
  capability: AdvisoryCapability;
  /** Only an explicit coach action may request advice (button press, typed question). */
  trigger: { kind: 'coach-action'; action: string };
  teamId: string;
  context: { installation: Installation; findings: Finding[]; question?: string };
};

export type AdvisoryResponse = {
  status: 'answered' | 'disabled' | 'unsupported' | 'unavailable';
  statements: AdvisoryStatement[];
  /** Ideas the coach may apply by hand in the editor. Text only; nothing is applied. */
  suggestions: string[];
};

export interface Advisor {
  advise(request: Readonly<AdvisoryRequest>): Promise<AdvisoryResponse>;
}

const ALLOWED_RESPONSE_KEYS = new Set(['status', 'statements', 'suggestions']);

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v);
  }
  return value;
}

/** The only way the app asks for advice. Enforces the coach-action trigger, read-only context and response shape. */
export async function requestAdvice(advisor: Advisor, request: AdvisoryRequest): Promise<AdvisoryResponse> {
  if (request?.trigger?.kind !== 'coach-action' || !request.trigger.action) {
    throw new Error('Advice is only available when a coach asks for it.');
  }
  if (!request.teamId) throw new Error('Advice needs a team.');
  const frozen = deepFreeze(structuredClone(request));
  let response: AdvisoryResponse;
  try {
    response = await advisor.advise(frozen);
  } catch {
    return {
      status: 'unavailable',
      statements: [{ basis: 'unknown', text: 'The coaching assistant is unavailable right now. Your play is unchanged.' }],
      suggestions: [],
    };
  }
  const extra = Object.keys(response ?? {}).filter(k => !ALLOWED_RESPONSE_KEYS.has(k));
  if (extra.length) throw new Error(`Advisor response may not contain: ${extra.join(', ')}`);
  return response;
}

/** Used whenever live AI is off: explains the engine's own findings, labelled as deterministic facts. */
export function createDisabledAdvisor(): Advisor {
  return {
    async advise(request) {
      const facts: AdvisoryStatement[] = request.context.findings.map(f => ({
        basis: 'deterministic-fact',
        text: f.basis ? `${f.message} (Rule: ${f.basis.rule} — ${f.basis.profileId}, ${f.basis.authority}.)` : f.message,
      }));
      return {
        status: 'disabled',
        statements: [
          ...facts,
          { basis: 'unknown', text: 'Live coaching assistant is turned off. The checks above come from the football rules engine.' },
        ],
        suggestions: request.context.findings.flatMap(f => f.options),
      };
    },
  };
}
