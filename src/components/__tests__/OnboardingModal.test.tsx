import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OnboardingModal } from '../OnboardingModal';

/** Walks every step and returns each step's title and text. */
async function walk(onClose = vi.fn(), onComplete = vi.fn()) {
  render(<OnboardingModal open onClose={onClose} onComplete={onComplete} />);
  const steps: Array<{ title: string; text: string }> = [];
  for (let i = 0; i < 20; i++) {
    steps.push({ title: screen.getByRole('heading').textContent ?? '', text: document.body.textContent ?? '' });
    const next = screen.queryByRole('button', { name: 'Next' });
    if (!next) break;
    await userEvent.click(next);
  }
  return { steps, onClose, onComplete };
}

describe('OnboardingModal', () => {
  it('describes only what exists today', async () => {
    const { steps } = await walk();
    expect(steps.map(s => s.title)).toEqual([
      'Welcome to Coach Core AI', 'Your team', 'Practice Planner', 'Smart Playbook', 'Not available yet', 'Ready to get started?',
    ]);
    const available = steps.filter(s => s.title !== 'Not available yet').map(s => s.text).join(' ');
    // Each of these was advertised before it was built. They may only appear on the "Not available yet" step.
    for (const claim of [/\bAI (suggestions|assistant|advice)/i, /AI-powered/i, /analytics/i, /offline/i, /push notifications/i, /demo mode/i, /join a team/i, /rosters?/i, /attendance/i, /share with your team/i]) {
      expect(available).not.toMatch(claim);
    }
  });

  it('says plainly which features are not built', async () => {
    const { steps } = await walk();
    const notYet = steps.find(s => s.title === 'Not available yet')!.text;
    for (const feature of [/AI advice/, /analytics/, /sharing plays/, /offline use/]) expect(notYet).toMatch(feature);
    expect(notYet).toMatch(/not built yet/);
  });

  it('offers no demo mode and finishes by closing', async () => {
    const { onClose, onComplete } = await walk();
    expect(screen.queryByRole('button', { name: /demo/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Start using Coach Core' }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when closed', () => {
    const { container } = render(<OnboardingModal open={false} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
