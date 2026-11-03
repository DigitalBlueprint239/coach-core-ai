// Installing a reusable concept into a formation under a rule profile (T-106, SP-V10), deterministically.
// Every assignment is kept: an assignment whose slot the formation lacks is returned with `player: null` and a
// finding, never silently dropped. Conflicts come back as structured findings the coach resolves by hand.
import { receiverEligibility, ELIGIBILITY_RULE_TEXT } from './eligibility';
import type { Finding, Evaluation } from './findings';
import { slotsFor, validateFormation } from './formations';
import { fromV2Assignment, type AssignmentV3 } from './model';
import { DEFAULT_RULE_PROFILE, type RuleProfile } from './rules';
import type { Concept, Formation, OffenseRole } from './types';

export type InstalledAssignment = { assignment: AssignmentV3; player: OffenseRole | null };

export type Installation = { conceptId: string; formationId: string; profileId: string; assignments: InstalledAssignment[] };

export function installConcept(
  concept: Concept,
  formation: Formation,
  profile: RuleProfile = DEFAULT_RULE_PROFILE,
): Evaluation<Installation> {
  const basis = (rule: string) => ({ profileId: profile.id, rule, authority: profile.verification.status });
  const findings: Finding[] = validateFormation(formation, profile).map(message => ({
    code: 'formation.illegal',
    severity: 'error' as const,
    message,
    basis: basis(`${profile.name}: ${profile.playersPerSide} players, at least ${profile.minOnLine} on the line.`),
    options: ['Adjust the formation in the editor until it is legal.'],
  }));

  const slots = slotsFor(formation);
  const eligibility = receiverEligibility(formation, profile);
  const assignments: InstalledAssignment[] = concept.assignments.map(raw => {
    const assignment = fromV2Assignment(raw);
    const player = slots.get(assignment.slot);
    if (!player) {
      findings.push({
        code: 'install.missing-slot',
        severity: 'error',
        message: `${formation.name} has no player in the ${assignment.slot} position, so the ${assignment.kind} assignment has nobody to run it.`,
        subject: { slot: assignment.slot },
        options: ['Pick a formation with a player in that position.', 'Add a player there in the editor.'],
      });
      return { assignment, player: null };
    }
    if (assignment.kind === 'route') {
      const status = eligibility.get(player.role);
      if (status === 'ineligible') {
        findings.push({
          code: 'eligibility.ineligible-receiver',
          severity: 'error',
          message: `${player.role} is covered up on the line, so it is not an eligible receiver for the ${assignment.route} route.`,
          subject: { role: player.role, slot: assignment.slot },
          basis: basis(ELIGIBILITY_RULE_TEXT),
          options: [
            `Move ${player.role} off the line.`,
            `Move the end player off the line so ${player.role} becomes the end.`,
            'Give the route to an eligible player.',
          ],
        });
      } else if (status === 'unsupported') {
        findings.push({
          code: 'eligibility.unsupported',
          severity: 'warning',
          message: `Whether ${player.role} may catch a pass is not modelled for ${profile.name}, so this route cannot be checked.`,
          subject: { role: player.role, slot: assignment.slot },
          basis: basis(ELIGIBILITY_RULE_TEXT),
          options: ['Check your league rule book before using this route.'],
        });
      }
    }
    return { assignment, player: player.role };
  });

  return {
    status: 'ok',
    value: { conceptId: concept.id, formationId: formation.id, profileId: profile.id, assignments },
    findings,
  };
}
