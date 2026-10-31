import type { PlayEnvelope, StoredPoint } from '../model/types';
import { pxToYards, yardsToPx, type CoordinateProfile } from '../model/profiles';
import { buildMarkings, NUMBER_PLATE, type MarkRect } from '../model/markings';
import { FIELD_WIDTH_YD, type Ruleset } from '../model/field';
import { playerUid } from '../model/adapter';
import { COLORS, LOS_WIDTH_YD, MARKER_DISC_RADIUS_YD, ROUTE_WIDTH_YD } from '../render3d/constants';
import { DISPLAY_FONT, turfGrainTile } from '../render3d/textures';

export const CANVAS_W = 600;
export const CANVAS_H = 300;
/** Marker radius used when no football profile exists (raw-pixel mode). */
export const RAW_MARKER_RADIUS_PX = 9;

export interface Paint2DOptions {
  envelopes: readonly PlayEnvelope[];
  /** Football profile for drawing the field; null = raw stored pixels only (legacy/unverified). */
  fieldProfile: CoordinateProfile | null;
  rawModeLabel: string;
  ruleset: Ruleset;
  ballOn: number;
  selectedUid: string | null;
}

const sideColor = (phase: string | undefined) =>
  phase === 'defense' ? { fill: COLORS.defense, ink: COLORS.defenseInk } : phase === 'offense'
    ? { fill: COLORS.offense, ink: COLORS.offenseInk } : { fill: COLORS.unknown, ink: COLORS.offenseInk };

export const routePoints = (r: { points?: readonly StoredPoint[]; path?: readonly StoredPoint[] }) =>
  (r.points === undefined && Array.isArray(r.path) ? r.path : r.points) ?? [];

