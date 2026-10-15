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
  return <><p data-testid="state">{t.teamCreation.phase}</p><p data-testid="error">{t.error}</p><p data-testid="teams">{t.userTeams.map(t => t.name).join(',')}</p>
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

test('cache and pending snapshots cannot confirm; authoritative owner snapshot can resolve a hung request', async () => {
  render(<TeamProvider><Probe/></TeamProvider>);
  fireEvent.click(screen.getByText('Submit'));
  expect(screen.getByTestId('error')).toBeEmptyDOMElement();
  expect(screen.getByTestId('state')).toHaveTextContent('saving');
  act(() => {mockListeners[0](snapshot(true, false));});
  expect(screen.getByTestId('state')).toHaveTextContent('saving');
  act(() => {mockListeners[0](snapshot(false, true));});
  expect(screen.getByTestId('state')).toHaveTextContent('saving');
  await act(async () => {mockListeners[0](snapshot(false, false));});
  expect(screen.getByTestId('state')).toHaveTextContent('confirmed');
});

test('switching accounts hides A pending operation and rejects late A snapshots immediately', async () => {
  const view = render(<TeamProvider><Probe/></TeamProvider>);
  fireEvent.click(screen.getByText('Submit'));
  expect(screen.getByTestId('error')).toBeEmptyDOMElement();
  expect(screen.getByTestId('state')).toHaveTextContent('saving');
  const old = snapshot(false, false);
  mockUid = 'B'; Object.assign(auth, {currentUser: {uid: 'B'}});
  await act(async () => {view.rerender(<TeamProvider><Probe/></TeamProvider>);});
  act(() => {mockListeners[0](old);});
  expect(screen.getByTestId('state')).toHaveTextContent('idle');
  expect(screen.getByTestId('teams')).toBeEmptyDOMElement();
  expect(localStorage.getItem('coachcore:v1:demo-n2:A:team-create')).not.toBeNull();
  expect(localStorage.getItem('coachcore:v1:demo-n2:B:team-create')).toBeNull();
});
