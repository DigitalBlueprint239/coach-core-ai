import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PracticePlanner from '../PracticePlanner';

const mock = vi.hoisted(() => ({
  user: { uid: 'coach-1', isAnonymous: false } as unknown,
  team: { id: 'team-a', name: 'Hawks' } as unknown,
  plans: [] as Array<Record<string, unknown>>,
  createPlan: vi.fn(async (_plan: unknown) => {}),
  generate: vi.fn(async (_input: unknown) => ({ insights: ['Check the install'], plan: { periods: [] } })),
}));

vi.mock('../../../components/AuthProvider', () => ({
  useAuth: () => ({ user: mock.user, loading: false }),
}));
vi.mock('../../../contexts/TeamContext', () => ({
  useTeam: () => ({ currentTeam: mock.team }),
}));
vi.mock('../../../hooks/useFirestore', () => ({
  usePracticePlans: (teamId: string) => ({
    plans: mock.plans.filter(p => p.teamId === teamId),
    loading: false,
    error: null,
    createPlan: mock.createPlan,
  }),
}));
vi.mock('../../../ai-brain/AIContext', () => ({
  useAI: () => ({ generateSmartPractice: mock.generate }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mock.user = { uid: 'coach-1', isAnonymous: false };
  mock.team = { id: 'team-a', name: 'Hawks' };
  mock.plans = [];
  vi.stubEnv('REACT_APP_AI_ENABLED', 'false');
});
afterEach(() => { vi.unstubAllEnvs(); });

describe('PracticePlanner team-scoped workflow', () => {
  it('requires sign-in before exposing the planner', () => {
    mock.user = null;
    render(<PracticePlanner />);
    expect(screen.getByText('Sign in to manage practice plans.')).toBeInTheDocument();
    expect(mock.generate).not.toHaveBeenCalled();
  });
  it('asks the coach to select a real team instead of generating for demo-team', () => {
    mock.team = null;
    render(<PracticePlanner />);
    expect(screen.getByText('Select a team to create or open practice plans.')).toBeInTheDocument();
    expect(mock.createPlan).not.toHaveBeenCalled();
  });
  it('submits the manual plan using the actual selected team and a valid structured period', async () => {
    render(<PracticePlanner />);
    await userEvent.clear(screen.getByRole('textbox', { name: 'Practice name' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Practice name' }), 'Wednesday fundamentals');
    await userEvent.click(screen.getByRole('button', { name: 'Skill Development' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Coaching notes' }), 'Teaching emphasis');
    await userEvent.click(screen.getByRole('button', { name: 'Save practice plan' }));
    await waitFor(() => expect(mock.createPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Wednesday fundamentals',
        duration: 90,
        goals: ['skill_dev'],
        notes: 'Teaching emphasis',
        periods: [expect.objectContaining({ name: 'Team teaching period', duration: 90, intensity: 3, drills: [] })],
      }),
    ));
    expect(await screen.findByRole('status')).toHaveTextContent('after synchronization');
    expect(mock.generate).not.toHaveBeenCalled();
  });
  it('does not invoke AI when its authenticated proxy feature is disabled', async () => {
    render(<PracticePlanner />);
    await userEvent.click(screen.getByRole('button', { name: 'Game Prep' }));
    expect(screen.getByRole('button', { name: 'Ask AI for suggestions' })).toBeDisabled();
    expect(mock.generate).not.toHaveBeenCalled();
  });
  it('when AI is explicitly enabled, sends only the actual team ID and does not save suggestions automatically', async () => {
    vi.stubEnv('REACT_APP_AI_ENABLED', 'true');
    render(<PracticePlanner />);
    await userEvent.click(screen.getByRole('button', { name: 'Game Prep' }));
    await userEvent.click(screen.getByRole('button', { name: 'Ask AI for suggestions' }));
    await waitFor(() => expect(mock.generate).toHaveBeenCalledWith({
      teamId: 'team-a', duration: 90, goals: ['game_prep'],
    }));
    expect(await screen.findByText('Check the install')).toBeInTheDocument();
    expect(mock.createPlan).not.toHaveBeenCalled();
  });
  it('reopens a saved plan for the current team without any write', async () => {
    mock.plans = [{
      id: 'plan-1', teamId: 'team-a', name: 'Tuesday red zone', date: '2026-11-03',
      duration: 60, goals: ['red_zone_offense'], notes: 'Coach approved',
      periods: [{ id: 'p1', name: 'Inside-zone walkthrough', duration: 60, drills: [], intensity: 2 }],
      createdBy: 'coach-1', createdAt: new Date(), updatedAt: new Date(),
    }];
    render(<PracticePlanner />);
    await userEvent.click(screen.getByRole('button', { name: 'Open saved plan Tuesday red zone' }));
    expect(screen.getByRole('article', { name: 'Opened saved practice plan' })).toHaveTextContent('Inside-zone walkthrough');
    expect(screen.getByText('Notes: Coach approved')).toBeInTheDocument();
    expect(mock.createPlan).not.toHaveBeenCalled();
  });
  it('does not show a previous team’s saved plans after switching teams', () => {
    mock.plans = [{ id: 'p1', teamId: 'team-a', name: 'Private team A', date: '2026-11-04',
      duration: 90, goals: [], notes: '', periods: [], createdBy: 'coach-1', createdAt: new Date(), updatedAt: new Date() }];
    mock.team = { id: 'team-b', name: 'Eagles' };
    render(<PracticePlanner />);
    expect(screen.queryByText('Private team A')).not.toBeInTheDocument();
    expect(screen.getByText('No saved plans for this team yet.')).toBeInTheDocument();
  });
});
