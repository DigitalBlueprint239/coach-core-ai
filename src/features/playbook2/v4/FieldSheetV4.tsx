// The field for a v4 play. It draws only what `resolveGeometry` returns from the stored document: it never looks
// at the route library or works out slots. Interaction is by player id.
//
// Touch: a press selects; a drag only starts after the finger has moved a few pixels, so a tap never nudges a
// player. Skill players and route handles have large invisible hit areas. Arrow keys move the focused player or
// handle by half a yard.
import React, { useId, useMemo, useRef, useState } from 'react';
import { describeAssignment, jobOf, movePlayer, moveRoutePoint, resolveGeometry, routeOf } from '../../../football-core';
import type { PlayDocV4, PlayerId, Yards } from '../../../football-core';
import { HASH_YD, SHEET_H, SHEET_W, SIDELINE_YD, defenderShort, fromSvg, isLineman, pathD, playerName, sx, sy } from '../field/geometry';

export type FieldSheetV4Props = {
  play: PlayDocV4;
  selected?: PlayerId;
  onSelect?(id?: PlayerId): void;
  onMovePlayer?(id: PlayerId, at: Yards): void;
  /** `offset` is in yards from the player's alignment. */
  onMoveRoutePoint?(id: PlayerId, index: number, offset: Yards): void;
  /** Static rendering for thumbnails and the print card. */
  readOnly?: boolean;
};

const NUDGE = 0.5;
const KEY_MOVES: Record<string, Yards> = {
  ArrowLeft: { x: -NUDGE, y: 0 },
  ArrowRight: { x: NUDGE, y: 0 },
  ArrowUp: { x: 0, y: NUDGE },
  ArrowDown: { x: 0, y: -NUDGE },
};
/** Screen pixels a pointer must travel before a press becomes a drag. */
const DRAG_THRESHOLD_PX = 6;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type DragStart = { kind: 'player'; id: PlayerId; at: Yards } | { kind: 'point'; id: PlayerId; index: number; at: Yards };
type Drag = DragStart & { startX: number; startY: number; moved: boolean };

