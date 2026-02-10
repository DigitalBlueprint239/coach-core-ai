import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Dashboard from '../Dashboard';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { email: 'coach@example.com' }, loading: false })
}));

vi.mock('../../contexts/TeamContext', () => ({
  useTeam: () => ({
    currentTeam: {
      id: 't1',
      name: 'Varsity',
      updatedAt: new Date('2026-01-03T00:00:00.000Z')
    },
    userTeams: [
      {
        id: 't1',
        name: 'Varsity',
        updatedAt: new Date('2026-01-03T00:00:00.000Z'),
        memberDetails: [
          { id: 'p1', email: 'p1@example.com', joinedAt: new Date('2026-01-01T00:00:00.000Z') }
        ]
      }
    ]
  })
}));

vi.mock('../index', () => ({
  useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn() }),
  LoadingSpinner: () => <div>loading</div>
}));

vi.mock('../TeamManagement', () => ({ TeamManagement: () => <div>team management</div> }));
vi.mock('../../features/practice-planner/PracticePlanner', () => ({ default: () => <div>practice planner</div> }));
vi.mock('../SmartPlaybook/SmartPlaybook', () => ({ default: () => <div>playbook</div> }));

describe('Dashboard season health', () => {
  it('renders season health from selector output and completeness flags', () => {
    render(<Dashboard />);
    fireEvent.click(screen.getByTestId('qa-season-health'));

    expect(screen.getByTestId('season-health-panel')).toBeTruthy();
    expect(screen.getByTestId('season-health-data-status')).toBeTruthy();
    expect(screen.getByText(/Payments: Not Connected/)).toBeTruthy();
  });
});
