// Thumbnail for library cards: never a bare name (spec §5.1). Non-interactive.
import React from 'react';
import type { Formation, Yards } from '../../../football-core';
import { isLineman, pathD, sx, sy } from './geometry';

export type MiniDiagramProps = { formation: Formation; routes?: Yards[][]; size?: number; label?: string };

export const MiniDiagram: React.FC<MiniDiagramProps> = ({ formation, routes = [], size = 168, label }) => (
  <svg
    className="pb2-mini"
    role="img"
    aria-label={label ?? `${formation.name} diagram`}
    viewBox="20 80 560 330"
    width={size}
    height={Math.round((size * 330) / 560)}
  >
    <rect x="20" y="80" width="560" height="330" rx="10" fill="var(--pb-sheet, #123b6d)" />
    <line x1="20" x2="580" y1={sy(0)} y2={sy(0)} stroke="var(--pb-signal, #ff8a3d)" strokeWidth="3" />
    {routes.map((pts, i) => (
      <path key={i} data-testid="mini-route" d={pathD(pts)} fill="none" stroke="var(--pb-line-solid, #dce8fa)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    ))}
    {formation.players.map(p => (
      <circle
        key={p.role}
        data-testid="mini-player"
        cx={sx(p.at.x)}
        cy={sy(p.at.y)}
        r={isLineman(p.role) ? 9 : 11}
        fill="var(--pb-sheet, #123b6d)"
        stroke="var(--pb-line-solid, #dce8fa)"
        strokeWidth="4"
      />
    ))}
  </svg>
);
