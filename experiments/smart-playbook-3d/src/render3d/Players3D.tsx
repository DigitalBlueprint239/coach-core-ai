import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import {
  CapsuleGeometry, CylinderGeometry, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry,
  RingGeometry, Sprite, Vector3, type Intersection, type Mesh, type Raycaster,
} from 'three';
import type { ScenePlayer } from '../model/types';
import {
  COLORS, MARKER_BODY_HEIGHT_YD, MARKER_BODY_RADIUS_YD, MARKER_DISC_RADIUS_YD, MARKER_FLAT_TOP_YD,
} from './constants';
import { makeBlobShadowTexture, makeDiscLabelTexture, makeTagTexture, TAG_SIZE, TextureBag } from './textures';
import { declutter, type LabelBox } from '../view/declutter';
import { tagLayout } from '../debug';

/** 0 = flat diagram markers (matched to 2D), 1 = full tactical markers. Written by the camera rig. */
export type LiftRef = MutableRefObject<number>;
/** Screen distance (px) a press may travel and still count as a tap/click rather than an orbit drag. */
const CLICK_SLOP_PX = 6;
/** Below this canvas width (CSS px) tags go compact (role only) and overlapping tags are hidden. */
const COMPACT_STAGE_PX = 640;
const TAG_HEIGHT_YD = 1.16;
const tagWidthYd = (compact: boolean) => {
  const [w, h] = compact ? TAG_SIZE.compact : TAG_SIZE.full;
  return (TAG_HEIGHT_YD * w) / h;
};
const tagY = (rise: number) => MARKER_BODY_HEIGHT_YD * rise + 0.85;
/** Per-uid tag visibility (0–1, eased), owned by Players3D and read by each Marker. */
type TagVis = Map<string, number>;

/** Faded-out tags must not catch taps meant for the player behind them. */
function raycastWhenShown(this: Sprite, raycaster: Raycaster, hits: Intersection[]) {
  if ((this.material as { opacity: number }).opacity < 0.05) return;
  Sprite.prototype.raycast.call(this, raycaster, hits);
}

const smooth = (a: number, b: number, t: number) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

interface Shared {
  disc: CylinderGeometry; ring: RingGeometry; body: CapsuleGeometry; plane: PlaneGeometry;
  discMat: Record<'offense' | 'defense' | 'unknown', MeshBasicMaterial>;
  rimMat: MeshBasicMaterial;
  bodyMat: Record<'offense' | 'defense' | 'unknown', MeshStandardMaterial>;
  selectMat: MeshBasicMaterial;
}

function useShared(): Shared {
  const shared = useMemo<Shared>(() => ({
    disc: new CylinderGeometry(MARKER_DISC_RADIUS_YD, MARKER_DISC_RADIUS_YD, MARKER_FLAT_TOP_YD, 40),
    ring: new RingGeometry(MARKER_DISC_RADIUS_YD + 0.1, MARKER_DISC_RADIUS_YD + 0.3, 48),
    body: new CapsuleGeometry(MARKER_BODY_RADIUS_YD, MARKER_BODY_HEIGHT_YD - 2 * MARKER_BODY_RADIUS_YD, 6, 18),
    plane: new PlaneGeometry(1, 1),
    discMat: {
      offense: new MeshBasicMaterial({ color: COLORS.offense }),
      defense: new MeshBasicMaterial({ color: COLORS.defense }),
      unknown: new MeshBasicMaterial({ color: COLORS.unknown }),
    },
    rimMat: new MeshBasicMaterial({ color: '#0A0F1A', transparent: true, opacity: 0.55 }),
    bodyMat: {
      offense: new MeshStandardMaterial({ color: '#D9E4F2', roughness: 0.48, metalness: 0.05 }),
      defense: new MeshStandardMaterial({ color: '#D8434A', roughness: 0.5, metalness: 0.05 }),
      unknown: new MeshStandardMaterial({ color: COLORS.unknown, roughness: 0.6 }),
    },
    selectMat: new MeshBasicMaterial({ color: COLORS.select }),
  }), []);
  useEffect(() => () => {
    const s = shared;
    [s.disc, s.ring, s.body, s.plane].forEach(g => g.dispose());
    [...Object.values(s.discMat), ...Object.values(s.bodyMat), s.rimMat, s.selectMat].forEach(m => m.dispose());
  }, [shared]);
  return shared;
}