export const FieldSheetV4: React.FC<FieldSheetV4Props> = ({ play, selected, onSelect, onMovePlayer, onMoveRoutePoint, readOnly }) => {
  const uid = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const interactive = !readOnly && Boolean(onSelect || onMovePlayer);

  // While dragging, show the play as it would be after the drop, using the same pure edits the drop will commit.
  const shown = useMemo(() => {
    if (!drag || !drag.moved) return play;
    if (drag.kind === 'player') return movePlayer(play, drag.id, drag.at);
    const player = play.players.find(p => p.id === drag.id);
    return player ? moveRoutePoint(play, drag.id, drag.index, { x: drag.at.x - player.at.x, y: drag.at.y - player.at.y }) : play;
  }, [play, drag]);
  const geometry = useMemo(() => resolveGeometry(shown), [shown]);

  const toYards = (clientX: number, clientY: number): Yards | null => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return null;
    const p = fromSvg(((clientX - rect.left) / rect.width) * SHEET_W, ((clientY - rect.top) / rect.height) * SHEET_H);
    return { x: clamp(p.x, -SIDELINE_YD, SIDELINE_YD), y: clamp(p.y, -15, 30) };
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < DRAG_THRESHOLD_PX) return;
    const at = toYards(e.clientX, e.clientY);
    if (at) setDrag({ ...drag, at, moved: true });
  };
  const endDrag = () => {
    if (drag?.moved) {
      if (drag.kind === 'player') onMovePlayer?.(drag.id, drag.at);
      else {
        const player = play.players.find(p => p.id === drag.id);
        if (player) onMoveRoutePoint?.(drag.id, drag.index, { x: drag.at.x - player.at.x, y: drag.at.y - player.at.y });
      }
    }
    setDrag(null);
  };
  const press = (e: React.PointerEvent, start: DragStart) => {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setDrag({ ...start, startX: e.clientX, startY: e.clientY, moved: false });
  };

  const selectedRoute = selected ? geometry.routes.find(r => r.playerId === selected) : undefined;
  const selectedStored = selected ? routeOf(shown, selected) : undefined;

  return (
    <svg
      ref={svgRef}
      className={`pb2-sheet pb4-sheet${readOnly ? ' pb4-static' : ''}`}
      viewBox={`0 0 ${SHEET_W} ${SHEET_H}`}
      role="group"
      aria-label={`${play.name} from ${play.formation.name}`}
      onPointerMove={interactive ? onPointerMove : undefined}
      onPointerUp={interactive ? endDrag : undefined}
      onPointerCancel={interactive ? () => setDrag(null) : undefined}
    >
      <defs>
        <marker id={`${uid}-arrow`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--pb-line-solid)" />
        </marker>
        <marker id={`${uid}-arrow-sel`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--pb-signal)" />
        </marker>
        <pattern id={`${uid}-grid`} width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M10 0 L0 0 0 10" fill="none" stroke="var(--pb-line-soft)" strokeWidth="0.5" />
        </pattern>
      </defs>

      <rect width={SHEET_W} height={SHEET_H} rx="6" fill="var(--pb-sheet)" onClick={interactive ? () => onSelect?.(undefined) : undefined} />
      <rect width={SHEET_W} height={SHEET_H} fill={`url(#${uid}-grid)`} opacity="0.6" pointerEvents="none" />
      <g stroke="var(--pb-line)" aria-hidden="true" pointerEvents="none">
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
      <line x1={sx(-SIDELINE_YD)} x2={sx(SIDELINE_YD)} y1={sy(0)} y2={sy(0)} stroke="var(--pb-signal)" strokeWidth="2" opacity="0.9" aria-hidden="true" pointerEvents="none" />

      {/* Defense: the stored look, exactly as saved */}
      {geometry.defenders.map(d => (
        <g key={d.id} data-testid="defender" transform={`translate(${sx(d.at.x)} ${sy(d.at.y)})`} aria-hidden="true" pointerEvents="none">
          <path d="M-6 -6 L6 6 M6 -6 L-6 6" stroke="var(--pb-line-solid)" strokeWidth="2.4" strokeLinecap="round" />
          <text className="pb2-def-label" y="-10">{defenderShort(d.role)}</text>
        </g>
      ))}

      {/* Routes */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none">
        {geometry.routes.map(r => {
          const isSelected = r.playerId === selected;
          return (
            <path
              key={r.playerId}
              data-testid="route"
              data-player={r.playerId}
              data-selected={isSelected ? 'true' : undefined}
              d={pathD(r.path)}
              stroke={isSelected ? 'var(--pb-signal)' : 'var(--pb-line-solid)'}
              strokeWidth={isSelected ? 3.5 : 2.5}
              markerEnd={`url(#${uid}-${isSelected ? 'arrow-sel' : 'arrow'})`}
            />
          );
        })}
      </g>

      {/* Offense */}
      {geometry.players.map(p => {
        const stored = shown.players.find(sp => sp.id === p.id);
        const label = stored?.label ?? p.role;
        const job = jobOf(shown, p.id);
        const isSelected = selected === p.id;
        const lineman = isLineman(p.role);
        const name = `${playerName(p.role, label, p.at, p.onLine)}${job ? `, ${describeAssignment(job)}` : ', no assignment'}`;
        const handlers = interactive
          ? {
              role: 'button' as const,
              tabIndex: 0,
              'aria-pressed': isSelected,
              onClick: () => onSelect?.(p.id),
              onKeyDown: (e: React.KeyboardEvent) => {
                const step = KEY_MOVES[e.key];
                if (step && onMovePlayer) {
                  e.preventDefault();
                  onMovePlayer(p.id, { x: p.at.x + step.x, y: p.at.y + step.y });
                } else if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect?.(p.id);
                }
              },
              onPointerDown: (e: React.PointerEvent) => {
                if (onMovePlayer) press(e, { kind: 'player', id: p.id, at: p.at });
              },
            }
          : { role: 'img' as const };
        return (
          <g
            key={p.id}
            data-testid="offense-player"
            data-player={p.id}
            className={`pb2-player pb4-touch${onMovePlayer && interactive ? ' pb2-movable' : ''}`}
            transform={`translate(${sx(p.at.x)} ${sy(p.at.y)})`}
            aria-label={name}
            {...handlers}
          >
            {/* Invisible hit area: as large as neighbours allow (linemen stand 2.3 yd apart). */}
            <circle r={lineman ? 11.5 : 22} fill="transparent" />
            <circle className="pb2-ring" r="13" fill="none" stroke="var(--pb-signal)" strokeWidth="2.5" opacity={isSelected ? 1 : 0} />
            <circle r="8" fill="var(--pb-sheet)" stroke="var(--pb-line-solid)" strokeWidth="2.4" />
            {!lineman && (
              <text data-testid="player-label" className="pb2-player-label" y={p.at.y > 0 ? -14 : 22}>
                {label}
              </text>
            )}
          </g>
        );
      })}

      {/* Handles on the selected player's route: drag to reshape */}
      {interactive && onMoveRoutePoint && selected && selectedRoute && selectedStored &&
        selectedRoute.path.slice(1).map((pt, index) => {
          const offset = selectedStored.points[index];
          return (
            <g
              key={index}
              data-testid="route-handle"
              data-index={index}
              className="pb4-handle pb4-touch"
              transform={`translate(${sx(pt.x)} ${sy(pt.y)})`}
              role="button"
              tabIndex={0}
              aria-label={`Route point ${index + 1} of ${selectedRoute.path.length - 1}: ${Math.abs(offset.x)} yards ${offset.x < 0 ? 'left' : 'right'}, ${offset.y} yards ${offset.y < 0 ? 'back' : 'downfield'}`}
              onKeyDown={e => {
                const step = KEY_MOVES[e.key];
                if (!step) return;
                e.preventDefault();
                onMoveRoutePoint(selected, index, { x: offset.x + step.x, y: offset.y + step.y });
              }}
              onPointerDown={e => press(e, { kind: 'point', id: selected, index, at: pt })}
            >
              <circle r="16" fill="transparent" />
              <rect x="-5" y="-5" width="10" height="10" fill="var(--pb-sheet)" stroke="var(--pb-signal)" strokeWidth="2" />
            </g>
          );
        })}

      {/* Title block */}
      <g data-testid="title-block" transform={`translate(${SHEET_W - 196} ${SHEET_H - 66})`} pointerEvents="none">
        <rect width="180" height="52" fill="var(--pb-sheet)" stroke="var(--pb-line)" strokeWidth="1.2" />
        <line x1="0" x2="180" y1="32" y2="32" stroke="var(--pb-line)" />
        <text className="pb2-title" x="10" y="24">{play.name.toUpperCase().slice(0, 22)}</text>
        <text className="pb2-title-sub" x="10" y="45">
          {play.formation.name} · {play.level === 'jv' ? 'JV' : play.level[0].toUpperCase() + play.level.slice(1)}
        </text>
      </g>
    </svg>
  );
};
