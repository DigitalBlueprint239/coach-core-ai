import type { PlayEnvelope, StoredPlayer, StoredPoint, StoredRoute } from './types';
import { deepFreeze } from './adapter';

/**
 * The editor's in-memory draft. Only explicit 2D edits produce a new draft; view
 * changes never touch it. Nothing here persists: the experiment has no save path.
 */
export interface Workspace {
  readonly baseline: readonly PlayEnvelope[];
  readonly draft: readonly PlayEnvelope[];
}

export const createWorkspace = (envelopes: readonly PlayEnvelope[]): Workspace => {
  const frozen = deepFreeze(envelopes.map(e => structuredClone(e)));
  return { baseline: frozen, draft: frozen };
};

export const isDirty = (ws: Workspace) => ws.draft !== ws.baseline;

const shift = (p: StoredPoint, dx: number, dy: number): StoredPoint => ({ ...p, x: p.x + dx, y: p.y + dy });

/**
 * Move one stored player to new stored-pixel coordinates (structural sharing, no mutation).
 * The player's own routes translate with it, as in the current 2D editor; other keys are preserved.
 */
export function movePlayer(ws: Workspace, playKey: string, playerId: string, to: StoredPoint): Workspace {
  let changed = false;
  const draft = ws.draft.map(env => {
    if (env.key !== playKey) return env;
    const player = env.play.players.find(p => p.id === playerId);
    if (!player || (player.x === to.x && player.y === to.y)) return env;
    changed = true;
    const dx = to.x - player.x, dy = to.y - player.y;
    const players = env.play.players.map((p): StoredPlayer => (p.id === playerId ? { ...p, x: to.x, y: to.y } : p));
    const routes = env.play.routes.map((r): StoredRoute => {
      if (r.playerId !== playerId) return r;
      const next: Record<string, unknown> = { ...r };
      if (r.points) next.points = r.points.map(p => shift(p, dx, dy));
      if (r.path) next.path = r.path.map(p => shift(p, dx, dy));
      return next as unknown as StoredRoute;
    });
    return { ...env, play: { ...env.play, players, routes } };
  });
  return changed ? { ...ws, draft: deepFreeze(draft) } : ws;
}

export const revert = (ws: Workspace): Workspace => ({ ...ws, draft: ws.baseline });

/** Canonical JSON with sorted keys, so fingerprints ignore key order but nothing else. */
export function canonicalJson(value: unknown): string {
  const sort = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(sort)
      : v && typeof v === 'object'
        ? Object.fromEntries(Object.keys(v as object).sort().map(k => [k, sort((v as Record<string, unknown>)[k])]))
        : v;
  return JSON.stringify(sort(value));
}

/** FNV-1a 32-bit over canonical JSON; compact for UI/test display. */
export function fingerprint(value: unknown): string {
  const s = canonicalJson(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
