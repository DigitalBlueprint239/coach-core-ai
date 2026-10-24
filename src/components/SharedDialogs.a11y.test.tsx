// Shared-app dialog regressions (audit 2026-10-24: D2 Join code length and beta notice,
// D3 Create/Join dialog keyboard and names, D4 welcome modal semantics; Codex PR #94 F1/F2 focus recovery).
import React from 'react';
import {render, screen, fireEvent, waitFor, act} from '@testing-library/react';
import {CreateTeamModal, JoinTeamModal} from './TeamManagement';
import {OnboardingModal} from './OnboardingModal';

const mockJoin = jest.fn();
const mockCreate = jest.fn();
jest.mock('../contexts/TeamContext', () => ({
  JOIN_UNAVAILABLE_MESSAGE: 'Joining teams is not available during the private beta.',
  TEAM_CODE_LENGTH: 8,
  useTeam: () => ({
    confirmedTeams: [], createTeam: mockCreate, joinTeam: mockJoin, teamCreationAccount: 'A',
    teamCreation: {operation: null, phase: 'idle', error: null},
  }),
}));
jest.mock('./ToastManager', () => ({useToast: () => ({showToast: jest.fn()})}));
beforeEach(() => {mockCreate.mockReset(); mockJoin.mockReset(); mockJoin.mockRejectedValue(new Error('Joining teams is not available during the private beta.'));});

// jsdom does not move focus on Tab, so check the wrap at both ends (real Tab order is in e2e).
const tabCycleStaysInside = (dialog: HTMLElement) => {
  const items = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled])'));
  const first = items[0], last = items[items.length - 1];
  last.focus();
  fireEvent.keyDown(last, {key: 'Tab'});
  expect(first).toHaveFocus();
  fireEvent.keyDown(first, {key: 'Tab', shiftKey: true});
  expect(last).toHaveFocus();
};

describe('D2 Join code length and private-beta notice', () => {
  test('the code field keeps a full 8-character team code and says 8 characters', () => {
    render(<JoinTeamModal isOpen onClose={jest.fn()}/>);
    const field = screen.getByLabelText('Team Code');
    fireEvent.change(field, {target: {value: 'q6rhqwn4'}});
    expect(field).toHaveValue('Q6RHQWN4');
    expect(field).toHaveAttribute('maxLength', '8');
    expect(screen.getByText(/8-character team code/)).toBeInTheDocument();
    expect(screen.queryByText(/6-character/)).not.toBeInTheDocument();
  });

  test('the private-beta notice is shown before the coach types, and submitting is still refused', async () => {
    render(<JoinTeamModal isOpen onClose={jest.fn()}/>);
    const dialog = screen.getByRole('dialog', {name: 'Join Team'});
    expect(dialog).toHaveTextContent('Joining teams is not available during the private beta.');
    fireEvent.change(screen.getByLabelText('Team Code'), {target: {value: 'ABCDEFGH'}});
    fireEvent.submit(screen.getByLabelText('Team Code').closest('form')!);
    expect(mockJoin).toHaveBeenCalledWith('ABCDEFGH');
    await screen.findByRole('button', {name: 'Join Team'});
  });
});

describe('D3 Create Team and Join Team dialogs', () => {
  for (const [name, Modal] of [['Create New Team', CreateTeamModal], ['Join Team', JoinTeamModal]] as const) {
    test(`${name}: named modal dialog with a named close button`, () => {
      render(<Modal isOpen onClose={jest.fn()}/>);
      const dialog = screen.getByRole('dialog', {name});
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(screen.getByRole('button', {name: 'Close'})).toBeInTheDocument();
    });

    test(`${name}: focus starts inside, Tab and Shift+Tab stay inside, Escape closes`, () => {
      const close = jest.fn();
      render(<Modal isOpen onClose={close}/>);
      const dialog = screen.getByRole('dialog', {name});
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
      tabCycleStaysInside(dialog);
      fireEvent.keyDown(document.activeElement as HTMLElement, {key: 'Escape'});
      expect(close).toHaveBeenCalledTimes(1);
    });

    test(`${name}: focus returns to the opener when the dialog closes`, () => {
      const Host = () => {
        const [open, setOpen] = React.useState(false);
        return <><button onClick={() => setOpen(true)}>Open it</button><Modal isOpen={open} onClose={() => setOpen(false)}/></>;
      };
      render(<Host/>);
      const opener = screen.getByRole('button', {name: 'Open it'});
      opener.focus();
      fireEvent.click(opener);
      fireEvent.keyDown(document.activeElement as HTMLElement, {key: 'Escape'});
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(opener).toHaveFocus();
    });
  }
});

