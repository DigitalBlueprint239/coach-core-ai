import type { GeometryStatus, ProfileId, StoredPoint, YardPoint } from './types';

/**
 * A coordinate profile is an explicit, versioned statement of how stored canvas
 * pixels map to football yards. Profiles are never selected by looking at pixel values.
 */
export interface CoordinateProfile {
  readonly id: ProfileId;
  readonly label: string;
  /** Canvas pixel that is the ball at the line of scrimmage. */
  readonly originPx: StoredPoint;
  readonly pxPerYard: number;
  /** Canvas size the stored pixels were authored against. */
  readonly canvasPx: { readonly width: number; readonly height: number };
  /** 'verified' = documented by source code; 'classified' = a human assertion that is not coach-verified. */
  readonly certification: Exclude<GeometryStatus, 'unverified'>;
  readonly contract: string;
}

export const PROFILES: Readonly<Record<ProfileId, CoordinateProfile>> = Object.freeze({
  'cc-halffield-px-v1': Object.freeze({
    id: 'cc-halffield-px-v1',
    label: 'Coach Core half-field v1 (LOS y=190, 10 px/yd, offense attacks up)',
    originPx: Object.freeze({ x: 300, y: 190 }),
    pxPerYard: 10,
    canvasPx: Object.freeze({ width: 600, height: 300 }),
    certification: 'verified',
    contract:
      'PR #91 @916919c SmartPlaybook.tsx:462 createPlayer(300+x_yards*10, 190-y_yards*10); Field.js:244 LOS at y=190.',
  }),
  'legacy-shotgun-px-test-classification': Object.freeze({
    id: 'legacy-shotgun-px-test-classification',
    label: 'Legacy shotgunFormation(300,150) — TEST-ONLY classification',
    originPx: Object.freeze({ x: 300, y: 150 }),
    pxPerYard: 24,
    canvasPx: Object.freeze({ width: 600, height: 300 }),
    certification: 'classified',
    contract:
      'Hypothetical classification for tests: ball at (300,150), 24 px/yd so the 48 px OL spacing reads as 2 yd, ' +
      'upfield = −y. NOT confirmed by a coach; legacy Field.js draws no LOS, so this cannot be derived from source.',
  }),
});

export const getProfile = (id: ProfileId): CoordinateProfile => {
  const profile = PROFILES[id];
  if (!profile) throw new Error(`Unknown coordinate profile: ${String(id)}`);
  return profile;
};

/** Pixel → yards. Pure arithmetic: no clamping, no rounding, off-field values pass through. */
export const pxToYards = (profile: CoordinateProfile, p: StoredPoint): YardPoint => ({
  xYd: (p.x - profile.originPx.x) / profile.pxPerYard,
  yYd: (profile.originPx.y - p.y) / profile.pxPerYard,
});

/** Yards → pixel. Exact inverse of pxToYards. */
export const yardsToPx = (profile: CoordinateProfile, p: YardPoint): StoredPoint => ({
  x: profile.originPx.x + p.xYd * profile.pxPerYard,
  y: profile.originPx.y - p.yYd * profile.pxPerYard,
});
