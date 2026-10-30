import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { cameraToPose, interpolatePose, matchedOverheadPose, poseToCamera, presetPose } from '../../src/view/camera';
import { PROFILES, yardsToPx } from '../../src/model/profiles';
import { yardsToWorld } from '../../src/model/field';
import { initialViewState, viewReducer } from '../../src/view/viewMachine';
import { MARKER_FLAT_TOP_YD } from '../../src/render3d/constants';

/** Project a world point through a configured camera to 2D-canvas pixels (600×300 box). */
function toCanvasPx(cam: PerspectiveCamera, world: [number, number, number], w = 600, h = 300) {
  const v = new Vector3(...world).project(cam);
  return { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h };
}

function cameraFor(pose: ReturnType<typeof matchedOverheadPose>, aspect = 2) {
  const c = poseToCamera(pose);
  const cam = new PerspectiveCamera(c.fov, aspect, 0.1, 1000);
  cam.position.set(...c.position);
  cam.up.set(...c.up);
  cam.lookAt(...c.target);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return cam;
}

describe('matched overhead pose', () => {
  for (const profile of Object.values(PROFILES)) {
    it(`puts ground points on the same canvas pixel as the 2D diagram (${profile.id})`, () => {
      const cam = cameraFor(matchedOverheadPose(profile));
      let worst = 0;
      for (const [x, y] of [[0, 0], [-18, 0], [18, 0], [0, -5], [-11, -2], [7, 12], [-26.67, 15], [20, -9]]) {
        const expected = yardsToPx(profile, { xYd: x, yYd: y });
        const got = toCanvasPx(cam, yardsToWorld(x, y));
        worst = Math.max(worst, Math.abs(got.x - expected.x), Math.abs(got.y - expected.y));
      }
      // Sub-pixel on the 600×300 authoring canvas == ≤ 0.01 yd at 10 px/yd.
      expect(worst).toBeLessThan(0.1);
    });
  }

  it('keeps flat-marker parallax within 0.01 yd at the widest receiver in the matched state', () => {
    const cam = cameraFor(matchedOverheadPose(PROFILES['cc-halffield-px-v1']));
    const ground = toCanvasPx(cam, [26.67, 0, 0]);
    const top = toCanvasPx(cam, [26.67, MARKER_FLAT_TOP_YD, 0]);
    // 10 px/yd on the authoring canvas, so 0.01 yd == 0.1 px.
    expect(Math.hypot(top.x - ground.x, top.y - ground.y) / 10).toBeLessThanOrEqual(0.01);
  });
});

describe('pose math', () => {
  it('round-trips pose → camera → pose', () => {
    for (const preset of ['tactical', 'sideline', 'defense', 'overhead'] as const) {
      const p = presetPose(preset, 1.6);
      const c = poseToCamera(p);
      const back = cameraToPose(c.position, c.target, c.fov);
      expect(back.r).toBeCloseTo(p.r, 9);
      expect(back.polar).toBeCloseTo(p.polar, 9);
      expect(Math.cos(back.azimuth)).toBeCloseTo(Math.cos(p.azimuth), 9);
    }
  });

  it('produces a unit up vector perpendicular to the view direction (no roll, no singularity)', () => {
    for (const polar of [0, 0.3, 1, 1.4]) {
      const c = poseToCamera({ tx: 0, tz: 0, r: 50, polar, azimuth: 0.7, fov: 30 });
      const up = new Vector3(...c.up), off = new Vector3(...c.position).sub(new Vector3(...c.target));
      expect(up.length()).toBeCloseTo(1, 9);
      expect(up.dot(off)).toBeCloseTo(0, 6);
    }
  });

  it('interpolates endpoints exactly and takes the short way round in azimuth', () => {
    const a = matchedOverheadPose(PROFILES['cc-halffield-px-v1']);
    const b = presetPose('defense', 2);
    const start = interpolatePose(a, b, 0);
    for (const k of ['tx', 'tz', 'r', 'polar', 'azimuth', 'fov'] as const) expect(start[k]).toBeCloseTo(a[k], 9);
    const end = interpolatePose(a, b, 1);
    expect(end.r).toBeCloseTo(b.r, 9);
    expect(end.polar).toBeCloseTo(b.polar, 9);
    const mid = interpolatePose({ ...b, azimuth: 3.0 }, { ...b, azimuth: -3.0 }, 0.5);
    expect(Math.abs(Math.abs(mid.azimuth) - Math.PI)).toBeLessThan(0.01);
  });

  it('pulls back on narrow (phone) viewports so the formation still fits', () => {
    expect(presetPose('tactical', 0.5).r).toBeGreaterThan(presetPose('tactical', 2).r);
  });
});

