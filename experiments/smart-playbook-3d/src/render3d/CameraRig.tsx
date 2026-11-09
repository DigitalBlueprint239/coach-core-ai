import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  cameraToPose, easeInOutCubic, interpolatePose, poseToCamera, presetPose, TIMING, type CameraPose,
} from '../view/camera';
import type { CameraPreset, Phase } from '../view/viewMachine';
import type { LiftRef } from './Players3D';
import { FIELD_WIDTH_YD } from '../model/field';

export interface RigApi {
  /** Orbit by keyboard: azimuth/polar deltas in radians, zoom as a distance multiplier. */
  nudge(dAzimuth: number, dPolar: number, zoom: number): void;
  getPose(): CameraPose;
  isAnimating(): boolean;
  /** Force continuous rendering while orbiting for `ms`; resolves with rAF frame intervals (ms). */
  benchmark(ms: number): Promise<number[]>;
}

interface Anim {
  from: CameraPose; to: CameraPose; start: number; duration: number;
  liftFrom: number; liftTo: number; liftCurve: (t: number) => number;
  done: () => void;
}

export function CameraRig({ phase, preset, presetRequest, matched, reducedMotion, lift, apiRef, onReady, onLiftDone, onLowerDone }: {
  phase: Phase; preset: CameraPreset; presetRequest: number; matched: CameraPose; reducedMotion: boolean; lift: LiftRef;
  apiRef: MutableRefObject<RigApi | null>;
  onReady: () => void; onLiftDone: () => void; onLowerDone: () => void;
}) {
  const camera = useThree(s => s.camera) as PerspectiveCamera;
  const gl = useThree(s => s.gl);
  const size = useThree(s => s.size);
  const invalidate = useThree(s => s.invalidate);
  const aspect = size.width / Math.max(1, size.height);

  const anim = useRef<Anim | null>(null);
  const target = useRef<[number, number, number]>([matched.tx, 0, matched.tz]);
  const readyFrames = useRef(-1);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const callbacks = useRef({ onReady, onLiftDone, onLowerDone });
  callbacks.current = { onReady, onLiftDone, onLowerDone };

  const controls = useMemo(() => {
    camera.up.set(0, 1, 0);
    const c = new OrbitControls(camera, gl.domElement);
    c.enabled = false;
    c.enableDamping = true;
    c.dampingFactor = 0.1;
    c.minDistance = 10;
    c.maxDistance = 150;
    c.minPolarAngle = 0.02;
    c.maxPolarAngle = 1.46;
    c.screenSpacePanning = false;
    c.zoomSpeed = 0.9;
    c.rotateSpeed = 0.75;
    return c;
  }, [camera, gl]);

  const apply = (pose: CameraPose) => {
    const c = poseToCamera(pose);
    camera.position.set(...c.position);
    camera.up.set(...c.up);
    camera.lookAt(...c.target);
    if (camera.fov !== c.fov) { camera.fov = c.fov; camera.updateProjectionMatrix(); }
    target.current = [c.target[0], 0, c.target[2]];
  };
  const currentPose = (): CameraPose =>
    cameraToPose([camera.position.x, camera.position.y, camera.position.z], target.current, camera.fov);

  const enableControls = () => {
    camera.up.set(0, 1, 0);
    controls.target.set(...target.current);
    controls.enabled = true;
    controls.update();
    invalidate();
  };
  const disableControls = () => {
    if (controls.enabled) target.current = [controls.target.x, 0, controls.target.z];
    controls.enabled = false;
  };

  const run = (to: CameraPose, duration: number, liftTo: number, done: () => void, liftCurve = (t: number) => t) => {
    disableControls();
    if (duration <= 0) {
      apply(to);
      lift.current = liftTo;
      anim.current = null;
      invalidate();
      done();
      return;
    }
    anim.current = { from: currentPose(), to, start: performance.now(), duration, liftFrom: lift.current, liftTo, liftCurve, done };
    invalidate();
  };

  /** The user grabbed the camera mid-move: stop where we are and hand over control. */
  const interrupt = () => {
    const a = anim.current;
    if (!a) return;
    anim.current = null;
    lift.current = Math.max(lift.current, a.liftTo);
    a.done();
  };

  useEffect(() => {
    const onChange = () => {
      // Keep the orbit target on the field so the play cannot be lost off-screen.
      const t = controls.target;
      t.x = Math.max(-FIELD_WIDTH_YD / 2, Math.min(FIELD_WIDTH_YD / 2, t.x));
      t.z = Math.max(-60, Math.min(40, t.z));
      t.y = 0;
      invalidate();
    };
    controls.addEventListener('change', onChange);
    const onDown = () => { if (anim.current && (phaseRef.current === 'lifting' || phaseRef.current === '3d')) interrupt(); };
    gl.domElement.addEventListener('pointerdown', onDown);
    gl.domElement.addEventListener('wheel', onDown, { passive: true });
    return () => {
      controls.removeEventListener('change', onChange);
      gl.domElement.removeEventListener('pointerdown', onDown);
      gl.domElement.removeEventListener('wheel', onDown);
      controls.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls, gl, invalidate]);

  // Prewarm: when mounted in the background, draw one matched frame so programs and textures are ready.
  useLayoutEffect(() => {
    if (phaseRef.current === '2d') { apply(matched); lift.current = 0; invalidate(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    switch (phase) {
      case '2d':
        anim.current = null;
        disableControls();
        break;
      case 'preparing':
        anim.current = null;
        disableControls();
        if (reducedMotion) { apply(presetPose(preset, aspect)); lift.current = 1; } else { apply(matched); lift.current = 0; }
        readyFrames.current = 0;
        invalidate();
        break;
      case 'lifting':
        if (reducedMotion) { lift.current = 1; callbacks.current.onLiftDone(); break; }
        run(presetPose(preset, aspect), TIMING.liftMs, 1, () => callbacks.current.onLiftDone());
        break;
      case '3d':
        if (!anim.current) enableControls();
        break;
      case 'lowering':
        if (reducedMotion) { disableControls(); callbacks.current.onLowerDone(); break; }
        // Markers settle back to flat discs before the camera arrives overhead.
        run(matched, TIMING.lowerMs, 0, () => callbacks.current.onLowerDone(), t => Math.min(1, t / 0.7));
        break;
      default:
        invalidate();
    }
    // Phase transitions drive the rig; other inputs are read at transition time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Preset requests inside interactive 3D (including re-choosing the current preset after an orbit).
  const lastRequest = useRef(presetRequest);
  useEffect(() => {
    if (lastRequest.current === presetRequest) return;
    lastRequest.current = presetRequest;
    if (phaseRef.current !== '3d') return;
    run(presetPose(preset, aspect), reducedMotion ? 0 : 650, 1, enableControls);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetRequest]);

  // Keep the matched overhead exact if the stage resizes while in a matched phase.
  useEffect(() => {
    if (phaseRef.current === 'preparing' && !reducedMotion) apply(matched);
    if (phaseRef.current === 'handoff-in' || phaseRef.current === 'handoff-out') { if (!reducedMotion) apply(matched); }
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, matched]);

  useEffect(() => {
    apiRef.current = {
      nudge(dAz, dPolar, zoom) {
        if (phaseRef.current !== '3d') return;
        const p = currentPose();
        const to: CameraPose = {
          ...p,
          azimuth: p.azimuth + dAz,
          polar: Math.min(controls.maxPolarAngle, Math.max(controls.minPolarAngle, p.polar + dPolar)),
          r: Math.min(controls.maxDistance, Math.max(controls.minDistance, p.r * zoom)),
        };
        run(to, reducedMotion ? 0 : 200, 1, enableControls);
      },
      getPose: currentPose,
      isAnimating: () => anim.current !== null,
      benchmark(ms) {
        return new Promise(resolve => {
          const intervals: number[] = [];
          const start = performance.now();
          let last = start;
          const base = currentPose();
          const step = (now: number) => {
            intervals.push(now - last);
            last = now;
            apply({ ...base, azimuth: base.azimuth + ((now - start) / ms) * Math.PI * 0.6 });
            invalidate();
            if (now - start < ms) requestAnimationFrame(step);
            else { if (phaseRef.current === '3d') enableControls(); resolve(intervals.slice(2)); }
          };
          disableControls();
          requestAnimationFrame(step);
        });
      },
    };
    return () => { apiRef.current = null; };
  });

  useFrame(() => {
    if (readyFrames.current >= 0) {
      // Two presented frames: the first compiles programs/uploads textures, the second proves we can draw.
      readyFrames.current++;
      if (readyFrames.current >= 2) { readyFrames.current = -1; callbacks.current.onReady(); }
      else invalidate();
    }
    const a = anim.current;
    if (a) {
      const t = Math.min(1, (performance.now() - a.start) / a.duration);
      apply(interpolatePose(a.from, a.to, easeInOutCubic(t)));
      lift.current = a.liftFrom + (a.liftTo - a.liftFrom) * a.liftCurve(t);
      if (t >= 1) { anim.current = null; a.done(); }
      invalidate();
    } else if (controls.enabled && controls.update()) {
      invalidate();
    }
  });

  return null;
}
