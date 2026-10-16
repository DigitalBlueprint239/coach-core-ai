import React from 'react';
import {render, screen, fireEvent, act} from '@testing-library/react';
import {TeamProvider, useTeam} from './TeamContext';
import {auth} from '../services/firebase';
import {collection, doc, onSnapshot, query} from 'firebase/firestore';
let mockUid = 'A';
const mockCreate: jest.Mock = jest.fn(() => new Promise(() => {}));
const mockListeners: Array<(value: unknown) => void> = [];
jest.mock('../hooks/useAuth', () => ({useAuth: () => ({user: {uid: mockUid}})}));
jest.mock('../services/firebase', () => ({db: {}, auth: {app: {options: {projectId: 'demo-n2'}}, currentUser: {uid: 'A'}}}));
jest.mock('./teamCreationGateway', () => ({teamCreationGateway: {create: (...args: unknown[]) => mockCreate(...args)}}));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})), doc: jest.fn(() => ({id: 'abcdefghijklmnopqrst'})),
  query: jest.fn(() => ({})), where: jest.fn(), serverTimestamp: jest.fn(),
  onSnapshot: jest.fn((_q, _options, callback) => {mockListeners.push(callback); return jest.fn();}),
}));
function Probe() {
  const t = useTeam();
  return <><p data-testid="loading">{String(t.loading)}</p><p data-testid="selected">{t.currentTeam?.id}</p><p data-testid="state">{t.teamCreation.phase}</p><p data-testid="error">{t.error}</p><p data-testid="teams">{t.userTeams.map(t => t.name).join(',')}</p>
    <button onClick={() => {void t.createTeam('Owls').catch(() => {});}}>Submit</button></>;
}
beforeEach(() => {
  localStorage.clear(); mockUid = 'A'; Object.assign(auth, {currentUser: {uid: 'A'}}); mockListeners.length = 0;
  Object.defineProperty(window, 'crypto', {configurable: true, value: {getRandomValues: (bytes: Uint8Array) => {bytes.fill(1); return bytes;}}});
  // CRA resets mock implementations before each test, including factory mocks.
  mockCreate.mockImplementation(() => new Promise(() => {}));
  (collection as jest.Mock).mockReturnValue({});
  (doc as jest.Mock).mockReturnValue({id: 'abcdefghijklmnopqrst'});
  (query as jest.Mock).mockReturnValue({});
  (onSnapshot as jest.Mock).mockImplementation((_q: unknown, _options: unknown, callback: (value: unknown) => void) => {
    mockListeners.push(callback); return () => {};
  });
});

function snapshot(fromCache: boolean, hasPendingWrites: boolean) {
  const op = JSON.parse(localStorage.getItem('coachcore:v1:demo-n2:A:team-create')!);
  return {metadata: {fromCache, hasPendingWrites}, forEach: (visit: (d: unknown) => void) => {
    visit({id: op.id, data: () => ({...op, ownerId: 'A', memberIds: ['A'], memberDetails: []})});
  }};
}

test('authenticated identity is not team readiness: delayed owner snapshot restores selection without a sleep', async () => {
  render(<TeamProvider><Probe/></TeamProvider>);
  // Auth already exposes coach A, but the owner query has not delivered.
  expect(screen.getByTestId('loading')).toHaveTextContent('true');
  expect(screen.getByTestId('selected')).toBeEmptyDOMElement();
  expect(localStorage.getItem('currentTeamId')).toBeNull();
  await act(async () => {mockListeners[0]({
    metadata: {fromCache: false, hasPendingWrites: false},
    forEach: (visit: (d: unknown) => void) => visit({id: 'original-team-a', data: () => ({
      name: 'Alpha Eagles', code: 'ABCDEFGH', ownerId: 'A', memberIds: ['A'], memberDetails: [],
    })}),
  });});
  expect(screen.getByTestId('loading')).toHaveTextContent('false');
  expect(screen.getByTestId('selected')).toHaveTextContent('original-team-a');
  expect(localStorage.getItem('currentTeamId')).toBe('original-team-a');
  expect(mockCreate).not.toHaveBeenCalled();
});
