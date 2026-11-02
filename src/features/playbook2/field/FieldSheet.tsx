// The blueprint sheet (spec §3): the one bold element on screen. Pure SVG in yards (see geometry.ts).
// Dragging keeps an ephemeral position here and commits one move on release, so undo steps per move, not per pixel.
import React, { useId, useMemo, useRef, useState } from 'react';
import { alignDefense, applyTerminology, labelFor } from '../../../football-core';
import type { CoverageId, OffenseRole, Terminology, Yards } from '../../../football-core';
import type { PlayV2 } from '../playModel';
import {
  HASH_YD, SHEET_H, SHEET_W, SIDELINE_YD, badgePositions, defenderShort, fromSvg, isLineman, keyRouteIndex, pathD,
  playRoutes, playerName, sx, sy,
} from './geometry';

export type FieldSheetProps = {
  play: PlayV2;
  terminology: Terminology;
  defense?: CoverageId;
  highlightStep?: number;
  selectedRole?: OffenseRole;
  onMovePlayer?(role: OffenseRole, at: Yards): void;
  onSelect?(role?: OffenseRole): void;
  reducedMotion?: boolean;
};

const NUDGE = 0.5;
const KEY_MOVES: Record<string, Yards> = {
  ArrowLeft: { x: -NUDGE, y: 0 },
  ArrowRight: { x: NUDGE, y: 0 },
  ArrowUp: { x: 0, y: NUDGE },
  ArrowDown: { x: 0, y: -NUDGE },
};
const tenth = (v: number) => Math.round(v * 10) / 10 || 0;
const BADGE_GAP = 20;

