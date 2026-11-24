// What an advisor is allowed to see about a v4 play, and who may ask. Foundation only: nothing calls a provider,
// and no endpoint exists. The response contract is unchanged (advisory.ts): statements only, every basis declared.
import type { AdvisoryRequest } from './advisory';
import { checkPlayV4 } from './checksV4';
import { describeAssignment } from './playEditsV4';
import { resolveGeometry, type PlayDocV4 } from './playDocumentV4';
import type { OffenseRole, Yards } from './types';

/**
 * The football in a play and nothing else. Deliberately absent: team id, creator, roster links, the coach's notes,
 * tags, play name and player labels — free text can hold a young player's name, and none of it is needed to talk
 * about the football.
 */
export type AdvisoryPlay = {
  schemaVersion: 4;
  formation: { name: string; personnel: string; strength: 'left' | 'right' };
  ball: 'left' | 'middle' | 'right';
  level: string;
  ruleProfileId: string;
  players: Array<{ id: string; role: OffenseRole; at: Yards; onLine: boolean; assignments: string[] }>;
  routes: Array<{ playerId: string; path: Yards[] }>;
  defense?: { coverageId?: string; defenders: Array<{ role: string; at: Yards }> };
};

const MAX_QUESTION = 500;

/** Library formations have public names; a coach's own formation name is free text and is replaced. */
export function toAdvisoryPlay(play: PlayDocV4): AdvisoryPlay {
  const geometry = resolveGeometry(play);
  const own = !play.formation.sourceId || play.formation.sourceId.startsWith('team:');
  const result: AdvisoryPlay = {
    schemaVersion: 4,
    formation: { name: own ? 'Custom formation' : play.formation.name, personnel: play.formation.personnel, strength: play.formation.strength },
    ball: play.ball.hash,
    level: play.level,
    ruleProfileId: play.ruleProfileId,
    players: geometry.players.map(p => ({
      ...p,
      // A read's key and rule are free text; only its presence is reported.
      assignments: play.assignments.filter(a => a.playerId === p.id).map(a => (a.kind === 'read' ? 'Read' : describeAssignment(a))),
    })),
    routes: geometry.routes.map(r => ({ playerId: r.playerId, path: r.path })),
  };
  if (play.defense) {
    result.defense = { defenders: geometry.defenders.map(d => ({ role: d.role, at: d.at })) };
    if (play.defense.coverageId) result.defense.coverageId = play.defense.coverageId;
  }
  return result;
}

/** Builds a request for one explicit coach action. Findings are recomputed without the coach's own labels. */
export function buildPlayAdviceRequest(play: PlayDocV4, input: { action: string; question?: string; allowedSourceIds?: string[] }): AdvisoryRequest {
  const anonymous: PlayDocV4 = {
    ...play,
    players: play.players.map(({ label: _label, rosterRef: _rosterRef, ...p }) => {
      void _label;
      void _rosterRef;
      return p;
    }),
  };
  const context: AdvisoryRequest['context'] = { play: toAdvisoryPlay(play), findings: checkPlayV4(anonymous), allowedSourceIds: [...(input.allowedSourceIds ?? [])] };
  const question = input.question?.trim().slice(0, MAX_QUESTION);
  if (question) context.question = question;
  return { capability: 'explain-play', trigger: { kind: 'coach-action', action: input.action }, teamId: play.teamId, context };
}

/**
 * Server-side gate for advice about a stored play. Stricter than `authorizeAdvisoryAccess`: plays are readable by the
 * team's owner only (firestore.rules), so being a listed member is not enough to ask about one. Every value must be
 * read on the server with admin credentials; `verifiedUid` comes from a verified ID token.
 */
export function authorizePlayAdvice(input: {
  verifiedUid: string | null | undefined;
  isAnonymous: boolean;
  team: { id: string; ownerId: string } | null;
  play: { teamId: string; schemaVersion: number } | null;
}): void {
  if (!input.verifiedUid || input.isAnonymous) throw new Error('Advice requires a signed-in coach (verified on the server).');
  if (!input.team || !input.play || input.play.teamId !== input.team.id) throw new Error('That play was not found.');
  if (input.team.ownerId !== input.verifiedUid) throw new Error('That play was not found.');
  if (input.play.schemaVersion !== 4) throw new Error('Advice is available for plays saved in the current format only.');
}
