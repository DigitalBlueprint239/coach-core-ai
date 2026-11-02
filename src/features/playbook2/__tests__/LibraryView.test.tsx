import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fullLibrary, type Library } from '../../../football-core';
import { LibraryView } from '../library/LibraryView';
import { formationCopy, type PlayV2, type TeamPlaybookSettings } from '../playModel';

const settings = (over: Partial<TeamPlaybookSettings> = {}): TeamPlaybookSettings => ({
  terminology: {},
  level: 'varsity',
  formations: [],
  ...over,
});

/** The real library, with Flood approved so it is publishable (Flood needs a #3 receiver). */
function withFloodApproved(): Library {
  const lib = structuredClone(fullLibrary());
  const flood = lib.concepts.find(c => c.id === 'flood')!;
  flood.verification = { status: 'approved', reviewer: 'Owner', date: '2026-11-01', sources: flood.verification.status === 'draft' ? flood.verification.sources : [] };
  return lib;
}

const cards = () => screen.getAllByRole('article');

describe('LibraryView', () => {
  it('shows only published library items', () => {
    render(<LibraryView settings={settings()} teamId="t1" onUse={vi.fn()} onClose={vi.fn()} library={fullLibrary()} />);
    expect(screen.getByRole('heading', { name: 'Smash' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Flood' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Mesh' })).not.toBeInTheDocument();
  });

  it('every card has a diagram', async () => {
    render(<LibraryView settings={settings()} teamId="t1" onUse={vi.fn()} onClose={vi.fn()} library={fullLibrary()} />);
    for (const card of cards()) expect(within(card).getByRole('img')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Formations' }));
    expect(cards().length).toBeGreaterThan(0);
    for (const card of cards()) expect(within(card).getByRole('img')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Empty' })).not.toBeInTheDocument();
  });

  it('Use this creates a copy, not the template', async () => {
    const lib = fullLibrary();
    const before = JSON.stringify(lib);
    const onUse = vi.fn();
    render(<LibraryView settings={settings()} teamId="t1" onUse={onUse} onClose={vi.fn()} library={lib} />);
    await userEvent.click(screen.getByRole('button', { name: 'Use Smash from Doubles' }));
    const play = onUse.mock.calls[0][0] as PlayV2;
    expect(play).toMatchObject({ teamId: 't1', schemaVersion: 2, conceptId: 'smash', fromLibrary: { kind: 'concept', id: 'smash' } });
    play.formation.players[0].at.x = 42;
    play.assignments.length = 0;
    expect(JSON.stringify(lib)).toBe(before);
  });

  it('a play is offered only from formations it can run from', () => {
    render(<LibraryView settings={settings()} teamId="t1" onUse={vi.fn()} onClose={vi.fn()} library={withFloodApproved()} />);
    const flood = screen.getByRole('heading', { name: 'Flood' }).closest('article')!;
    expect(within(flood).getByRole('button', { name: 'Use Flood from Trips Right' })).toBeInTheDocument();
    expect(within(flood).queryByRole('button', { name: 'Use Flood from Doubles' })).not.toBeInTheDocument();
  });

  it("the coach's own formations come first, marked Yours", async () => {
    const doubles = fullLibrary().formations.find(f => f.id === 'doubles')!;
    const mine = formationCopy(doubles, 'Eagle Doubles');
    const onUse = vi.fn();
    render(<LibraryView settings={settings({ formations: [mine] })} teamId="t1" onUse={onUse} onClose={vi.fn()} library={fullLibrary()} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Formations' }));
    const first = cards()[0];
    expect(within(first).getByRole('heading', { name: 'Eagle Doubles' })).toBeInTheDocument();
    expect(within(first).getByText('Yours')).toBeInTheDocument();
    await userEvent.click(within(first).getByRole('button', { name: 'Use Eagle Doubles' }));
    expect((onUse.mock.calls[0][0] as PlayV2).formation.name).toBe('Eagle Doubles');
  });

  it('filters by level and by what a play beats; filters to nothing show the empty-state sentence', async () => {
    render(<LibraryView settings={settings({ level: 'youth' })} teamId="t1" onUse={vi.fn()} onClose={vi.fn()} library={fullLibrary()} />);
    expect(screen.getByText('No verified plays match these filters yet.')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Level' }), 'varsity');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Beats' }), 'cover-2');
    expect(screen.getByRole('heading', { name: 'Smash' })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Beats' }), 'cover-3');
    expect(screen.getByText('No verified plays match these filters yet.')).toBeInTheDocument();
  });

  it('library names use team terminology', () => {
    render(
      <LibraryView settings={settings({ terminology: { Smash: 'Eagle' } })} teamId="t1" onUse={vi.fn()} onClose={vi.fn()} library={fullLibrary()} />,
    );
    expect(screen.getByRole('heading', { name: 'Eagle' })).toBeInTheDocument();
  });
});
