import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fullLibrary } from '../../../football-core';
import { FieldSheet } from '../field/FieldSheet';
import { playFromConcept } from '../playModel';
import { ReadSteps } from '../read/ReadSteps';

const lib = fullLibrary();
const play = playFromConcept('t1', lib.concepts.find(c => c.id === 'smash')!, lib.formations.find(f => f.id === 'doubles')!);

function Harness() {
  const [active, setActive] = useState(0);
  return (
    <>
      <FieldSheet play={play} terminology={{}} defense="cover-2" highlightStep={active} />
      <ReadSteps steps={play.read} terminology={{}} active={active} onSelect={setActive} />
    </>
  );
}

const activeBadge = () => document.querySelector('[data-testid="read-badge"][data-active="true"]')?.getAttribute('data-step');

describe('ReadSteps', () => {
  it('lists numbered steps', () => {
    render(<ReadSteps steps={play.read} terminology={{}} active={0} onSelect={vi.fn()} />);
    const steps = screen.getAllByRole('button');
    expect(steps.map(s => s.textContent)).toEqual([
      '1Watch the cornerback.',
      '2He sits on the hitch: throw the corner.',
      '3He drops with the corner: throw the hitch.',
    ]);
    expect(steps[0]).toHaveAttribute('aria-current', 'step');
  });

  it('clicking step 2 makes it active and highlights badge 2 on the field', async () => {
    render(<Harness />);
    expect(activeBadge()).toBe('1');
    await userEvent.click(screen.getByRole('button', { name: /^2/ }));
    expect(screen.getByRole('button', { name: /^2/ })).toHaveAttribute('aria-current', 'step');
    expect(activeBadge()).toBe('2');
    expect(document.querySelectorAll('[data-testid="route"][data-highlight="true"]')).toHaveLength(1);
  });

  it('arrow keys move between steps', () => {
    render(<Harness />);
    const first = screen.getByRole('button', { name: /^1/ });
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(activeBadge()).toBe('2');
    expect(screen.getByRole('button', { name: /^2/ })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('button', { name: /^2/ }), { key: 'ArrowRight' });
    fireEvent.keyDown(screen.getByRole('button', { name: /^3/ }), { key: 'ArrowRight' });
    expect(activeBadge()).toBe('3');
    fireEvent.keyDown(screen.getByRole('button', { name: /^3/ }), { key: 'ArrowLeft' });
    expect(activeBadge()).toBe('2');
    fireEvent.keyDown(screen.getByRole('button', { name: /^2/ }), { key: 'Home' });
    expect(activeBadge()).toBe('1');
  });

  it('step text uses team terminology', () => {
    render(<ReadSteps steps={play.read} terminology={{ corner: 'flag' }} active={0} onSelect={vi.fn()} />);
    expect(screen.getByText('He sits on the hitch: throw the flag.')).toBeInTheDocument();
  });
});
