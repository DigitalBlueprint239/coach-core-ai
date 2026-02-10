import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PracticePlanner from '../PracticePlanner';

vi.mock('../../../ai-brain/AIContext', () => ({
  useAI: () => ({
    generatePracticePlan: vi.fn(async () => ({
      plan: {
        name: 'Coach-Aware Plan',
        periods: [
          { id: '1', name: 'Warmup', duration: 15, drills: ['Mobility'] },
          { id: '2', name: 'Skill', duration: 20, drills: ['Passing'] },
          { id: '3', name: 'Team', duration: 25, drills: ['Situational'] },
          { id: '4', name: 'Close', duration: 10, drills: ['Review'] }
        ]
      }
    }))
  })
}));

describe('PracticePlanner structured output', () => {
  it('renders structured segments from adapted response', async () => {
    render(<PracticePlanner />);
    fireEvent.click(screen.getByText('Game Prep'));
    fireEvent.click(screen.getByText('Generate with AI'));

    await waitFor(() => expect(screen.getByTestId('structured-practice-plan')).toBeTruthy());
    expect(screen.getByText('Coach-Aware Plan')).toBeTruthy();
    expect(screen.getAllByText(/Regenerate this segment/).length).toBeGreaterThan(0);
  });
});
