import React from 'react';
import {render, screen, fireEvent, act} from '@testing-library/react';
import {CreateTeamModal} from './TeamManagement';
import type {TeamCreationState} from '../contexts/teamCreation';
const operation = {uid: 'A', id: 'abcdefghijklmnopqrst', name: 'Pending Owls', code: 'ABCDEFGH', startedAt: 1000};
let mockCreation: TeamCreationState;
let mockAccount = 'A';
let mockConfirmed: Array<{name: string}> = [];
const mockCreate = jest.fn();
const mockToast = jest.fn();
jest.mock('../contexts/TeamContext', () => ({useTeam: () => ({
  confirmedTeams: mockConfirmed, createTeam: mockCreate, teamCreation: mockCreation, teamCreationAccount: mockAccount,
})}));
jest.mock('./ToastManager', () => ({useToast: () => ({showToast: mockToast})}));
beforeEach(() => {
  mockCreation = {operation: null, phase: 'idle', error: null};
  mockConfirmed = []; mockAccount = 'A'; mockCreate.mockReset(); mockToast.mockReset();
});

test('remounted modal retains pending team, locks new name and offers safe retry instead of a second create', async () => {
  mockCreation = {operation, phase: 'unconfirmed', error: null};
  mockCreate.mockRejectedValue(new Error('Still saving'));
  render(<CreateTeamModal isOpen onClose={jest.fn()}/>);
  expect(screen.getByLabelText('Team Name')).toHaveValue('Pending Owls');
  expect(screen.getByLabelText('Team Name')).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('same team ID');
  await act(async () => {fireEvent.click(screen.getByRole('button', {name: 'Check and retry'}));});
  expect(mockCreate).toHaveBeenCalledWith('Pending Owls');
  expect(mockToast).not.toHaveBeenCalled();
});

test('pending dialog may be dismissed, then reopened without losing its operation', () => {
  mockCreation = {operation, phase: 'saving', error: null};
  const close = jest.fn();
  const view = render(<CreateTeamModal isOpen onClose={close}/>);
  fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));
  expect(close).toHaveBeenCalledTimes(1);
  view.rerender(<CreateTeamModal isOpen={false} onClose={close}/>);
  view.rerender(<CreateTeamModal isOpen onClose={close}/>);
  expect(screen.getByLabelText('Team Name')).toHaveValue('Pending Owls');
  expect(screen.getByRole('button', {name: 'Creating...'})).toBeDisabled();
  expect(mockCreate).not.toHaveBeenCalled();
});

test('server-confirmed state closes a remounted pending modal, never an unconfirmed state', () => {
  mockCreation = {operation, phase: 'unconfirmed', error: null};
  const close = jest.fn();
  const view = render(<CreateTeamModal isOpen onClose={close}/>);
  expect(close).not.toHaveBeenCalled();
  mockCreation = {operation, phase: 'confirmed', error: null};
  view.rerender(<CreateTeamModal isOpen onClose={close}/>);
  expect(close).toHaveBeenCalledTimes(1);
  expect(mockToast).toHaveBeenCalledWith('Team created successfully!', 'success');
});

test('account switch resets the previous modal draft and suppresses its late success', async () => {
  let resolve!: (id: string) => void;
  mockCreate.mockImplementation(() => new Promise<string>(r => {resolve = r;}));
  const close = jest.fn();
  const view = render(<CreateTeamModal isOpen onClose={close}/>);
  fireEvent.change(screen.getByLabelText('Team Name'), {target: {value: 'A private draft'}});
  fireEvent.click(screen.getByRole('button', {name: 'Create Team'}));
  mockAccount = 'B';
  view.rerender(<CreateTeamModal isOpen onClose={close}/>);
  expect(screen.getByLabelText('Team Name')).toHaveValue('');
  await act(async () => {resolve(operation.id);});
  expect(close).not.toHaveBeenCalled();
  expect(mockToast).not.toHaveBeenCalled();
});

test('authentication failure is visible; no false success or silent spinning (not a claim to fix N3)', async () => {
  mockCreate.mockRejectedValue(new Error('User must be authenticated. No team submitted.'));
  render(<CreateTeamModal isOpen onClose={jest.fn()}/>);
  fireEvent.change(screen.getByLabelText('Team Name'), {target: {value: 'Owls'}});
  await act(async () => {fireEvent.click(screen.getByRole('button', {name: 'Create Team'}));});
  expect(screen.getByRole('alert')).toHaveTextContent('User must be authenticated');
  expect(screen.getByRole('button', {name: 'Create Team'})).toBeEnabled();
  expect(mockToast).not.toHaveBeenCalled();
});


test('same trimmed name requires consent; decline writes nothing and confirm submits once', async () => {
  mockConfirmed = [{name: 'Owls'}];
  mockCreate.mockImplementation(() => new Promise(() => {}));
  render(<CreateTeamModal isOpen onClose={jest.fn()}/>);
  fireEvent.change(screen.getByLabelText('Team Name'), {target: {value: ' Owls '}});
  fireEvent.click(screen.getByRole('button', {name: 'Create Team'}));
  expect(screen.getByRole('alertdialog')).toHaveTextContent('already have a team named');
  expect(mockCreate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', {name: 'Go back'}));
  expect(mockCreate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', {name: 'Create Team'}));
  fireEvent.click(screen.getByRole('button', {name: 'Create a separate team'}));
  expect(mockCreate).toHaveBeenCalledTimes(1);
  expect(mockCreate).toHaveBeenCalledWith('Owls');
});

test('pending same-name retry bypasses new-operation consent', async () => {
  mockConfirmed = [{name: operation.name}];
  mockCreation = {operation, phase: 'unconfirmed', error: null};
  mockCreate.mockRejectedValue(new Error('Still saving'));
  render(<CreateTeamModal isOpen onClose={jest.fn()}/>);
  await act(async () => {fireEvent.click(screen.getByRole('button', {name: 'Check and retry'}));});
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(mockCreate).toHaveBeenCalledWith(operation.name);
});
