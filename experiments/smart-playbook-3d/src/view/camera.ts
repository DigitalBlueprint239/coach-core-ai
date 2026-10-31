import type { CameraPreset } from './viewMachine';
import type { CoordinateProfile } from '../model/profiles';
import { pxToYards } from '../model/profiles';
import { yardsToWorld } from '../model/field';

/**
 * A camera pose orbiting a ground target. polar = 0 looks straight down;
 * azimuth = 0 puts the camera behind the offense (+Z), π/2 on the offense's right sideline.
 * Units are yards (1 world unit = 1 yd).
 */
export interface CameraPose {
  readonly tx: number;
  readonly tz: number;
  readonly r: number;
  readonly polar: number;
  readonly azimuth: number;
  /** Vertical field of view, degrees. */
  readonly fov: number;
}

export const OVERHEAD_FOV = 30;
const DEG = Math.PI / 180;

/**
 * The perspective pose that reproduces a 2D canvas exactly on the ground plane.
 * A pinhole camera looking straight down at a plane maps it with uniform scale, so
 * every ground point (players' bases, routes, lines) lands on the same screen pixel
 * as in the 2D diagram, provided the 3D canvas has the same box as the 2D canvas.
 */
export function matchedOverheadPose(profile: CoordinateProfile, fov = OVERHEAD_FOV): CameraPose {
  const { width, height } = profile.canvasPx;
  const center = pxToYards(profile, { x: width / 2, y: height / 2 });
  const [tx, , tz] = yardsToWorld(center.xYd, center.yYd);
  const visibleHeightYd = height / profile.pxPerYard;
  const r = visibleHeightYd / 2 / Math.tan((fov * DEG) / 2);
  return { tx, tz, r, polar: 0, azimuth: 0, fov };
}

/** Horizontal FOV for a vertical FOV and aspect ratio. */
const horizontalFov = (fovDeg: number, aspect: number) => 2 * Math.atan(Math.tan((fovDeg * DEG) / 2) * aspect);

/** Presets frame the formation box around the LOS; distance grows when the viewport is narrow. */
export function presetPose(preset: CameraPreset, aspect: number): CameraPose {
  const fov = 34;
  const fitHalfWidth = (half: number) => half / Math.tan(horizontalFov(fov, aspect) / 2);
  switch (preset) {
    case 'overhead':
      return { tx: 0, tz: -3, r: Math.max(60, fitHalfWidth(30)), polar: 0.02, azimuth: 0, fov };
    case 'sideline':
      return { tx: 0, tz: -3, r: Math.max(44, fitHalfWidth(16)), polar: 62 * DEG, azimuth: 90 * DEG, fov };
    case 'defense':
      return { tx: 0, tz: -2, r: Math.max(44, fitHalfWidth(24) * 0.8), polar: 56 * DEG, azimuth: 180 * DEG, fov };
    case 'tactical':
    default:
      return { tx: 0, tz: -4, r: Math.max(46, fitHalfWidth(24) * 0.85), polar: 57 * DEG, azimuth: 0, fov };
  }
}

/** Camera position and the exact (roll-free) up vector for a pose; no singularity at polar = 0. */
export function poseToCamera(p: CameraPose) {
  const sp = Math.sin(p.polar), cp = Math.cos(p.polar), sa = Math.sin(p.azimuth), ca = Math.cos(p.azimuth);
  return {
    position: [p.tx + p.r * sp * sa, p.r * cp, p.tz + p.r * sp * ca] as const,
    target: [p.tx, 0, p.tz] as const,
    up: [-cp * sa, sp, -cp * ca] as const,
    fov: p.fov,
  };
}

/** Recover a pose from a camera position and ground target (used to reverse from wherever the user left it). */
export function cameraToPose(position: readonly [number, number, number], target: readonly [number, number, number], fov: number): CameraPose {
  const dx = position[0] - target[0], dy = position[1] - target[1], dz = position[2] - target[2];
  const r = Math.hypot(dx, dy, dz);
  return { tx: target[0], tz: target[2], r, polar: Math.acos(Math.min(1, Math.max(-1, dy / r))), azimuth: Math.atan2(dx, dz), fov };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const shortestAngle = (a: number, b: number) => {
  const d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  return a + d;
};

/**
 * Interpolate two poses. Distance is interpolated in log space so the dolly feels
 * constant-speed; the polar angle leads slightly so the field "tips up" before the camera pulls back.
 */
export function interpolatePose(a: CameraPose, b: CameraPose, t: number): CameraPose {
  const tilt = Math.min(1, t * 1.15);
  return {
    tx: lerp(a.tx, b.tx, t),
    tz: lerp(a.tz, b.tz, t),
    r: Math.exp(lerp(Math.log(a.r), Math.log(b.r), t)),
    polar: lerp(a.polar, b.polar, tilt),
    azimuth: lerp(a.azimuth, shortestAngle(a.azimuth, b.azimuth), t),
    fov: lerp(a.fov, b.fov, t),
  };
}

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Choreography timings (ms). Reduced motion replaces the camera move with a cut under a short fade. */
export const TIMING = Object.freeze({ handoffMs: 220, liftMs: 820, lowerMs: 640, reducedFadeMs: 160 });