function Marker({ player, shared, bag, lift, selected, compact, vis, onSelect }: {
  player: ScenePlayer; shared: Shared; bag: TextureBag; lift: LiftRef; selected: boolean; compact: boolean;
  vis: TagVis; onSelect: (uid: string) => void;
}) {
  const body = useRef<Mesh>(null);
  const tag = useRef<Sprite>(null);
  const shadow = useRef<Mesh>(null);
  const side = player.side;
  const ink = side === 'defense' ? COLORS.defenseInk : COLORS.offenseInk;
  const discLabel = bag.get(`disc:${player.label}:${ink}`, () => makeDiscLabelTexture(player.label, ink));
  const tagTex = bag.get(`tag:${player.label}:${player.number}:${side}:${compact ? 'c' : 'f'}`, () =>
    makeTagTexture(player.label, player.number, side === 'defense' ? COLORS.defense : COLORS.select, compact));
  const shadowTex = bag.get('shadow', makeBlobShadowTexture);

  useFrame(() => {
    const t = lift.current;
    const rise = smooth(0.18, 0.92, t);
    // Objects stay `visible` (so prewarm compiles their programs) and are hidden by scale/opacity instead.
    if (body.current) {
      body.current.scale.set(rise > 0.002 ? 1 : 0.001, Math.max(rise, 0.001), rise > 0.002 ? 1 : 0.001);
      body.current.position.y = (MARKER_BODY_HEIGHT_YD / 2) * rise + MARKER_FLAT_TOP_YD;
    }
    if (tag.current) {
      const show = smooth(0.62, 1, t) * (vis.get(player.uid) ?? 1);
      (tag.current.material as { opacity: number }).opacity = show;
      tag.current.position.y = tagY(rise);
    }
    if (shadow.current) {
      (shadow.current.material as { opacity: number }).opacity = 0.6 * rise;
    }
  });

  // A press that travelled (orbit drag ending over a player) is not a selection.
  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (e.delta > CLICK_SLOP_PX) return; onSelect(player.uid); };

  return (
    <group position={[player.xYd, 0, -player.yYd]} name={`player:${player.uid}`} onClick={click}
      onPointerOver={e => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = ''; }}>
      <mesh ref={shadow} rotation-x={-Math.PI / 2} position-y={0.004} scale={2.6} geometry={shared.plane}>
        <meshBasicMaterial map={shadowTex} transparent depthWrite={false} opacity={0} />
      </mesh>
      <mesh geometry={shared.ring} rotation-x={-Math.PI / 2} position-y={0.003} scale={1.06} material={shared.rimMat} />
      <mesh geometry={shared.disc} material={shared.discMat[side]} position-y={MARKER_FLAT_TOP_YD / 2} />
      {/* Same label the 2D diagram prints inside the disc; upright when viewed from behind the offense. */}
      <mesh geometry={shared.plane} rotation-x={-Math.PI / 2} position-y={MARKER_FLAT_TOP_YD + 0.001}
        scale={MARKER_DISC_RADIUS_YD * 2}>
        <meshBasicMaterial map={discLabel} transparent depthWrite={false} />
      </mesh>
      {selected && (
        <mesh geometry={shared.ring} rotation-x={-Math.PI / 2} position-y={MARKER_FLAT_TOP_YD + 0.004} material={shared.selectMat} />
      )}
      <mesh ref={body} geometry={shared.body} material={shared.bodyMat[side]} scale={0.001} />
      <sprite ref={tag} scale={[tagWidthYd(compact), TAG_HEIGHT_YD, 1]} raycast={raycastWhenShown}>
        <spriteMaterial map={tagTex} transparent depthTest={false} opacity={0} />
      </sprite>
    </group>
  );
}

export function Players3D({ players, lift, selectedUid, onSelect }: {
  players: readonly ScenePlayer[]; lift: LiftRef; selectedUid: string | null; onSelect: (uid: string | null) => void;
}) {
  const shared = useShared();
  const bag = useMemo(() => new TextureBag(), []);
  useEffect(() => () => bag.dispose(), [bag]);
  const width = useThree(s => s.size.width);
  const compact = width < COMPACT_STAGE_PX;
  const vis = useMemo<TagVis>(() => new Map(), []);
  const selectedRef = useRef(selectedUid);
  selectedRef.current = selectedUid;
  const tmp = useMemo(() => new Vector3(), []);
  const inView = useMemo(() => new Vector3(), []);

  // Lay tags out in screen space; on compact stages hide the ones that would overlap a higher-priority tag
  // (selected player first, then nearest the camera). Visibility eases so tags fade rather than pop.
  useFrame(({ camera, size, invalidate }, dt) => {
    const cam = camera as PerspectiveCamera;
    cam.updateMatrixWorld();
    const rise = smooth(0.18, 0.92, lift.current);
    const wYd = tagWidthYd(compact);
    const pxPerYdAt1 = size.height / 2 / Math.tan((cam.fov * Math.PI) / 360);
    const boxes: LabelBox[] = [];
    const depth = new Map<string, number>();
    for (const p of players) {
      tmp.set(p.xYd, tagY(rise), -p.yYd);
      const d = -inView.copy(tmp).applyMatrix4(cam.matrixWorldInverse).z;
      tmp.project(cam);
      const ppy = pxPerYdAt1 / Math.max(d, 0.01);
      depth.set(p.uid, d);
      boxes.push({ id: p.uid, x: ((tmp.x + 1) / 2) * size.width, y: ((1 - tmp.y) / 2) * size.height, w: wYd * ppy, h: TAG_HEIGHT_YD * ppy });
    }
    let shown: Set<string>;
    if (compact) {
      const sel = selectedRef.current;
      const order = players.map(p => p.uid).sort((a, b) => (a === sel ? -1 : b === sel ? 1 : depth.get(a)! - depth.get(b)!));
      shown = declutter(boxes, order);
    } else {
      shown = new Set(players.map(p => p.uid));
    }
    let settling = false;
    const k = Math.min(1, dt * 12);
    for (const p of players) {
      const target = shown.has(p.uid) ? 1 : 0;
      const v = vis.get(p.uid) ?? target;
      const next = Math.abs(target - v) < 0.01 ? target : v + (target - v) * k;
      if (next !== target) settling = true;
      vis.set(p.uid, next);
    }
    if (settling) invalidate();
    tagLayout.compact = compact;
    tagLayout.entries = boxes.map(b => ({ uid: b.id, x: b.x, y: b.y, w: b.w, h: b.h, shown: shown.has(b.id) }));
  });

  return (
    <group name="players">
      {players.map(p => (
        <Marker key={p.uid} player={p} shared={shared} bag={bag} lift={lift} selected={p.uid === selectedUid}
          compact={compact} vis={vis} onSelect={onSelect} />
      ))}
    </group>
  );
}
