import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PlaybookScreen from '../PlaybookScreen';
import { listPlaysV2, loadTeamSettings, savePlayV2, saveTeamSettings } from '../playStore';

const env = vi.hoisted(() => ({
  user: { uid: 'coach1', isAnonymous: false, email: 'c@example.com', displayName: 'Coach' } as unknown,
  team: { id: 't1', name: 'Eagles', ownerId: 'coach1' } as unknown,
}));
vi.mock('../../../components/AuthProvider', () => ({
  useAuth: () => ({ user: env.user, loading: false, isAuthenticated: !!env.user }),
}));
vi.mock('../../../contexts/TeamContext', () => ({ useTeam: () => ({ currentTeam: env.team }) }));
vi.mock('../playStore', () => ({
  listPlaysV2: vi.fn(() => Promise.resolve([])),
  loadTeamSettings: vi.fn(() => Promise.resolve({ terminology: {}, level: 'jv', formations: [] })),
  savePlayV2: vi.fn(() => Promise.resolve('p1')),
  saveTeamSettings: vi.fn(() => Promise.resolve()),
  isStoreError: (e: unknown) => typeof e === 'object' && e !== null && 'kind' in e,
}));

const realWidth = window.innerWidth;
const setWidth = (w: number) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: w });
  window.dispatchEvent(new Event('resize'));
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  env.user = { uid: 'coach1', isAnonymous: false, email: 'c@example.com', displayName: 'Coach' };
  env.team = { id: 't1', name: 'Eagles', ownerId: 'coach1' };
  setWidth(1440);
});
afterEach(() => setWidth(realWidth));

const ready = async () => {
  render(<PlaybookScreen />);
  await waitFor(() => expect(loadTeamSettings).toHaveBeenCalled());
  return screen.findByRole('button', { name: 'Save play' });
};
const openMore = async (item: string) => {
  await userEvent.click(screen.getByRole('button', { name: 'More' }));
  await userEvent.click(screen.getByRole('menuitem', { name: item }));
};

