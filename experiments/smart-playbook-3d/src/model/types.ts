/**
 * CC-SP3D-002 — football data model types (experiment only).
 *
 * Three layers, never mixed:
 *  1. StoredPlay        — the play exactly as the persistence layer holds it (pixels, raw keys).
 *  2. CanonicalScene    — read-only football geometry in yards, derived from (1) + an explicit profile.
 *  3. View state        — camera, selection, transition phase. Lives in src/view, never in (1) or (2).
 */

/** A raw stored player. Unknown extra keys (selected, createdAt, …) must survive untouched. */
export interface StoredPlayer {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly position?: string;
  readonly number?: number;
  readonly [extra: string]: unknown;
}

export interface StoredPoint {
  readonly x: number;
  readonly y: number;
}

/** Routes are stored under either `points` (current) or `path` (historical). */
export interface StoredRoute {
  readonly id: string;
  readonly playerId: string;
  readonly points?: readonly StoredPoint[];
  readonly path?: readonly StoredPoint[];
  readonly [extra: string]: unknown;
}

/** Mirrors the allow-listed play fields in src/features/persistence/model.ts (PR #91, blob 7825d1da). */
export interface StoredPlay {
  readonly name: string;
  readonly formation?: string;
  readonly description?: string;
  readonly phase?: 'offense' | 'defense' | 'special_teams';
  readonly type?: string;
  readonly tags?: readonly string[];
  readonly players: readonly StoredPlayer[];
  readonly routes: readonly StoredRoute[];
}

export type ProfileId =
  | 'cc-halffield-px-v1'
  | 'legacy-shotgun-px-test-classification';

/**
 * Where a coordinate interpretation comes from. This is adapter INPUT supplied
 * alongside a play (e.g. by a future coach-confirmation workflow); it is never
 * written into the stored play.
 */
export interface Provenance {
  /** null = nobody has stated how to read these pixels. */
  readonly profileId: ProfileId | null;
  readonly source: string;
  readonly classifiedBy?: string;
}

export interface PlayEnvelope {
  readonly key: string;
  readonly play: StoredPlay;
  readonly provenance: Provenance;
  /** Routes in this fixture were drawn for illustration, not taken from a saved assignment. */
  readonly illustrativeRoutes?: boolean;
}

export type GeometryStatus = 'verified' | 'classified' | 'unverified';

export interface YardPoint {
  /** Lateral yards, + to the offense's right, 0 = ball. */
  readonly xYd: number;
  /** Yards downfield from the LOS, + toward the defense, − offensive backfield. */
  readonly yYd: number;
}

export type Side = 'offense' | 'defense' | 'unknown';

export interface ScenePlayer extends YardPoint {
  /** Render/selection key: `${playKey}/${id}`. The stored id itself is kept unchanged in `id`. */
  readonly uid: string;
  readonly id: string;
  readonly label: string;
  readonly number?: number;
  readonly side: Side;
  readonly playKey: string;
}

export interface SceneRoute {
  readonly id: string;
  readonly playerId: string;
  readonly points: readonly YardPoint[];
  readonly sourceKey: 'points' | 'path';
  readonly illustrative: boolean;
}

export interface CanonicalScene {
  readonly status: Exclude<GeometryStatus, 'unverified'>;
  readonly profileIds: readonly ProfileId[];
  readonly players: readonly ScenePlayer[];
  readonly routes: readonly SceneRoute[];
  readonly warnings: readonly string[];
  /** True when several stored plays were composed for preview. Not a persisted capability. */
  readonly prototypeComposition: boolean;
}

export interface UnverifiedResult {
  readonly status: 'unverified';
  readonly warnings: readonly string[];
}

export type ProjectionResult = CanonicalScene | UnverifiedResult;
