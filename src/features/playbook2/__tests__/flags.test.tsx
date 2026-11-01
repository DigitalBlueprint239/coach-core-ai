import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isContentReviewEnabled, isPlaybookV2Enabled } from '../flags';
import Dashboard from '../../../components/Dashboard';

vi.mock('../../../components/AuthProvider', () => ({
  useAuth: () => ({
    user: { uid: 'c1', isAnonymous: false, email: 'coach@example.com', displayName: 'Coach' },
    loading: false,
    isAuthenticated: true,
    signOut: vi.fn(),
  }),
}));
vi.mock('../../../contexts/TeamContext', () => ({ useTeam: () => ({ currentTeam: null }) }));
vi.mock('../../../components/TeamManagement', () => ({ TeamManagement: () => null }));
vi.mock('../../practice-planner/PracticePlanner', () => ({ default: () => null }));
vi.mock('../../../components/SmartPlaybook/SmartPlaybook', () => ({ default: () => <div data-testid="old-playbook" /> }));
vi.mock('../PlaybookScreen', () => ({ default: () => <div data-testid="playbook-v2" /> }));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('feature flags', () => {
  it('are off by default', () => {
    vi.stubEnv('REACT_APP_ENABLE_PLAYBOOK_V2', undefined);
    vi.stubEnv('REACT_APP_ENABLE_CONTENT_REVIEW', undefined);
    expect(isPlaybookV2Enabled()).toBe(false);
    expect(isContentReviewEnabled()).toBe(false);
  });

  it("turn on only for the exact string 'true'", () => {
    for (const off of ['1', 'TRUE', 'yes', '']) {
      vi.stubEnv('REACT_APP_ENABLE_PLAYBOOK_V2', off);
      vi.stubEnv('REACT_APP_ENABLE_CONTENT_REVIEW', off);
      expect(isPlaybookV2Enabled()).toBe(false);
      expect(isContentReviewEnabled()).toBe(false);
    }
    vi.stubEnv('REACT_APP_ENABLE_PLAYBOOK_V2', 'true');
    vi.stubEnv('REACT_APP_ENABLE_CONTENT_REVIEW', 'true');
    expect(isPlaybookV2Enabled()).toBe(true);
    expect(isContentReviewEnabled()).toBe(true);
  });
});

describe("the Dashboard's Smart Playbook tab", () => {
  it('renders the old Smart Playbook when the flag is off', async () => {
    vi.stubEnv('REACT_APP_ENABLE_PLAYBOOK_V2', 'false');
    render(<Dashboard />);
    await userEvent.click(screen.getAllByRole('button', { name: /Smart Playbook/ })[0]);
    expect(await screen.findByTestId('old-playbook')).toBeInTheDocument();
    expect(screen.queryByTestId('playbook-v2')).not.toBeInTheDocument();
  });

  it('renders the new PlaybookScreen when the flag is on', async () => {
    vi.stubEnv('REACT_APP_ENABLE_PLAYBOOK_V2', 'true');
    render(<Dashboard />);
    await userEvent.click(screen.getAllByRole('button', { name: /Smart Playbook/ })[0]);
    expect(await screen.findByTestId('playbook-v2')).toBeInTheDocument();
    expect(screen.queryByTestId('old-playbook')).not.toBeInTheDocument();
  });
});