describe('PlaybookScreen', () => {
  it('asks a signed-out coach to sign in', () => {
    env.user = null;
    render(<PlaybookScreen />);
    expect(screen.getByText('Sign in to build your playbook.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save play' })).not.toBeInTheDocument();
  });

  it('asks for a team when none is selected', () => {
    env.team = null;
    render(<PlaybookScreen />);
    expect(screen.getByText('Pick a team to build its playbook.')).toBeInTheDocument();
  });

  it('Save is the only primary button', async () => {
    const save = await ready();
    const primaries = document.querySelectorAll('[data-primary="true"]');
    expect(primaries).toHaveLength(1);
    expect(primaries[0]).toBe(save);
  });

  it('offers 2D and a disabled 3D toggle with an explanation', async () => {
    await ready();
    expect(screen.getByRole('button', { name: '2D' })).toHaveAttribute('aria-pressed', 'true');
    const threeD = screen.getByRole('button', { name: /3D/ });
    expect(threeD).toBeDisabled();
    expect(screen.getByText('3D view arrives in a later update')).toBeInTheDocument();
  });

  it('shows the formation problem banner when a play is illegal and still allows saving', async () => {
    const save = await ready();
    await userEvent.click(screen.getByRole('button', { name: /^X, split end/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'On the line' }));
    expect(screen.getByRole('status', { name: 'Formation problems' })).toHaveTextContent(
      'Needs at least 7 players on the line (has 6).',
    );
    expect(save).toBeEnabled();
    await userEvent.click(save);
    await waitFor(() => expect(savePlayV2).toHaveBeenCalled());
    expect(screen.getByRole('status', { name: 'Formation problems' })).toBeInTheDocument();
  });

  it('a failed save shows the plain message and keeps the edits', async () => {
    vi.mocked(savePlayV2).mockRejectedValueOnce({
      kind: 'permission',
      message: "Couldn't save: only the team's coach can edit plays.",
    });
    const save = await ready();
    await openMore('Rename');
    const input = screen.getByRole('textbox', { name: 'Play name' });
    await userEvent.clear(input);
    await userEvent.type(input, 'Eagle Smash{Enter}');
    await userEvent.click(save);
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save: only the team's coach can edit plays.");
    expect(screen.getByTestId('title-block')).toHaveTextContent('EAGLE SMASH');
  });

  it('a successful save is confirmed and the play list refreshes', async () => {
    const save = await ready();
    await userEvent.click(save);
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
    expect(savePlayV2).toHaveBeenCalledWith(expect.objectContaining({ teamId: 't1', schemaVersion: 2 }), 'coach1');
    expect(vi.mocked(listPlaysV2).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('undo and redo from the More menu', async () => {
    await ready();
    await openMore('Flip');
    expect(screen.getByRole('button', { name: /^X, split end, 19 yards right/ })).toBeInTheDocument();
    await openMore('Undo');
    expect(screen.getByRole('button', { name: /^X, split end, 19 yards left/ })).toBeInTheDocument();
    await openMore('Redo');
    expect(screen.getByRole('button', { name: /^X, split end, 19 yards right/ })).toBeInTheDocument();
  });

  it('at phone width the assistant renders as a bottom sheet', async () => {
    setWidth(390);
    await ready();
    expect(screen.getByTestId('assistant-bottom-sheet')).toBeInTheDocument();
    expect(screen.queryByTestId('assistant-side')).not.toBeInTheDocument();
  });

  it('at desktop width the assistant sits beside the sheet', async () => {
    await ready();
    expect(screen.getByTestId('assistant-side')).toBeInTheDocument();
    expect(screen.queryByTestId('assistant-bottom-sheet')).not.toBeInTheDocument();
  });

  it('a new formation is saved to the team formations and appears in the Formation dropdown', async () => {
    await ready();
    await openMore('New formation');
    const dialog = screen.getByRole('dialog', { name: 'New formation' });
    const name = within(dialog).getByRole('textbox', { name: 'Formation name' });
    await userEvent.clear(name);
    await userEvent.type(name, 'Eagle Spread');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Start editing' }));
    const saveFormation = screen.getByRole('button', { name: 'Save formation' });
    await userEvent.click(saveFormation);
    await waitFor(() => expect(saveTeamSettings).toHaveBeenCalled());
    const [teamId, settings] = vi.mocked(saveTeamSettings).mock.calls[0];
    expect(teamId).toBe('t1');
    expect(settings.formations).toHaveLength(1);
    expect(settings.formations[0]).toMatchObject({ name: 'Eagle Spread' });
    expect(settings.formations[0].id.startsWith('team:')).toBe(true);
    expect(settings.formations[0].players).toHaveLength(11);
    const dropdown = await screen.findByRole('combobox', { name: 'Formation' });
    expect(within(dropdown).getByRole('option', { name: 'Eagle Spread (yours)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save play' })).toBeInTheDocument();
  });

  it('offers an autosaved draft back and restores it', async () => {
    const first = render(<PlaybookScreen />);
    await userEvent.click(await screen.findByRole('button', { name: 'More' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Rename' }));
    const input = screen.getByRole('textbox', { name: 'Play name' });
    await userEvent.clear(input);
    await userEvent.type(input, 'Unsaved Idea{Enter}');
    // Leave the screen before saving: unmounting flushes the draft at once.
    first.unmount();
    render(<PlaybookScreen />);
    const offer = await screen.findByRole('region', { name: 'Unsaved draft' });
    expect(offer).toHaveTextContent('Unsaved Idea');
    await userEvent.click(within(offer).getByRole('button', { name: 'Restore' }));
    expect(screen.getByTestId('title-block')).toHaveTextContent('UNSAVED IDEA');
    expect(screen.queryByRole('region', { name: 'Unsaved draft' })).not.toBeInTheDocument();
  });

  it('team terminology reaches the field labels and library cards', async () => {
    await ready();
    await openMore('Terminology');
    const h = screen.getByRole('textbox', { name: 'Your word for H (slot receiver)' });
    await userEvent.type(h, 'F');
    await userEvent.tab();
    await waitFor(() => expect(saveTeamSettings).toHaveBeenCalledWith('t1', expect.objectContaining({ terminology: { H: 'F' } })));
    const smash = screen.getByRole('textbox', { name: 'Your word for Smash (play)' });
    await userEvent.type(smash, 'Eagle');
    await userEvent.tab();
    await userEvent.click(screen.getByRole('button', { name: 'Back to the play' }));
    expect(screen.getByRole('button', { name: /^F, slot receiver/ })).toBeInTheDocument();
    expect(screen.getByTestId('title-block')).toHaveTextContent('EAGLE');
    await openMore('Library');
    expect(screen.getByRole('heading', { name: 'Eagle' })).toBeInTheDocument();
  });

  it("the assistant draws the opponent's main coverage and Add opens the play to save", async () => {
    await ready();
    await openMore('New play');
    expect(document.querySelectorAll('[data-testid="defender"]')).toHaveLength(0);
    const cover2 = screen.getByRole('radiogroup', { name: 'Cover 2' });
    await userEvent.click(within(cover2).getByRole('radio', { name: 'Mostly' }));
    expect(document.querySelectorAll('[data-testid="defender"]')).toHaveLength(11);
    await userEvent.click(screen.getByRole('button', { name: 'Add Smash to my playbook' }));
    expect(screen.getByTestId('title-block')).toHaveTextContent('SMASH');
    expect(document.querySelectorAll('[data-testid="route"]')).toHaveLength(4);
  });

  it('team terminology reaches the read steps and the assistant reason', async () => {
    vi.mocked(loadTeamSettings).mockResolvedValueOnce({ terminology: { corner: 'flag', Smash: 'Eagle' }, level: 'jv', formations: [] });
    await ready();
    await waitFor(() => expect(screen.getByTestId('title-block')).toHaveTextContent('EAGLE'));
    expect(screen.getByText('He sits on the hitch: throw the flag.')).toBeInTheDocument();
    const cover2 = screen.getByRole('radiogroup', { name: 'Cover 2' });
    await userEvent.click(within(cover2).getByRole('radio', { name: 'Mostly' }));
    const rec = screen.getByRole('region', { name: 'Recommended play' });
    expect(within(rec).getByText(/run with the flag route behind him/)).toBeInTheDocument();
    expect(within(rec).getByText('Eagle')).toBeInTheDocument();
  });
});
