import { useEffect, useMemo } from 'react';
import { BufferAttribute, BufferGeometry, DoubleSide } from 'three';
import type { SceneRoute, YardPoint } from '../model/types';
import { COLORS, ROUTE_WIDTH_YD } from './constants';

const ROUTE_Y = 0.03;
const HEAD_LEN = 0.95;
const HEAD_HALF = 0.55;

/** Flat ribbon along a yard polyline with mitred joins, ending where the arrowhead begins. */
export function ribbonGeometry(points: readonly YardPoint[], width = ROUTE_WIDTH_YD): BufferGeometry | null {
  if (points.length < 2) return null;
  const pts = points.map(p => [p.xYd, -p.yYd] as [number, number]);
  // Shorten the final segment so the ribbon does not poke through the arrowhead tip.
  const [ax, az] = pts[pts.length - 2], [bx, bz] = pts[pts.length - 1];
  const last = Math.hypot(bx - ax, bz - az);
  if (last > HEAD_LEN) pts[pts.length - 1] = [bx - ((bx - ax) / last) * HEAD_LEN * 0.8, bz - ((bz - az) / last) * HEAD_LEN * 0.8];

  const half = width / 2;
  const left: [number, number][] = [], right: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[Math.max(0, i - 1)], next = pts[Math.min(pts.length - 1, i + 1)];
    let dx = next[0] - prev[0], dz = next[1] - prev[1];
    const len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;
    // Mitre length clamp keeps sharp breaks (e.g. curl) from spiking.
    let scale = 1;
    if (i > 0 && i < pts.length - 1) {
      const ix = pts[i][0] - prev[0], iz = pts[i][1] - prev[1];
      const il = Math.hypot(ix, iz) || 1;
      const cos = (ix / il) * dx + (iz / il) * dz;
      scale = Math.min(2.2, 1 / Math.max(0.35, cos));
    }
    const nx = -dz * half * scale, nz = dx * half * scale;
    left.push([pts[i][0] + nx, pts[i][1] + nz]);
    right.push([pts[i][0] - nx, pts[i][1] - nz]);
  }
  const pos: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [l0, r0, l1, r1] = [left[i], right[i], left[i + 1], right[i + 1]];
    pos.push(l0[0], ROUTE_Y, l0[1], r0[0], ROUTE_Y, r0[1], l1[0], ROUTE_Y, l1[1]);
    pos.push(r0[0], ROUTE_Y, r0[1], r1[0], ROUTE_Y, r1[1], l1[0], ROUTE_Y, l1[1]);
  }
  // Arrowhead at the true final point.
  const ux = (bx - ax) / (last || 1), uz = (bz - az) / (last || 1);
  const baseX = bx - ux * HEAD_LEN, baseZ = bz - uz * HEAD_LEN;
  pos.push(bx, ROUTE_Y, bz, baseX - uz * HEAD_HALF, ROUTE_Y, baseZ + ux * HEAD_HALF, baseX + uz * HEAD_HALF, ROUTE_Y, baseZ - ux * HEAD_HALF);
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.computeBoundingSphere();
  return g;
}

export function Routes3D({ routes, selectedUid }: { routes: readonly SceneRoute[]; selectedUid: string | null }) {
  const geos = useMemo(() => routes.map(r => ({ route: r, geo: ribbonGeometry(r.points) })), [routes]);
  useEffect(() => () => geos.forEach(g => g.geo?.dispose()), [geos]);
  return (
    <group name="routes">
      {geos.map(({ route, geo }) => geo && (
        <mesh key={route.id} geometry={geo} name={`route:${route.id}`} renderOrder={2}>
          <meshBasicMaterial
            color={COLORS.route}
            side={DoubleSide}
            transparent
            opacity={selectedUid && selectedUid !== route.playerId ? 0.38 : 0.96}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
          />
        </mesh>
      ))}
    </group>
  );
}
