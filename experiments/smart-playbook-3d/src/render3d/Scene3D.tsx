import { Component, useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import type { Camera, WebGLRenderer } from 'three';
import type { CanonicalScene } from '../model/types';
import type { Ruleset } from '../model/field';
import type { CameraPose } from '../view/camera';
import type { CameraPreset, Phase } from '../view/viewMachine';
import { COLORS } from './constants';
import { Field3D } from './Field3D';
import { Players3D, type LiftRef } from './Players3D';
import { Routes3D } from './Routes3D';
import { CameraRig, type RigApi } from './CameraRig';

/** True only if a WebGL context can actually be created here (not merely that the API exists). */
export function canCreateWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') ?? c.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

class GLBoundary extends Component<{ onError: (reason: string) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { this.props.onError(error instanceof Error ? error.message : 'renderer error'); }
  render() { return this.state.failed ? null : this.props.children; }
}

export interface SceneHandle {
  gl: WebGLRenderer | null;
  camera: Camera | null;
  rig: MutableRefObject<RigApi | null>;
}

export function Scene3D(props: {
  scene: CanonicalScene; phase: Phase; preset: CameraPreset; presetRequest: number; matched: CameraPose; reducedMotion: boolean;
  ruleset: Ruleset; ballOn: number; selectedUid: string | null; lift: LiftRef; handle: SceneHandle;
  onSelect: (uid: string | null) => void; onReady: () => void; onLiftDone: () => void; onLowerDone: () => void;
  onContextLost: () => void; onError: (reason: string) => void;
}) {
  const { scene, phase, handle } = props;
  // Players and routes only re-mount when the projected scene changes (i.e. after an explicit edit).
  const players = useMemo(() => scene.players, [scene]);
  return (
    <GLBoundary onError={props.onError}>
      <Canvas
        frameloop="demand"
        flat
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
        camera={{ fov: props.matched.fov, near: 0.5, far: 600, position: [0, 60, 0] }}
        onPointerMissed={() => { if (phase === '3d') props.onSelect(null); }}
        onCreated={({ gl, camera }) => {
          handle.gl = gl;
          handle.camera = camera;
          gl.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); props.onContextLost(); }, { once: true });
          gl.domElement.setAttribute('aria-hidden', 'true');
        }}
        style={{ touchAction: 'none' }}
      >
        <color attach="background" args={[COLORS.ground]} />
        <fog attach="fog" args={[COLORS.ground, 95, 200]} />
        <hemisphereLight args={['#e3ecff', '#0c1f15', 1.1]} />
        <directionalLight position={[-20, 42, 28]} intensity={1.9} />
        <directionalLight position={[24, 18, -30]} intensity={0.45} color="#9fdcff" />
        <Field3D ruleset={props.ruleset} ballOn={props.ballOn} />
        <Routes3D routes={scene.routes} selectedUid={props.selectedUid} />
        <Players3D players={players} lift={props.lift} selectedUid={props.selectedUid} onSelect={props.onSelect} />
        <CameraRig
          phase={phase} preset={props.preset} presetRequest={props.presetRequest} matched={props.matched} reducedMotion={props.reducedMotion}
          lift={props.lift} apiRef={handle.rig}
          onReady={props.onReady} onLiftDone={props.onLiftDone} onLowerDone={props.onLowerDone}
        />
      </Canvas>
    </GLBoundary>
  );
}
