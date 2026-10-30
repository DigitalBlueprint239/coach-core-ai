import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PlayEnvelope, StoredPoint } from '../model/types';
import type { CoordinateProfile } from '../model/profiles';
import type { Ruleset } from '../model/field';
import { MARKER_DISC_RADIUS_YD } from '../render3d/constants';
import { CANVAS_H, CANVAS_W, hitTest, paint2D, RAW_MARKER_RADIUS_PX } from './paint2d';

/**
 * The 2D diagram: draws the stored plays at their stored pixels on the 600×300 authoring
 * canvas, scaled to its CSS box at device resolution. Dragging edits the in-memory draft only.
 */
export function Field2D({ envelopes, fieldProfile, rawModeLabel, ruleset, ballOn, selectedUid, editable, onSelect, onMove }: {
  envelopes: readonly PlayEnvelope[]; fieldProfile: CoordinateProfile | null; rawModeLabel: string;
  ruleset: Ruleset; ballOn: number; selectedUid: string | null; editable: boolean;
  onSelect: (uid: string | null) => void;
  onMove: (playKey: string, playerId: string, to: StoredPoint) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState({ w: CANVAS_W, dpr: 1 });
  const drag = useRef<{ playKey: string; id: string; dx: number; dy: number; pointer: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current!;
    const measure = () => setBox({ w: el.getBoundingClientRect().width || CANVAS_W, dpr: window.devicePixelRatio || 1 });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current!;
    const scale = (box.w / CANVAS_W) * box.dpr;
    const w = Math.round(CANVAS_W * scale), h = Math.round(CANVAS_H * scale);
    if (el.width !== w || el.height !== h) { el.width = w; el.height = h; }
    const ctx = el.getContext('2d')!;
    ctx.setTransform(w / CANVAS_W, 0, 0, h / CANVAS_H, 0, 0);
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    paint2D(ctx, { envelopes, fieldProfile, rawModeLabel, ruleset, ballOn, selectedUid });
  }, [envelopes, fieldProfile, rawModeLabel, ruleset, ballOn, selectedUid, box]);

  const toCanvas = (e: React.PointerEvent): StoredPoint => {
    const r = ref.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * CANVAS_W, y: ((e.clientY - r.top) / r.height) * CANVAS_H };
  };
  const hitRadius = (fieldProfile ? MARKER_DISC_RADIUS_YD * fieldProfile.pxPerYard : RAW_MARKER_RADIUS_PX) * 1.45;

  return (
    <canvas
      ref={ref}
      className="field2d"
      data-testid="field-2d"
      role="img"
      aria-label="2D play diagram"
      onPointerDown={e => {
        const at = toCanvas(e);
        const hit = hitTest(envelopes, at, hitRadius);
        onSelect(hit ? hit.uid : null);
        if (hit && editable) {
          const p = envelopes.find(x => x.key === hit.playKey)!.play.players.find(x => x.id === hit.id)!;
          drag.current = { playKey: hit.playKey, id: hit.id, dx: p.x - at.x, dy: p.y - at.y, pointer: e.pointerId };
          e.currentTarget.setPointerCapture(e.pointerId);
        }
      }}
      onPointerMove={e => {
        const d = drag.current;
        if (!d || d.pointer !== e.pointerId) return;
        const at = toCanvas(e);
        onMove(d.playKey, d.id, { x: Math.round((at.x + d.dx) * 10) / 10, y: Math.round((at.y + d.dy) * 10) / 10 });
      }}
      onPointerUp={() => { drag.current = null; }}
      onPointerCancel={() => { drag.current = null; }}
    />
  );
}
