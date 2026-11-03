// Receiver eligibility under a rule profile (deterministic, no AI).
// Model used by `ends-and-backs` profiles: the two players at the ends of the line and the players off the line
// (backs) are eligible; interior players on the line are not. Jersey-number rules are not modelled (formations
// carry no numbers), and the eligibility of a quarterback taking the snap differs between rule codes, so the QB is
// reported as "unsupported" rather than guessed, as are players tied for an end spot and formations with nobody on
// the line.
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
  if (onLine.length === 0) {
    // Nobody on the line: the formation is illegal and the ends cannot be identified.
    for (const p of f.players) result.set(p.role, 'unsupported');
    return result;
  }
  const xs = onLine.map(p => p.at.x);
  const leftEnd = Math.min(...xs);
  const rightEnd = Math.max(...xs);
  // Two players sharing an end spot (stacked on the line) make the end ambiguous: report, don't guess.
  const tiedAt = (x: number) => onLine.filter(p => p.at.x === x).length > 1;
  for (const p of f.players) {
    if (p.role === 'QB') result.set(p.role, 'unsupported');
    else if (!p.onLine) result.set(p.role, 'eligible');
    else if ((p.at.x === leftEnd && tiedAt(leftEnd)) || (p.at.x === rightEnd && tiedAt(rightEnd))) result.set(p.role, 'unsupported');
    else result.set(p.role, p.at.x === leftEnd || p.at.x === rightEnd ? 'eligible' : 'ineligible');
  }
  return result;
}