function paintField(ctx: CanvasRenderingContext2D, profile: CoordinateProfile, ruleset: Ruleset, ballOn: number) {
  const ppy = profile.pxPerYard;
  const m = buildMarkings(ruleset, ballOn);
  const rectPx = (r: MarkRect) => {
    const a = yardsToPx(profile, { xYd: r.x0, yYd: r.y1 });
    const b = yardsToPx(profile, { xYd: r.x1, yYd: r.y0 });
    return [a.x, a.y, b.x - a.x, b.y - a.y] as const;
  };

  ctx.fillStyle = COLORS.surround;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  // Turf bands counted from the far back line, exactly as the 3D turf texture is painted.
  for (let y = m.bounds.y1; y > m.bounds.y0; y -= 5) {
    const band = Math.round((m.bounds.y1 - y) / 5);
    ctx.fillStyle = band % 2 === 0 ? COLORS.turfA : COLORS.turfB;
    ctx.fillRect(...rectPx({ x0: m.bounds.x0, y0: y - 5, x1: m.bounds.x1, y1: y }));
  }
  const pattern = ctx.createPattern(turfGrainTile(), 'repeat');
  if (pattern) {
    const origin = yardsToPx(profile, { xYd: m.bounds.x0, yYd: m.bounds.y1 });
    pattern.setTransform(new DOMMatrix().translate(origin.x, origin.y).scale(ppy / 12));
    ctx.fillStyle = pattern;
    ctx.fillRect(...rectPx(m.bounds));
  }
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = COLORS.endZone;
  for (const z of m.endZones) ctx.fillRect(...rectPx(z));
  ctx.globalAlpha = 1;

  ctx.fillStyle = COLORS.line;
  for (const r of m.lines) ctx.fillRect(...rectPx(r));

  // Numbers: same plate geometry and glyph placement as makeYardNumberTexture.
  const plateW = NUMBER_PLATE.width * ppy, plateH = NUMBER_PLATE.height * ppy;
  for (const n of m.numbers) {
    const c = yardsToPx(profile, { xYd: n.xYd, yYd: n.yYd });
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(n.sideline === 'right' ? -Math.PI / 2 : Math.PI / 2);
    ctx.fillStyle = 'rgba(238,243,240,0.92)';
    ctx.font = `600 ${(230 / 256) * plateH}px ${DISPLAY_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const digits = String(n.n).padStart(2, ' ').split('');
    const by = (136 / 256 - 0.5) * plateH;
    if (digits[0].trim()) ctx.fillText(digits[0], (150 / 512 - 0.5) * plateW, by);
    ctx.fillText(digits[1], (362 / 512 - 0.5) * plateW, by);
    ctx.restore();
    if (n.n !== 50) {
      const inward = n.sideline === 'right' ? -1 : 1;
      const dir = n.arrowTowardNegativeY ? -1 : 1;
      const tipY = n.yYd + dir * (NUMBER_PLATE.width / 2 + 0.55 + 0.45);
      const baseY = n.yYd + dir * (NUMBER_PLATE.width / 2 + 0.55 - 0.3);
      const x = n.xYd + inward * 0.6;
      const pts = [yardsToPx(profile, { xYd: x, yYd: tipY }), yardsToPx(profile, { xYd: x - 0.3, yYd: baseY }), yardsToPx(profile, { xYd: x + 0.3, yYd: baseY })];
      ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(pts[1].x, pts[1].y); ctx.lineTo(pts[2].x, pts[2].y); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  ctx.fillStyle = COLORS.los;
  ctx.fillRect(...rectPx({ x0: -FIELD_WIDTH_YD / 2, y0: -LOS_WIDTH_YD / 2, x1: FIELD_WIDTH_YD / 2, y1: LOS_WIDTH_YD / 2 }));
}

function paintRawGrid(ctx: CanvasRenderingContext2D, label: string) {
  ctx.fillStyle = '#0B1220';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.strokeStyle = 'rgba(174,184,198,0.12)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= CANVAS_W; x += 50) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, CANVAS_H); ctx.stroke(); }
  for (let y = 0; y <= CANVAS_H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(CANVAS_W, y + 0.5); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,184,107,0.9)';
  ctx.font = `600 11px ${DISPLAY_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(label, 10, 9);
}

function arrowhead(ctx: CanvasRenderingContext2D, a: StoredPoint, b: StoredPoint, len: number, half: number) {
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const ux = (b.x - a.x) / d, uy = (b.y - a.y) / d;
  const bx = b.x - ux * len, by = b.y - uy * len;
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(bx - uy * half, by + ux * half);
  ctx.lineTo(bx + uy * half, by - ux * half);
  ctx.closePath();
  ctx.fill();
}

export function paint2D(ctx: CanvasRenderingContext2D, o: Paint2DOptions) {
  const ppy = o.fieldProfile?.pxPerYard ?? 10;
  if (o.fieldProfile) paintField(ctx, o.fieldProfile, o.ruleset, o.ballOn);
  else paintRawGrid(ctx, o.rawModeLabel);

  const radius = o.fieldProfile ? MARKER_DISC_RADIUS_YD * ppy : RAW_MARKER_RADIUS_PX;
  const selectedOwner = o.selectedUid;

  // Routes beneath players.
  ctx.lineJoin = 'miter';
  ctx.lineCap = 'butt';
  for (const env of o.envelopes) {
    for (const r of env.play.routes) {
      const pts = routePoints(r);
      if (pts.length < 2) continue;
      const owner = playerUid(env.key, r.playerId);
      ctx.globalAlpha = selectedOwner && selectedOwner !== owner ? 0.38 : 0.96;
      ctx.strokeStyle = COLORS.route;
      ctx.fillStyle = COLORS.route;
      ctx.lineWidth = ROUTE_WIDTH_YD * ppy;
      const head = 0.95 * ppy, half = 0.55 * ppy;
      const a = pts[pts.length - 2], b = pts[pts.length - 1];
      const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const end = d > head ? { x: b.x - ((b.x - a.x) / d) * head * 0.8, y: b.y - ((b.y - a.y) / d) * head * 0.8 } : b;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      arrowhead(ctx, a, b, head, half);
      ctx.globalAlpha = 1;
    }
  }

  for (const env of o.envelopes) {
    const { fill, ink } = sideColor(env.play.phase);
    for (const p of env.play.players) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      const uid = playerUid(env.key, p.id);
      // Rim (matches the 3D rim ring: radius (R+0.2)·1.06, width 0.2·1.06).
      ctx.strokeStyle = 'rgba(10,15,26,0.55)';
      ctx.lineWidth = (0.2 * 1.06 * radius) / MARKER_DISC_RADIUS_YD;
      ctx.beginPath(); ctx.arc(p.x, p.y, ((MARKER_DISC_RADIUS_YD + 0.2) * 1.06 * radius) / MARKER_DISC_RADIUS_YD, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = fill;
      ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fill();
      const label = typeof p.position === 'string' && p.position ? p.position : p.id;
      const size = label.length <= 2 ? 118 : label.length === 3 ? 92 : 70;
      ctx.fillStyle = ink;
      ctx.font = `700 ${(size / 256) * radius * 2}px ${DISPLAY_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, p.x, p.y + (136 / 256 - 0.5) * radius * 2);
      if (uid === o.selectedUid) {
        ctx.strokeStyle = COLORS.select;
        ctx.lineWidth = (0.2 * radius) / MARKER_DISC_RADIUS_YD;
        ctx.beginPath(); ctx.arc(p.x, p.y, ((MARKER_DISC_RADIUS_YD + 0.2) * radius) / MARKER_DISC_RADIUS_YD, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }
}

/** Nearest stored player under a canvas-pixel point. */
export function hitTest(envelopes: readonly PlayEnvelope[], at: StoredPoint, radiusPx: number) {
  let best: { playKey: string; id: string; uid: string; d: number } | null = null;
  for (const env of envelopes) {
    for (const p of env.play.players) {
      const d = Math.hypot(p.x - at.x, p.y - at.y);
      if (d <= radiusPx && (!best || d < best.d)) best = { playKey: env.key, id: p.id, uid: playerUid(env.key, p.id), d };
    }
  }
  return best;
}

export const describeYards = (profile: CoordinateProfile | null, p: StoredPoint) => profile ? pxToYards(profile, p) : null;