/** Badge spots in sheet units, nudged sideways so two steps that point at the same place stay readable. */
function spreadBadges(spots: Array<Yards | null>): Array<{ x: number; y: number } | null> {
  const placed: Array<{ x: number; y: number }> = [];
  return spots.map(at => {
    if (!at) return null;
    const spot = { x: sx(at.x) + 12, y: sy(at.y) - 12 };
    for (let tries = 0; tries < 6 && placed.some(o => Math.hypot(o.x - spot.x, o.y - spot.y) < BADGE_GAP); tries++) {
      spot.x += spot.x > SHEET_W - 40 ? -BADGE_GAP : BADGE_GAP;
    }
    placed.push(spot);
    return spot;
  });
}
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const FieldSheet: React.FC<FieldSheetProps> = ({
  play, terminology, defense, highlightStep, selectedRole, onMovePlayer, onSelect, reducedMotion,
}) => {
  const uid = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{ role: OffenseRole; at: Yards; moved: boolean } | null>(null);
  const interactive = Boolean(onMovePlayer || onSelect);

  const players = useMemo(
    () => play.formation.players.map(p => (drag && drag.role === p.role ? { ...p, at: drag.at } : p)),
    [play.formation.players, drag],
  );
  const shown: PlayV2 = useMemo(() => ({ ...play, formation: { ...play.formation, players } }), [play, players]);
  const routes = useMemo(() => playRoutes(shown), [shown]);
  const defenders = useMemo(() => (defense ? alignDefense(defense, shown.formation) : []), [defense, shown.formation]);
  const keyRoute = keyRouteIndex(play.read, routes);
  const badges = badgePositions(play.read, routes, defenders);
  const highlightAt = highlightStep === undefined ? null : badges[highlightStep];
  const t = (s: string) => applyTerminology(s, terminology);

  const toYards = (clientX: number, clientY: number): Yards | null => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return null;
    const p = fromSvg(((clientX - rect.left) / rect.width) * SHEET_W, ((clientY - rect.top) / rect.height) * SHEET_H);
    return { x: clamp(p.x, -SIDELINE_YD, SIDELINE_YD), y: clamp(p.y, -15, 30) };
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const at = toYards(e.clientX, e.clientY);
    if (at) setDrag({ ...drag, at, moved: true });
  };
  const endDrag = () => {
    if (drag?.moved && onMovePlayer) onMovePlayer(drag.role, { x: tenth(drag.at.x), y: tenth(drag.at.y) });
    setDrag(null);
  };

  return (
    <svg
      ref={svgRef}
      className="pb2-sheet"
      viewBox={`0 0 ${SHEET_W} ${SHEET_H}`}
      role="group"
      aria-label={`${play.name} from ${play.formation.name}`}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={() => setDrag(null)}
    >
      <defs>
        <marker id={`${uid}-arrow`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--pb-line-solid)" />
        </marker>
        <marker id={`${uid}-arrow-key`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--pb-signal)" />
        </marker>
        <pattern id={`${uid}-grid`} width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M10 0 L0 0 0 10" fill="none" stroke="var(--pb-line-soft)" strokeWidth="0.5" />
        </pattern>
      </defs>

      {/* Sheet and linework */}
      <rect width={SHEET_W} height={SHEET_H} rx="6" fill="var(--pb-sheet)" />
      <rect width={SHEET_W} height={SHEET_H} fill={`url(#${uid}-grid)`} opacity="0.6" />
      <g stroke="var(--pb-line)" aria-hidden="true">
        <line x1={sx(-SIDELINE_YD)} y1="0" x2={sx(-SIDELINE_YD)} y2={SHEET_H} strokeWidth="2" />
        <line x1={sx(SIDELINE_YD)} y1="0" x2={sx(SIDELINE_YD)} y2={SHEET_H} strokeWidth="2" />
        {Array.from({ length: 10 }, (_, i) => -15 + i * 5).map(y => (
          <line key={y} x1={sx(-SIDELINE_YD)} x2={sx(SIDELINE_YD)} y1={sy(y)} y2={sy(y)} strokeWidth={y % 10 === 0 ? 1.4 : 0.8} />
        ))}
        {Array.from({ length: 46 }, (_, i) => -15 + i).map(y => (
          <g key={`h${y}`} strokeWidth="1">
            <line x1={sx(-HASH_YD) - 4} x2={sx(-HASH_YD) + 4} y1={sy(y)} y2={sy(y)} />
            <line x1={sx(HASH_YD) - 4} x2={sx(HASH_YD) + 4} y1={sy(y)} y2={sy(y)} />
          </g>
        ))}
      </g>
      <g className="pb2-yardnum" aria-hidden="true">
        {[10, 20, 30].map(y => (
          <g key={y}>
            <text x={sx(-SIDELINE_YD) + 24} y={sy(y) + 7}>{y}</text>
            <text x={sx(SIDELINE_YD) - 24} y={sy(y) + 7}>{y}</text>
          </g>
        ))}
      </g>
      <line x1={sx(-SIDELINE_YD)} x2={sx(SIDELINE_YD)} y1={sy(0)} y2={sy(0)} stroke="var(--pb-signal)" strokeWidth="2" opacity="0.9" aria-hidden="true" />

      {/* Defense */}
      {defenders.map(d => (
        <g key={d.role} data-testid="defender" transform={`translate(${sx(d.at.x)} ${sy(d.at.y)})`} aria-hidden="true">
          <path d="M-6 -6 L6 6 M6 -6 L-6 6" stroke="var(--pb-line-solid)" strokeWidth="2.4" strokeLinecap="round" />
          <text className="pb2-def-label" y="-10">{labelFor(d.role, terminology) === d.role ? defenderShort(d.role) : labelFor(d.role, terminology)}</text>
        </g>
      ))}

      {/* Routes: drawn on once per play view, never under reduced motion */}
      <g key={play.id ?? play.fromLibrary?.id ?? 'new'} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {routes.map((r, i) => {
          const isKey = i === keyRoute;
          const highlighted = highlightAt !== null && highlightAt !== undefined && r.points.includes(highlightAt);
          return (
            <path
              key={`${r.slot}-${r.route}`}
              data-testid="route"
              data-key={isKey ? 'true' : undefined}
              data-highlight={highlighted ? 'true' : undefined}
              className={reducedMotion ? undefined : 'pb2-route-draw'}
              pathLength={1}
              d={pathD(r.points)}
              stroke={isKey ? 'var(--pb-signal)' : 'var(--pb-line-solid)'}
              strokeWidth={highlighted ? 4.5 : isKey ? 3.5 : 2.5}
              markerEnd={`url(#${uid}-${isKey ? 'arrow-key' : 'arrow'})`}
            />
          );
        })}
      </g>

      {/* Offense: O's, skill players labelled, linemen unlabelled */}
      {players.map(p => {
        const label = labelFor(p.role, terminology);
        const name = playerName(p.role, label, p.at, p.onLine);
        const selected = selectedRole === p.role;
        const lineman = isLineman(p.role);
        const handlers = interactive
          ? {
              role: 'button' as const,
              tabIndex: 0,
              'aria-pressed': selected,
              onClick: () => onSelect?.(p.role),
              onKeyDown: (e: React.KeyboardEvent) => {
                const step = KEY_MOVES[e.key];
                if (step && onMovePlayer) {
                  e.preventDefault();
                  onMovePlayer(p.role, { x: tenth(p.at.x + step.x), y: tenth(p.at.y + step.y) });
                } else if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect?.(p.role);
                }
              },
              onPointerDown: (e: React.PointerEvent) => {
                if (!onMovePlayer) return;
                // Capture on the player (not the svg): the click that follows a press then still reaches it.
                (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
                setDrag({ role: p.role, at: p.at, moved: false });
              },
            }
          : { role: 'img' as const };
        return (
          <g
            key={p.role}
            data-testid="offense-player"
            className={`pb2-player${onMovePlayer ? ' pb2-movable' : ''}`}
            transform={`translate(${sx(p.at.x)} ${sy(p.at.y)})`}
            aria-label={name}
            {...handlers}
          >
            <circle r={lineman ? 11.5 : 20} fill="transparent" />
            <circle className="pb2-ring" r="13" fill="none" stroke="var(--pb-signal)" strokeWidth="2.5" opacity={selected ? 1 : 0} />
            <circle r="8" fill="var(--pb-sheet)" stroke="var(--pb-line-solid)" strokeWidth="2.4" />
            {!lineman && (
              <text data-testid="player-label" className="pb2-player-label" y={p.at.y > 0 ? -14 : 22}>
                {label}
              </text>
            )}
          </g>
        );
      })}

      {/* Read badges ①②③ */}
      {spreadBadges(badges).map((at, i) =>
        at ? (
          <g
            key={i}
            data-testid="read-badge"
            data-step={String(i + 1)}
            data-active={highlightStep === i ? 'true' : undefined}
            transform={`translate(${at.x} ${at.y})`}
            aria-hidden="true"
          >
            <circle r="9" fill={highlightStep === i ? 'var(--pb-signal)' : 'var(--pb-line-solid)'} />
            <text className="pb2-badge-num" fill={highlightStep === i ? 'var(--pb-on-signal)' : 'var(--pb-sheet)'}>
              {i + 1}
            </text>
          </g>
        ) : null,
      )}

      {/* One handwritten coach note */}
      {play.notes.trim() && (
        <text className="pb2-note" x="24" y="40">
          {t(play.notes)}
        </text>
      )}

      {/* Title block */}
      <g data-testid="title-block" transform={`translate(${SHEET_W - 196} ${SHEET_H - 66})`}>
        <rect width="180" height="52" fill="var(--pb-sheet)" stroke="var(--pb-line)" strokeWidth="1.2" />
        <line x1="0" x2="180" y1="32" y2="32" stroke="var(--pb-line)" />
        <text className="pb2-title" x="10" y="24">{t(play.name).toUpperCase()}</text>
        <text className="pb2-title-sub" x="10" y="45">
          {t(play.formation.name)} · {play.level === 'jv' ? 'JV' : play.level[0].toUpperCase() + play.level.slice(1)}
        </text>
      </g>
    </svg>
  );
};
