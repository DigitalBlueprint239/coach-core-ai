import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fullLibrary, publishedLibrary } from '../../../football-core';
import { AssistantCard } from '../assistant/AssistantCard';

const slice = publishedLibrary(fullLibrary());
const REASON = 'The cornerback has the flat and cannot also run with the corner route behind him.';

const setShare = async (coverage: string, share: 'Mostly' | 'Sometimes' | 'Rarely' | 'Not at all') => {
  const group = screen.getByRole('radiogroup', { name: coverage });
  await userEvent.click(within(group).getByRole('radio', { name: share }));
};

describe('AssistantCard', () => {
  it('asks what the opponent plays before recommending', () => {
    render(<AssistantCard level="jv" playbookConceptIds={[]} terminology={{}} onAdd={vi.fn()} library={slice} />);
    expect(screen.getByText('Tell me what coverages they play.')).toBeInTheDocument();
  });

  it('Mostly Cover 2 recommends Smash with its reason', async () => {
    const onTop = vi.fn();
    render(<AssistantCard level="jv" playbookConceptIds={[]} terminology={{}} onAdd={vi.fn()} library={slice} onTopCoverage={onTop} />);
    await setShare('Cover 2', 'Mostly');
    const rec = screen.getByRole('region', { name: 'Recommended play' });
    expect(within(rec).getByText('Smash')).toHaveClass('pb2-display');
    expect(within(rec).getByText(REASON)).toHaveClass('pb2-hand');
    expect(within(rec).getByText('JV and up')).toBeInTheDocument();
    expect(onTop).toHaveBeenLastCalledWith('cover-2');
  });

  it('the most frequent coverage is the one drawn on the sheet', async () => {
    const onTop = vi.fn();
    render(<AssistantCard level="jv" playbookConceptIds={[]} terminology={{}} onAdd={vi.fn()} library={slice} onTopCoverage={onTop} />);
    await setShare('Cover 2', 'Sometimes');
    await setShare('Cover 3', 'Mostly');
    expect(onTop).toHaveBeenLastCalledWith('cover-3');
    await setShare('Cover 3', 'Not at all');
    expect(onTop).toHaveBeenLastCalledWith('cover-2');
  });

  it('a youth coach sees the not-yet message', async () => {
    render(<AssistantCard level="youth" playbookConceptIds={[]} terminology={{}} onAdd={vi.fn()} library={slice} />);
    await setShare('Cover 2', 'Mostly');
    expect(screen.getByText('No verified play beats this defense at your level yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add/ })).not.toBeInTheDocument();
  });

  it('Add to my playbook calls onAdd with the concept id', async () => {
    const onAdd = vi.fn();
    render(<AssistantCard level="varsity" playbookConceptIds={[]} terminology={{}} onAdd={onAdd} library={slice} />);
    await setShare('Cover 2', 'Mostly');
    await userEvent.click(screen.getByRole('button', { name: 'Add Smash to my playbook' }));
    expect(onAdd).toHaveBeenCalledWith('smash');
  });

  it('marks a play already in the playbook', async () => {
    render(<AssistantCard level="jv" playbookConceptIds={['smash']} terminology={{}} onAdd={vi.fn()} library={slice} />);
    await setShare('Cover 2', 'Mostly');
    expect(screen.getByText('In your playbook')).toBeInTheDocument();
  });

  it('the reason and play name use team terminology', async () => {
    render(
      <AssistantCard level="jv" playbookConceptIds={[]} terminology={{ Smash: 'Eagle', corner: 'flag' }} onAdd={vi.fn()} library={slice} />,
    );
    await setShare('Cover 2', 'Mostly');
    const rec = screen.getByRole('region', { name: 'Recommended play' });
    expect(within(rec).getByText('Eagle')).toBeInTheDocument();
    expect(within(rec).getByText(/run with the flag route behind him/)).toBeInTheDocument();
  });

  it('never shows draft content', async () => {
    render(<AssistantCard level="varsity" playbookConceptIds={[]} terminology={{}} onAdd={vi.fn()} library={fullLibrary()} />);
    await setShare('Cover 3', 'Mostly');
    // Every Cover 3 matchup in the slice is a draft (Flood, Curl-flat, Four verticals, Stick).
    expect(screen.getByText('No verified play beats this defense at your level yet.')).toBeInTheDocument();
    expect(screen.queryByText(/Flood|Four verticals|Stick|Curl-flat/)).not.toBeInTheDocument();
  });

  it('offers only published coverages, so no draft defense is ever drawn', () => {
    render(<AssistantCard level="jv" playbookConceptIds={[]} terminology={{}} onAdd={vi.fn()} library={fullLibrary()} />);
    expect(screen.getByRole('radiogroup', { name: 'Cover 2' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Cover 3' })).toBeInTheDocument();
    for (const draft of ['Cover 0', 'Cover 1', 'Cover 4']) expect(screen.queryByRole('radiogroup', { name: draft })).not.toBeInTheDocument();
  });

  it('each alternative names the coverage it beats', async () => {
    const lib = structuredClone(fullLibrary());
    for (const id of ['flood']) {
      const c = lib.concepts.find(x => x.id === id)!;
      c.verification = { status: 'approved', reviewer: 'Owner', date: '2026-11-01', sources: [] };
    }
    const m = lib.matchups.find(x => x.concept === 'flood' && x.beats === 'cover-3')!;
    m.verification = { status: 'approved', reviewer: 'Owner', date: '2026-11-01', sources: [] };
    render(<AssistantCard level="varsity" playbookConceptIds={[]} terminology={{}} onAdd={vi.fn()} library={lib} />);
    await setShare('Cover 2', 'Mostly');
    await setShare('Cover 3', 'Sometimes');
    expect(within(screen.getByRole('region', { name: 'Recommended play' })).getByText('Smash')).toBeInTheDocument();
    const alt = screen.getByRole('listitem');
    expect(alt).toHaveTextContent('Flood');
    expect(alt).toHaveTextContent('beats Cover 3');
    expect(screen.queryByText(/Also beats Cover 2/)).not.toBeInTheDocument();
  });
});
