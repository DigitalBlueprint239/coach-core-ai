import { getProfile, pxToYards } from './profiles';
import { FIELD_WIDTH_YD } from './field';
import type {
  CanonicalScene, GeometryStatus, PlayEnvelope, ProfileId, ProjectionResult,
  SceneRoute, ScenePlayer, Side, StoredPoint,
} from './types';

/** Recursively freeze a value so renderers cannot mutate scene geometry by accident. */
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}

const finitePoint = (p: StoredPoint | undefined): boolean =>
  !!p && Number.isFinite(p.x) && Number.isFinite(p.y);

const sideOf = (phase: string | undefined): Side =>
  phase === 'offense' ? 'offense' : phase === 'defense' ? 'defense' : 'unknown';

export const playerUid = (playKey: string, id: string) => `${playKey}/${id}`;

/**
 * Project one or more stored plays into a single read-only canonical scene.
 *
 * Contract:
 *  - Reads only. Never writes to, normalizes, or re-keys the stored plays.
 *  - Each play must carry an explicit profile in its provenance; a missing profile
 *    makes the whole result `unverified` and no yard geometry is produced.
 *  - Off-field and odd coordinates are reported, never clamped or moved.
 */
export function projectPlays(envelopes: readonly PlayEnvelope[]): ProjectionResult {
  const warnings: string[] = [];
  const unprofiled = envelopes.filter(e => e.provenance.profileId === null);
  if (envelopes.length === 0) {
    return deepFreeze({ status: 'unverified', warnings: ['No play loaded.'] });
  }
  if (unprofiled.length > 0) {
    for (const e of unprofiled) {
      warnings.push(
        `"${e.play.name}": coordinate profile unknown (${e.provenance.source}). ` +
        'Pixels are shown as stored in 2D; 3D alignment is unverified and has been withheld.',
      );
    }
    return deepFreeze({ status: 'unverified', warnings });
  }

  let status: GeometryStatus = 'verified';
  const profileIds: ProfileId[] = [];
  const players: ScenePlayer[] = [];
  const routes: SceneRoute[] = [];
  const seenUids = new Set<string>();

  for (const envelope of envelopes) {
    const profile = getProfile(envelope.provenance.profileId as ProfileId);
    if (!profileIds.includes(profile.id)) profileIds.push(profile.id);
    if (profile.certification === 'classified') {
      status = 'classified';
      warnings.push(
        `"${envelope.play.name}": alignment is CLASSIFIED, not verified — ${envelope.provenance.classifiedBy ?? 'unattributed'}. ` +
        'Treat 3D positions as an interpretation pending coach confirmation.',
      );
    }
    const side = sideOf(envelope.play.phase);
    const known = new Set<string>();

    for (const stored of envelope.play.players) {
      if (!finitePoint(stored)) {
        warnings.push(`"${envelope.play.name}": player ${stored.id} has non-finite coordinates and is not drawn in 3D.`);
        continue;
      }
      const uid = playerUid(envelope.key, stored.id);
      if (seenUids.has(uid)) {
        warnings.push(`"${envelope.play.name}": duplicate player id ${stored.id}; only the first is drawn in 3D.`);
        continue;
      }
      seenUids.add(uid);
      known.add(stored.id);
      const yd = pxToYards(profile, stored);
      if (Math.abs(yd.xYd) > FIELD_WIDTH_YD / 2) {
        warnings.push(`"${envelope.play.name}": player ${stored.position ?? stored.id} is outside the sideline as stored; shown unmoved.`);
      }
      players.push({
        uid,
        id: stored.id,
        label: typeof stored.position === 'string' && stored.position ? stored.position : stored.id,
        number: typeof stored.number === 'number' ? stored.number : undefined,
        side,
        playKey: envelope.key,
        ...yd,
      });
    }

    for (const stored of envelope.play.routes) {
      if (!known.has(stored.playerId)) {
        warnings.push(`"${envelope.play.name}": route ${stored.id} refers to a missing player and is not drawn.`);
        continue;
      }
      // Same precedence as persistence routesForView(): `path` is used only when `points` is absent.
      const sourceKey: SceneRoute['sourceKey'] = stored.points === undefined && Array.isArray(stored.path) ? 'path' : 'points';
      const raw = (sourceKey === 'path' ? stored.path : stored.points) ?? [];
      if (!raw.every(finitePoint)) {
        warnings.push(`"${envelope.play.name}": route ${stored.id} has invalid coordinates and is not drawn.`);
        continue;
      }
      routes.push({
        id: stored.id,
        playerId: playerUid(envelope.key, stored.playerId),
        points: raw.map(p => pxToYards(profile, p)),
        sourceKey,
        illustrative: envelope.illustrativeRoutes === true,
      });
    }
  }

  const prototypeComposition = envelopes.length > 1;
  if (prototypeComposition) {
    warnings.push(
      `Preview composition: ${envelopes.length} independent stored plays shown together. ` +
      'The saved-play model does not yet support one play with both sides.',
    );
  }

  const scene: CanonicalScene = {
    status: status as CanonicalScene['status'],
    profileIds, players, routes, warnings, prototypeComposition,
  };
  return deepFreeze(scene);
}
