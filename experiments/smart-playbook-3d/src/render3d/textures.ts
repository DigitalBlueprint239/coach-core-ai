import { CanvasTexture, LinearMipmapLinearFilter, SRGBColorSpace, type Texture } from 'three';
import { COLORS } from './constants';

/** Fonts are local system faces only (no web-font fetches). */
export const DISPLAY_FONT = "'Bahnschrift SemiCondensed', Bahnschrift, 'Arial Narrow', 'Roboto Condensed', sans-serif";
export const UI_FONT = "'Segoe UI', system-ui, -apple-system, Roboto, sans-serif";

const canvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

const toTexture = (c: HTMLCanvasElement, anisotropy = 8): Texture => {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = anisotropy;
  t.minFilter = LinearMipmapLinearFilter;
  t.needsUpdate = true;
  return t;
};

/** Deterministic grain tile shared by the 2D painter and the 3D turf so the handoff matches. */
let grainTile: HTMLCanvasElement | null = null;
export function turfGrainTile(): HTMLCanvasElement {
  if (grainTile) return grainTile;
  const size = 128;
  const c = canvas(size, size);
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  let seed = 0x2f6b9d;
  const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < size * size; i++) {
    const v = rand();
    const a = v > 0.5 ? (v - 0.5) * 34 : (0.5 - v) * 34;
    const light = v > 0.5;
    img.data[i * 4] = light ? 255 : 0;
    img.data[i * 4 + 1] = light ? 255 : 0;
    img.data[i * 4 + 2] = light ? 255 : 0;
    img.data[i * 4 + 3] = a;
  }
  ctx.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

/**
 * Turf: 5-yard mowing bands + grain. `lengthYd` × `widthYd` at `pxPerYd`.
 * `bandOffsetYd` aligns bands to real yard lines.
 */
export function makeTurfTexture(lengthYd: number, widthYd: number, bandOffsetYd: number, pxPerYd = 12): Texture {
  const c = canvas(Math.round(widthYd * pxPerYd), Math.round(lengthYd * pxPerYd));
  const ctx = c.getContext('2d')!;
  for (let y = 0; y < lengthYd; y += 5) {
    const band = Math.floor((y + bandOffsetYd) / 5);
    ctx.fillStyle = band % 2 === 0 ? COLORS.turfA : COLORS.turfB;
    ctx.fillRect(0, y * pxPerYd, c.width, 5 * pxPerYd + 1);
  }
  const pattern = ctx.createPattern(turfGrainTile(), 'repeat');
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, c.width, c.height);
  }
  return toTexture(c, 16);
}

/** Two-digit yard number, drawn as the digits straddle the yard line. */
export function makeYardNumberTexture(n: number): Texture {
  const c = canvas(512, 256);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = 'rgba(238,243,240,0.92)';
  ctx.font = `600 230px ${DISPLAY_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const [a, b] = String(n).padStart(2, ' ').split('');
  ctx.fillText(a.trim(), 150, 136);
  ctx.fillText(b, 362, 136);
  return toTexture(c);
}

/** Label printed on the top of a marker disc. Matches the 2D painter's in-disc label. */
export function makeDiscLabelTexture(label: string, ink: string): Texture {
  const c = canvas(256, 256);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const size = label.length <= 2 ? 118 : label.length === 3 ? 92 : 70;
  ctx.font = `700 ${size}px ${DISPLAY_FONT}`;
  ctx.fillText(label, 128, 136);
  return toTexture(c);
}

/** Floating broadcast-style tag: position + stored jersey number. */
/** Width/height (canvas px) of the full tag and of the compact (role-only) phone tag. */
export const TAG_SIZE = { full: [320, 128], compact: [196, 128] } as const;

export function makeTagTexture(label: string, number: number | undefined, accent: string, compact = false): Texture {
  const [w, h] = compact ? TAG_SIZE.compact : TAG_SIZE.full;
  const c = canvas(w, h);
  const ctx = c.getContext('2d')!;
  const slant = 18;
  ctx.beginPath();
  ctx.moveTo(slant, 8); ctx.lineTo(w - 8, 8); ctx.lineTo(w - 8 - slant, h - 8); ctx.lineTo(8, h - 8); ctx.closePath();
  ctx.fillStyle = 'rgba(8,12,20,0.88)';
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(slant + 2, 8, 10, h - 16);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#F4F7FB';
  ctx.font = `700 72px ${DISPLAY_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(label, 56, 68);
  if (number !== undefined && !compact) {
    ctx.fillStyle = '#8E99A8';
    ctx.font = `600 50px ${DISPLAY_FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(`#${number}`, 276, 70);
  }
  return toTexture(c, 4);
}

/** Soft contact shadow under lifted markers (cheaper and steadier than shadow maps on low-end GPUs). */
export function makeBlobShadowTexture(): Texture {
  const c = canvas(128, 128);
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, 'rgba(0,0,0,0.75)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.32)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return toTexture(c, 1);
}

export function makeEndZoneTexture(text: string): Texture {
  const c = canvas(1024, 192);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = 'rgba(238,243,240,0.13)';
  ctx.font = `700 150px ${DISPLAY_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 512, 104);
  return toTexture(c);
}

/** Owns textures created for one scene and disposes them together. */
export class TextureBag {
  private readonly items = new Map<string, Texture>();
  get(key: string, make: () => Texture): Texture {
    let t = this.items.get(key);
    if (!t) { t = make(); this.items.set(key, t); }
    return t;
  }
  dispose() {
    for (const t of this.items.values()) t.dispose();
    this.items.clear();
  }
  get size() { return this.items.size; }
}
