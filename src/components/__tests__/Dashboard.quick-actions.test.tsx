import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Dashboard from '../Dashboard';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { email: 'coach@example.com' }, loading: false })
}));

vi.mock('../../contexts/TeamContext', () => ({
  useTeam: () => ({ currentTeam: { name: 'Varsity' } })
}));

vi.mock('../index', () => ({
  useToast: () => ({ showSuccess: vi.fn() }),
  LoadingSpinner: () => <div>loading</div>
}));

vi.mock('../TeamManagement', () => ({ TeamManagement: () => <div>team management</div> }));
vi.mock('../../features/practice-planner/PracticePlanner', () => ({ default: () => <div>practice planner</div> }));
vi.mock('../SmartPlaybook/SmartPlaybook', () => ({ default: () => <div>playbook</div> }));

describe('Dashboard quick actions', () => {
  it('renders 3-tap home actions', () => {
    render(<Dashboard />);
    expect(screen.getByTestId('qa-schedule')).toBeTruthy();
    expect(screen.getByTestId('qa-message')).toBeTruthy();
    expect(screen.getByTestId('qa-practice')).toBeTruthy();
    expect(screen.getByTestId('qa-attendance')).toBeTruthy();
  });
});
