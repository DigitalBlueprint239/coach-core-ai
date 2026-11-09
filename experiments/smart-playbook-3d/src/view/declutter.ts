/** A label's box on screen, centred at (x, y), in CSS px. */
export interface LabelBox { readonly id: string; readonly x: number; readonly y: number; readonly w: number; readonly h: number }

/**
 * Greedy label placement: walk boxes in priority order and keep each one that does not overlap
 * (with `pad` px of clearance) a box already kept. Deterministic for a given order.
 */
export function declutter(boxes: readonly LabelBox[], order: readonly string[], pad = 2): Set<string> {
  const byId = new Map(boxes.map(b => [b.id, b]));
  const kept: LabelBox[] = [];
  for (const id of order) {
    const b = byId.get(id);
    if (!b) continue;
    const clear = kept.every(k =>
      Math.abs(k.x - b.x) * 2 >= k.w + b.w + 2 * pad || Math.abs(k.y - b.y) * 2 >= k.h + b.h + 2 * pad);
    if (clear) kept.push(b);
  }
  return new Set(kept.map(k => k.id));
}
