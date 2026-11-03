// Receiver eligibility under a rule profile (deterministic, no AI).
// Model used by `ends-and-backs` profiles: the two players at the ends of the line and the players off the line
// (backs) are eligible; interior players on the line are not. Jersey-number rules are not modelled (formations
// carry no numbers), and the eligibility of a quarterback taking the snap differs between rule codes, so the QB is
// reported as "unsupported" rather than guessed.
import type { RuleProfile } from './rules';
import type { Formation, OffenseRole } from './types';

export type Eligibility = 'eligible' | 'ineligible' | 'unsupported';

export const ELIGIBILITY_RULE_TEXT =
  'Only the two players at the ends of the line and players off the line (backs) are eligible receivers; interior players on the line are not. Jersey-number rules are not modelled.';

export function receiverEligibility(f: Formation, profile: RuleProfile): Map<OffenseRole, Eligibility> {
  const result = new Map<OffenseRole, Eligibility>();
  if (profile.eligibility !== 'ends-and-backs') {
    for (const p of f.players) result.set(p.role, 'unsupported');
    return result;
  }
  const onLine = f.players.filter(p => p.onLine);
  const xs = onLine.map(p => p.at.x);
  const leftEnd = Math.min(...xs);
  const rightEnd = Math.max(...xs);
  for (const p of f.players) {
    if (p.role === 'QB') result.set(p.role, 'unsupported');
    else if (!p.onLine) result.set(p.role, 'eligible');
    else result.set(p.role, p.at.x === leftEnd || p.at.x === rightEnd ? 'eligible' : 'ineligible');
  }
  return result;
}