describe('view state machine', () => {
  const go3d = { type: 'REQUEST_3D', canRender3d: true, geometryAvailable: true } as const;

  it('runs the full A→F choreography and back', () => {
    let s = viewReducer(initialViewState, go3d);
    expect(s.phase).toBe('preparing');
    s = viewReducer(s, { type: 'SCENE_READY' }); expect(s.phase).toBe('handoff-in');
    s = viewReducer(s, { type: 'HANDOFF_DONE' }); expect(s.phase).toBe('lifting');
    s = viewReducer(s, { type: 'LIFT_DONE' }); expect(s.phase).toBe('3d');
    s = viewReducer(s, { type: 'REQUEST_2D' }); expect(s.phase).toBe('lowering');
    s = viewReducer(s, { type: 'LOWER_DONE' }); expect(s.phase).toBe('handoff-out');
    s = viewReducer(s, { type: 'HANDOFF_DONE' }); expect(s.phase).toBe('2d');
    expect(s.roundTrips).toBe(1);
  });

  it('reverses mid-lift and mid-handoff', () => {
    const lifting = [go3d, { type: 'SCENE_READY' }, { type: 'HANDOFF_DONE' }] as const;
    const s = lifting.reduce(viewReducer, initialViewState);
    expect(viewReducer(s, { type: 'REQUEST_2D' }).phase).toBe('lowering');
    const handoff = viewReducer(viewReducer(initialViewState, go3d), { type: 'SCENE_READY' });
    expect(viewReducer(handoff, { type: 'REQUEST_2D' }).phase).toBe('handoff-out');
    expect(viewReducer(viewReducer(initialViewState, go3d), { type: 'REQUEST_2D' }).phase).toBe('2d');
  });

  it('refuses 3D without WebGL or verified/classified geometry, staying in 2D with a notice', () => {
    const noGl = viewReducer(initialViewState, { ...go3d, canRender3d: false });
    expect(noGl.phase).toBe('2d');
    expect(noGl.notice).toMatch(/WebGL/);
    const noGeo = viewReducer(initialViewState, { ...go3d, geometryAvailable: false });
    expect(noGeo.phase).toBe('2d');
    expect(noGeo.notice).toMatch(/unverified/);
  });

  it('falls back to 2D on context loss and bumps the scene epoch for a fresh context', () => {
    const s = [go3d, { type: 'SCENE_READY' }, { type: 'HANDOFF_DONE' }, { type: 'LIFT_DONE' }, { type: 'CONTEXT_LOST' }] as const;
    const end = s.reduce(viewReducer, initialViewState);
    expect(end.phase).toBe('2d');
    expect(end.sceneEpoch).toBe(1);
  });

  it('ignores out-of-order events', () => {
    expect(viewReducer(initialViewState, { type: 'LIFT_DONE' })).toBe(initialViewState);
    expect(viewReducer(initialViewState, { type: 'SCENE_READY' })).toBe(initialViewState);
  });

  it('counts every preset request, so re-choosing the current preset re-frames after an orbit', () => {
    const once = viewReducer(initialViewState, { type: 'SET_PRESET', preset: 'tactical' });
    const twice = viewReducer(once, { type: 'SET_PRESET', preset: 'tactical' });
    expect(once.preset).toBe('tactical');
    expect(twice.presetRequest).toBe(once.presetRequest + 1);
  });
});
