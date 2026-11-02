import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TerminologyPanel } from '../terminology/TerminologyPanel';
import type { TeamPlaybookSettings } from '../playModel';

const base: TeamPlaybookSettings = { terminology: {}, level: 'jv', formations: [] };

function Harness({ initial = base, spy }: { initial?: TeamPlaybookSettings; spy(s: TeamPlaybookSettings): void }) {
  const [s, setS] = useState(initial);
  return (
    <TerminologyPanel
      settings={s}
      onChange={next => {
        spy(next);
        setS(next);
      }}
    />
  );
}

describe('TerminologyPanel', () => {
  it('renaming H to F updates the preview and leaves "Hit" and "hash" alone', async () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    const h = screen.getByRole('textbox', { name: 'Your word for H (slot receiver)' });
    await userEvent.type(h, 'F');
    const preview = screen.getByTestId('terminology-preview');
    expect(preview).toHaveTextContent(/hit F on the corner/);
    expect(preview).toHaveTextContent(/Hit|hit/);
    expect(preview).toHaveTextContent('hash');
    expect(preview.textContent).not.toMatch(/\bH\b/);
    await userEvent.tab();
    expect(spy).toHaveBeenLastCalledWith({ ...base, terminology: { H: 'F' } });
  });

  it('clearing a row restores our word', async () => {
    const spy = vi.fn();
    render(<Harness initial={{ ...base, terminology: { H: 'F', TE: 'Sniffer' } }} spy={spy} />);
    const h = screen.getByRole('textbox', { name: 'Your word for H (slot receiver)' });
    expect(h).toHaveValue('F');
    await userEvent.clear(h);
    await userEvent.keyboard('{Enter}');
    expect(spy).toHaveBeenLastCalledWith({ ...base, terminology: { TE: 'Sniffer' } });
    expect(screen.getByTestId('terminology-preview')).toHaveTextContent(/hit H on the corner/);
  });

  it('has rows for positions, defenders, routes and concepts', () => {
    render(<Harness spy={vi.fn()} />);
    for (const name of [/for X /, /for TE /, /for MIKE /, /for corner /, /for Smash /]) {
      expect(screen.getByRole('textbox', { name })).toBeInTheDocument();
    }
  });

  it('changing level calls onChange with the new level', async () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Level' }), 'varsity');
    expect(spy).toHaveBeenLastCalledWith({ ...base, level: 'varsity' });
  });

  it('does not save when nothing changed', async () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    await userEvent.click(screen.getByRole('textbox', { name: 'Your word for H (slot receiver)' }));
    await userEvent.tab();
    expect(spy).not.toHaveBeenCalled();
  });
});
