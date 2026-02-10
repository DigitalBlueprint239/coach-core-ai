import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PracticePlanner from '../PracticePlanner';

const generatePracticePlan = vi.fn();

vi.mock('../../../ai-brain/AIContext', () => ({
  useAI: () => ({ generatePracticePlan })
}));

describe('PracticePlanner structured output', () => {
  it('renders structured segments from adapted response', async () => {
    generatePracticePlan.mockResolvedValueOnce({
      plan: {
        name: 'Coach-Aware Plan',
        periods: [
          { id: '1', name: 'Warmup', duration: 15, drills: ['Mobility'] },
          { id: '2', name: 'Skill', duration: 20, drills: ['Passing'] },
          { id: '3', name: 'Team', duration: 25, drills: ['Situational'] },
          { id: '4', name: 'Close', duration: 10, drills: ['Review'] }
        ]
      }
    });

    render(<PracticePlanner />);
    fireEvent.click(screen.getByText('Game Prep'));
    fireEvent.click(screen.getByText('Generate with AI'));

    await waitFor(() => expect(screen.getByTestId('structured-practice-plan')).toBeTruthy());
    expect(screen.getByText('Coach-Aware Plan')).toBeTruthy();
  });

  it('regenerates only one segment and marks it regenerated', async () => {
    generatePracticePlan
      .mockResolvedValueOnce({
        plan: {
          name: 'Coach-Aware Plan',
          periods: [
            { id: '1', name: 'Warmup', duration: 15, drills: ['Mobility'] },
            { id: '2', name: 'Skill', duration: 20, drills: ['Passing'] },
            { id: '3', name: 'Team', duration: 25, drills: ['Situational'] },
            { id: '4', name: 'Close', duration: 10, drills: ['Review'] }
          ]
        }
      })
      .mockResolvedValueOnce({
        title: 'Coach-Aware Plan',
        whyThisPlan: 'Updated',
        segments: [
          { id: '2', minutes: 20, setup: 'Skill Regen', coachingPoints: ['Regen point'], variations: ['Alt'] },
          { id: 'x', minutes: 10, setup: 'x', coachingPoints: ['x'], variations: ['x'] },
          { id: 'y', minutes: 10, setup: 'y', coachingPoints: ['y'], variations: ['y'] },
          { id: 'z', minutes: 10, setup: 'z', coachingPoints: ['z'], variations: ['z'] }
        ]
      });

    render(<PracticePlanner />);
    fireEvent.click(screen.getByText('Game Prep'));
    fireEvent.click(screen.getByText('Generate with AI'));
    await waitFor(() => screen.getByTestId('structured-practice-plan'));

    fireEvent.click(screen.getAllByText('Regenerate this segment')[1]);

    await waitFor(() => expect(screen.getByText(/Status: Regenerated/)).toBeTruthy());
  });

  it('rejects invalid regenerated segments gracefully', async () => {
    generatePracticePlan
      .mockResolvedValueOnce({
        plan: {
          name: 'Coach-Aware Plan',
          periods: [
            { id: '1', name: 'Warmup', duration: 15, drills: ['Mobility'] },
            { id: '2', name: 'Skill', duration: 20, drills: ['Passing'] },
            { id: '3', name: 'Team', duration: 25, drills: ['Situational'] },
            { id: '4', name: 'Close', duration: 10, drills: ['Review'] }
          ]
        }
      })
      .mockResolvedValueOnce({ title: 'bad', segments: [] });

    render(<PracticePlanner />);
    fireEvent.click(screen.getByText('Game Prep'));
    fireEvent.click(screen.getByText('Generate with AI'));
    await waitFor(() => screen.getByTestId('structured-practice-plan'));

    fireEvent.click(screen.getAllByText('Regenerate this segment')[0]);
    await waitFor(() => expect(screen.getByText(/Regeneration rejected:/)).toBeTruthy());
  });
});
