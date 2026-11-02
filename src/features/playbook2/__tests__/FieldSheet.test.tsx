import React, { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { fullLibrary, type OffenseRole, type Yards } from '../../../football-core';
import { FieldSheet } from '../field/FieldSheet';
import { MiniDiagram } from '../field/MiniDiagram';
import { playFromConcept, type PlayV2 } from '../playModel';

const lib = fullLibrary();
const doubles = lib.formations.find(f => f.id === 'doubles')!;
const smash = lib.concepts.find(c => c.id === 'smash')!;
const play = () => playFromConcept('t1', smash, doubles);

describe('FieldSheet', () => {
  it('labels skill players with team terminology and leaves linemen unlabelled', () => {
    const { container } = render(<FieldSheet play={play()} terminology={{ H: 'F' }} />);
    const labels = [...container.querySelectorAll('[data-testid="player-label"]')].map(n => n.textContent);
    expect(labels).toContain('F');
    expect(labels).not.toContain('H');
    expect(labels).not.toContain('LT');
    expect(labels).toHaveLength(6); // QB, RB, X, H→F, Y, Z
    expect(container.querySelectorAll('[data-testid="offense-player"]')).toHaveLength(11);
  });

  it('renders one path per route plus defenders when a coverage is given', () => {
    const { container, rerender } = render(<FieldSheet play={play()} terminology={{}} />);
    expect(container.querySelectorAll('[data-testid="route"]')).toHaveLength(4);
    expect(container.querySelectorAll('[data-testid="defender"]')).toHaveLength(0);
    rerender(<FieldSheet play={play()} terminology={{}} defense="cover-2" />);
    expect(container.querySelectorAll('[data-testid="defender"]')).toHaveLength(11);
  });

  it('draws the key route in signal orange and read badges on the field', () => {
    const { container } = render(<FieldSheet play={play()} terminology={{}} defense="cover-2" />);
    expect(container.querySelectorAll('[data-testid="route"][data-key="true"]')).toHaveLength(1);
    const badges = [...container.querySelectorAll('[data-testid="read-badge"]')].map(b => b.getAttribute('data-step'));
    expect(badges).toEqual(['1', '2', '3']);
  });

  it('marks the highlighted read step', () => {
    const { container } = render(<FieldSheet play={play()} terminology={{}} defense="cover-2" highlightStep={1} />);
    const active = container.querySelector('[data-testid="read-badge"][data-active="true"]');
    expect(active?.getAttribute('data-step')).toBe('2');
  });

  it('gives each player an accessible name', () => {
    render(<FieldSheet play={play()} terminology={{ H: 'F' }} onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: 'F, slot receiver, 13.5 yards left, off the line' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Left tackle/ })).toBeInTheDocument();
  });

  it('arrow keys move the focused player by half a yard', () => {
    const moves: Array<[OffenseRole, Yards]> = [];
    const Harness = () => {
      const [p, setP] = useState<PlayV2>(play());
      return (
        <FieldSheet
          play={p}
          terminology={{}}
          onMovePlayer={(role, at) => {
            moves.push([role, at]);
            setP(cur => ({
              ...cur,
              formation: { ...cur.formation, players: cur.formation.players.map(x => (x.role === role ? { ...x, at } : x)) },
            }));
          }}
        />
      );
    };
    render(<Harness />);
    const h = screen.getByRole('button', { name: /^H, slot receiver/ });
    h.focus();
    fireEvent.keyDown(h, { key: 'ArrowRight' });
    fireEvent.keyDown(screen.getByRole('button', { name: /^H, slot receiver/ }), { key: 'ArrowUp' });
    expect(moves).toEqual([
      ['H', { x: -13, y: -1.6 }],
      ['H', { x: -13, y: -1.1 }],
    ]);
  });

  it('a view-only sheet has no buttons', () => {
    render(<FieldSheet play={play()} terminology={{}} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /^H, slot receiver/ })).toBeInTheDocument();
  });

  it('players are not movable without onMovePlayer', () => {
    const onSelect = vi.fn();
    render(<FieldSheet play={play()} terminology={{}} onSelect={onSelect} />);
    const h = screen.getByRole('button', { name: /^H, slot receiver/ });
    fireEvent.keyDown(h, { key: 'ArrowRight' });
    fireEvent.keyDown(h, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('H');
  });

  it('under reduced motion routes are drawn without the draw-on animation class', () => {
    const { container, rerender } = render(<FieldSheet play={play()} terminology={{}} />);
    expect(container.querySelectorAll('.pb2-route-draw').length).toBe(4);
    rerender(<FieldSheet play={play()} terminology={{}} reducedMotion />);
    expect(container.querySelectorAll('.pb2-route-draw').length).toBe(0);
  });

  it('shows the coach note in handwriting and the title block', () => {
    const p = { ...play(), notes: 'Ball out by 3' };
    render(<FieldSheet play={p} terminology={{}} />);
    expect(screen.getByText('Ball out by 3')).toHaveClass('pb2-note');
    const title = screen.getByTestId('title-block');
    expect(within(title).getByText('SMASH')).toBeInTheDocument();
    expect(within(title).getByText(/Doubles/)).toBeInTheDocument();
  });
});

describe('MiniDiagram', () => {
  it('is a non-interactive image with an accessible name', () => {
    const { container } = render(<MiniDiagram formation={doubles} label="Doubles formation" />);
    expect(screen.getByRole('img', { name: 'Doubles formation' })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid="mini-player"]')).toHaveLength(11);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('draws the routes it is given', () => {
    const { container } = render(
      <MiniDiagram formation={doubles} routes={[[{ x: 0, y: 0 }, { x: 0, y: 10 }]]} label="x" />,
    );
    expect(container.querySelectorAll('[data-testid="mini-route"]')).toHaveLength(1);
  });
});
