import { useEffect, useMemo } from 'react';
import { BufferAttribute, BufferGeometry, DoubleSide, PlaneGeometry } from 'three';
import { buildMarkings, NUMBER_PLATE, type MarkRect } from '../model/markings';
import { FIELD_WIDTH_YD, type Ruleset } from '../model/field';
import { COLORS, LOS_WIDTH_YD } from './constants';
import { makeEndZoneTexture, makeTurfTexture, makeYardNumberTexture, TextureBag } from './textures';

/** Layer heights (yd) keep coplanar paint from z-fighting while staying visually flat. */
const Y = { surround: -0.02, turf: 0, endZone: 0.002, lines: 0.005, numbers: 0.006, los: 0.009 };

/** Merge every painted rectangle into one geometry: a single draw call for all lines. */
function rectsGeometry(rects: readonly MarkRect[], y: number): BufferGeometry {
  const pos = new Float32Array(rects.length * 18);
  rects.forEach((r, i) => {
    // World: x = xYd, z = −yYd.
    const x0 = r.x0, x1 = r.x1, z0 = -r.y0, z1 = -r.y1;
    pos.set([x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z0, x1, y, z1, x0, y, z1], i * 18);
  });
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.computeBoundingSphere();
  return g;
}

function arrowGeometry(): BufferGeometry {
  // Tip toward −Z (downfield / +y) in local space; rotated per mark.
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array([0, 0, -0.45, -0.3, 0, 0.3, 0.3, 0, 0.3]), 3));
  return g;
}

export function Field3D({ ruleset, ballOn }: { ruleset: Ruleset; ballOn: number }) {
  const markings = useMemo(() => buildMarkings(ruleset, ballOn), [ruleset, ballOn]);
  const bag = useMemo(() => new TextureBag(), []);
  useEffect(() => () => bag.dispose(), [bag]);

  const lengthYd = markings.bounds.y1 - markings.bounds.y0;
  const centerZ = -(markings.bounds.y0 + markings.bounds.y1) / 2;
  const turf = useMemo(
    // Bands start at the own back line; offset aligns them to 5-yd lines relative to the ball spot.
    () => bag.get(`turf:${ballOn}`, () => makeTurfTexture(lengthYd, FIELD_WIDTH_YD, 0)),
    [bag, ballOn, lengthYd],
  );
  const lineGeo = useMemo(() => rectsGeometry(markings.lines, Y.lines), [markings]);
  const zoneGeo = useMemo(() => rectsGeometry(markings.endZones, Y.endZone), [markings]);
  const arrow = useMemo(() => arrowGeometry(), []);
  const plate = useMemo(() => new PlaneGeometry(NUMBER_PLATE.width, NUMBER_PLATE.height), []);
  const wordPlate = useMemo(() => new PlaneGeometry(34, 6.4), []);
  useEffect(() => () => { lineGeo.dispose(); zoneGeo.dispose(); }, [lineGeo, zoneGeo]);
  useEffect(() => () => { arrow.dispose(); plate.dispose(); wordPlate.dispose(); }, [arrow, plate, wordPlate]);

  const wordmark = bag.get('endzone', () => makeEndZoneTexture('COACH CORE'));

  return (
    <group name="field">
      <mesh rotation-x={-Math.PI / 2} position={[0, Y.surround, centerZ]}>
        <planeGeometry args={[FIELD_WIDTH_YD + 16, lengthYd + 20]} />
        <meshBasicMaterial color={COLORS.surround} />
      </mesh>
      {/* Turf is unlit so its colours match the 2D diagram exactly during the handoff. */}
      <mesh name="turf" rotation-x={-Math.PI / 2} position={[0, Y.turf, centerZ]}>
        <planeGeometry args={[FIELD_WIDTH_YD, lengthYd]} />
        <meshBasicMaterial map={turf} />
      </mesh>
      <mesh geometry={zoneGeo}>
        <meshBasicMaterial color={COLORS.endZone} transparent opacity={0.85} side={DoubleSide} />
      </mesh>
      {markings.endZones.map((z, i) => (
        <mesh key={i} geometry={wordPlate} rotation={[-Math.PI / 2, 0, i === 0 ? Math.PI : 0]} position={[0, Y.numbers, -(z.y0 + z.y1) / 2]}>
          <meshBasicMaterial map={wordmark} transparent depthWrite={false} />
        </mesh>
      ))}
      <mesh name="lines" geometry={lineGeo}>
        <meshBasicMaterial color={COLORS.line} side={DoubleSide} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      {markings.numbers.map(m => {
        const tex = bag.get(`num:${m.n}`, () => makeYardNumberTexture(m.n));
        const turn = m.sideline === 'right' ? Math.PI / 2 : -Math.PI / 2;
        const inward = m.sideline === 'right' ? -1 : 1;
        const arrowY = m.yYd + (m.arrowTowardNegativeY ? -1 : 1) * (NUMBER_PLATE.width / 2 + 0.55);
        return (
          <group key={`${m.n}:${m.yYd}:${m.sideline}`}>
            <group position={[m.xYd, Y.numbers, -m.yYd]} rotation-y={turn}>
              <mesh geometry={plate} rotation-x={-Math.PI / 2}>
                <meshBasicMaterial map={tex} transparent depthWrite={false} />
              </mesh>
            </group>
            {m.n !== 50 && (
              <mesh
                geometry={arrow}
                position={[m.xYd + inward * 0.6, Y.numbers, -arrowY]}
                rotation-y={m.arrowTowardNegativeY ? Math.PI : 0}
              >
                <meshBasicMaterial color={COLORS.line} transparent opacity={0.9} side={DoubleSide} />
              </mesh>
            )}
          </group>
        );
      })}
      <mesh name="los" rotation-x={-Math.PI / 2} position={[0, Y.los, 0]}>
        <planeGeometry args={[FIELD_WIDTH_YD, LOS_WIDTH_YD]} />
        <meshBasicMaterial color={COLORS.los} />
      </mesh>
    </group>
  );
}