describe('D4 welcome modal', () => {
  test('is a named modal dialog whose name follows the step title', () => {
    render(<OnboardingModal open onClose={jest.fn()} onDemoMode={jest.fn()}/>);
    const dialog = screen.getByRole('dialog', {name: 'Welcome to Coach Core AI!'});
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    fireEvent.click(screen.getByRole('button', {name: 'Next'}));
    expect(screen.getByRole('dialog', {name: 'Team Management'})).toBeInTheDocument();
  });

  test('focus starts inside, Tab and Shift+Tab stay inside, Escape closes like the close button', () => {
    const close = jest.fn();
    render(<OnboardingModal open onClose={close} onDemoMode={jest.fn()}/>);
    fireEvent.click(screen.getByRole('button', {name: 'Next'}));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    tabCycleStaysInside(dialog);
    fireEvent.keyDown(document.activeElement as HTMLElement, {key: 'Escape'});
    expect(close).toHaveBeenCalledTimes(1);
  });

  test('uses the Elite Broadcast surface, not the legacy white panel', () => {
    render(<OnboardingModal open onClose={jest.fn()} onDemoMode={jest.fn()}/>);
    const css = Array.from(document.querySelectorAll('style')).map(s => s.textContent).join('\n');
    const panel = /\.onboarding-modal\s*\{([^}]*)\}/.exec(css)?.[1] || '';
    expect(panel).not.toMatch(/background:\s*white/);
    expect(panel).toMatch(/var\(--eb-/);
  });
});

describe('Codex PR #94 F1/F2: focus recovery inside an open dialog', () => {
  test('F1: when saving disables the focused Create Team button, focus stays in the dialog and Escape closes', async () => {
    mockCreate.mockReturnValue(new Promise(() => {}));
    const close = jest.fn();
    render(<CreateTeamModal isOpen onClose={close}/>);
    const dialog = screen.getByRole('dialog', {name: 'Create New Team'});
    fireEvent.change(screen.getByLabelText('Team Name'), {target: {value: 'Held Hawks'}});
    const submit = screen.getByRole('button', {name: 'Create Team'});
    submit.focus();
    await act(async () => {fireEvent.submit(submit.closest('form')!);});
    expect(screen.getByRole('button', {name: 'Creating...'})).toBeDisabled();
    await waitFor(() => expect(dialog).toHaveFocus());
    fireEvent.keyDown(dialog, {key: 'Tab', shiftKey: true});
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(document.activeElement).not.toBe(dialog);
    fireEvent.keyDown(document.activeElement as HTMLElement, {key: 'Escape'});
    expect(close).toHaveBeenCalledTimes(1);
  });

  test('F2: when Back is removed on the first step, focus stays in the welcome dialog and Escape closes at once', async () => {
    const close = jest.fn();
    render(<OnboardingModal open onClose={close} onDemoMode={jest.fn()}/>);
    fireEvent.click(screen.getByRole('button', {name: 'Next'}));
    const back = screen.getByRole('button', {name: 'Back'});
    back.focus();
    fireEvent.click(back);
    expect(screen.queryByRole('button', {name: 'Back'})).not.toBeInTheDocument();
    const dialog = screen.getByRole('dialog', {name: 'Welcome to Coach Core AI!'});
    await waitFor(() => expect(dialog).toHaveFocus());
    fireEvent.keyDown(document.activeElement as HTMLElement, {key: 'Escape'});
    expect(close).toHaveBeenCalledTimes(1);
  });

  test('a key that reaches the page after focus was lost still acts on the open dialog', () => {
    const close = jest.fn();
    render(<OnboardingModal open onClose={close} onDemoMode={jest.fn()}/>);
    (document.activeElement as HTMLElement).blur();
    fireEvent.keyDown(document.body, {key: 'Tab'});
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement);
    (document.activeElement as HTMLElement).blur();
    fireEvent.keyDown(document.body, {key: 'Escape'});
    expect(close).toHaveBeenCalledTimes(1);
  });
});
