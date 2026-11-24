// Deterministic checks on a v4 play. No AI, no network, and nothing here changes a play.
//
// Each finding says what it rests on:
//   - `basis` set      → a structural rule from the play's versioned rule profile (with that profile's own status);
//   - `provisional`    → a coaching convention nobody qualified has reviewed yet (docs/smart-playbook/FOOTBALL_REVIEW.md).
// Geometry facts (a path leaving the field) need neither. Anything the engine cannot decide is reported as such.
import { ELIGIBILITY_RULE_TEXT, receiverEligibility } from './eligibility';
import type { Finding, RuleBasis } from './findings';
import { validateFormation } from './formations';
import { FIELD_PROFILES, formationOf, resolveGeometry, type PlayDocV4, type PlayerId } from './playDocumentV4';
import { RULE_PROFILES } from './rules';
import type { Yards } from './types';

export type PlayFinding = Finding & { playerIds: PlayerId[]; provisional?: true };

/** Two routes ending closer than this put two receivers where one defender can play both. Provisional value. */
export const CROWDED_FINISH_YD = 4;

const LINEMEN: ReadonlySet<string> = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
const distance = (a: Yards, b: Yards) => Math.hypot(a.x - b.x, a.y - b.y);

export function checkPlayV4(play: PlayDocV4): PlayFinding[] {
  const findings: PlayFinding[] = [];
  const profile = RULE_PROFILES[play.ruleProfileId];
  const geometry = resolveGeometry(play);
  const nameOf = (id: PlayerId) => {
    const p = play.players.find(pl => pl.id === id);
    return p ? p.label ?? p.role : id;
  };
  const basis = (rule: string): RuleBasis | undefined => profile && { profileId: profile.id, rule, authority: profile.verification.status };

  if (!profile) {
    findings.push({ code: 'rules.unknown-profile', severity: 'warning', message: `Rule profile ${play.ruleProfileId} is not known, so legality was not checked.`, options: [], playerIds: [] });
  } else {
    const formation = formationOf(play);
    for (const message of validateFormation(formation, profile)) {
      findings.push({ code: 'formation.illegal', severity: 'error', message, basis: basis(message), options: ['Move a player on or off the line.'], playerIds: [] });
    }
    // Eligibility is keyed by role, so it can only be decided when every role is used once.
    if (new Set(play.players.map(p => p.role)).size === play.players.length) {
      const eligibility = receiverEligibility(formation, profile);
      for (const r of geometry.routes) {
        if (eligibility.get(r.role) !== 'ineligible' || !r.path.some(p => p.y > 0)) continue;
        findings.push({
          code: 'eligibility.ineligible-receiver', severity: 'error', basis: basis(ELIGIBILITY_RULE_TEXT), playerIds: [r.playerId],
          subject: { role: r.role },
          message: `${nameOf(r.playerId)} has a route but is not an eligible receiver from this alignment.`,
          options: ['Move him to the end of the line or off the line.', 'Give him a block instead.'],
        });
      }
    } else if (geometry.routes.length) {
      findings.push({ code: 'eligibility.undetermined', severity: 'info', message: 'Two players share a role, so receiver eligibility was not checked.', options: ['Give each player a different role.'], playerIds: [] });
    }
  }

  const field = FIELD_PROFILES[play.fieldProfileId];
  if (field) {
    const hash = play.ball.hash === 'left' ? -field.hashFromCenterYd : play.ball.hash === 'right' ? field.hashFromCenterYd : 0;
    const outside = (p: Yards) => Math.abs(p.x + hash) > field.widthYd / 2;
    for (const p of geometry.players) {
      if (outside(p.at)) findings.push({ code: 'field.player-out-of-bounds', severity: 'error', message: `${nameOf(p.id)} is lined up out of bounds.`, options: ['Move him inside the sideline.'], playerIds: [p.id] });
    }
    for (const r of geometry.routes) {
      if (!outside(r.path[0]) && r.path.some(outside)) {
        findings.push({ code: 'field.route-out-of-bounds', severity: 'warning', message: `${nameOf(r.playerId)}'s route leaves the field.`, options: ['Shorten or reshape the route.'], playerIds: [r.playerId] });
      }
    }
  }

  for (let i = 0; i < geometry.routes.length; i++) {
    for (let j = i + 1; j < geometry.routes.length; j++) {
      const [a, b] = [geometry.routes[i], geometry.routes[j]];
      const gap = distance(a.path[a.path.length - 1], b.path[b.path.length - 1]);
      if (gap >= CROWDED_FINISH_YD) continue;
      findings.push({
        code: 'spacing.crowded-finish', severity: 'info', provisional: true, playerIds: [a.playerId, b.playerId],
        message: `${nameOf(a.playerId)} and ${nameOf(b.playerId)} finish ${Math.round(gap * 10) / 10} yards apart.`,
        options: ['Change one route or its depth.', 'Leave it if the crowding is intended (a rub or a pick-the-zone look).'],
      });
    }
  }

  // Only worth saying once the coach has started assigning players.
  if (play.assignments.length) {
    const idle = play.players.filter(p => p.role !== 'QB' && !LINEMEN.has(p.role) && !play.assignments.some(a => a.playerId === p.id));
    if (idle.length) {
      findings.push({
        code: 'assignment.missing', severity: 'info', playerIds: idle.map(p => p.id),
        message: `No assignment yet: ${idle.map(p => nameOf(p.id)).join(', ')}.`,
        options: ['Give each of them a route, a block or a protection.'],
      });
    }
  }
  return findings;
}
