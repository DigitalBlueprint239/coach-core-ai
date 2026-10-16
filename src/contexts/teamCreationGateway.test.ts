import {teamCreationGateway} from './teamCreationGateway';
import {auth} from '../services/firebase';
import type {TeamCreationOperation} from './teamCreation';
jest.mock('../services/firebase', () => ({auth: {app: {options: {projectId: 'demo-n2'}}, currentUser: null}}));
const op: TeamCreationOperation = {uid: 'A', id: 'abcdefghijklmnopqrst', name: 'Owls', code: 'ABCDEFGH', startedAt: 1000};
const body = {fields: {ownerId: {stringValue: 'A'}, name: {stringValue: 'Owls'}, code: {stringValue: 'ABCDEFGH'},
  createdAt: {timestampValue: '2026-10-15T00:00:00.000Z'}, updatedAt: {timestampValue: '2026-10-15T00:00:00.000Z'}}};
const response = (ok: boolean, status: number, data: unknown = {}) => ({ok, status, json: async () => data});
beforeEach(() => {
  Object.assign(auth, {currentUser: {uid: 'A', isAnonymous: false, email: 'synthetic@example.test', getIdToken: async () => 'synthetic-token'}});
  Object.defineProperty(globalThis, 'fetch', {configurable: true, value: jest.fn()});
});
const create = () => teamCreationGateway.create(op, new AbortController().signal);

test('create-only commit has stable id, existing allowed fields, server timestamps; success requires GET', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce(response(true, 200)).mockResolvedValueOnce(response(true, 200, body));
  await expect(create()).resolves.toMatchObject({id: op.id, ownerId: 'A', name: 'Owls'});
  const request = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
  expect(request.writes[0].currentDocument).toEqual({exists: false});
  expect(request.writes[0].update.name).toMatch(/teams\/abcdefghijklmnopqrst$/);
  expect(Object.keys(request.writes[0].update.fields).sort()).toEqual(['name', 'code', 'ownerId', 'memberIds', 'memberDetails'].sort());
  expect(request.writes[0].updateTransforms).toHaveLength(2);
  expect((fetch as jest.Mock).mock.calls[1][0]).toMatch(/documents\/teams\/abcdefghijklmnopqrst$/);
});

test('lost-ack retry ALREADY_EXISTS verifies original rather than overwriting', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce(response(false, 409, {error: {status: 'ALREADY_EXISTS'}}))
    .mockResolvedValueOnce(response(true, 200, body));
  await expect(create()).resolves.toMatchObject({id: op.id});
  expect(fetch).toHaveBeenCalledTimes(2);
});

test('commit acknowledgement alone, missing server read and mismatching owner never report success', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce(response(true, 200)).mockResolvedValueOnce(response(false, 403));
  await expect(create()).rejects.toThrow('confirmation unavailable');
  (fetch as jest.Mock).mockResolvedValueOnce(response(true, 200))
    .mockResolvedValueOnce(response(true, 200, {...body, fields: {...body.fields, ownerId: {stringValue: 'B'}}}));
  await expect(create()).rejects.toThrow('differs');
});

test('authorization denial is retained as a failure, not treated as already-created', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce(response(false, 403, {error: {status: 'PERMISSION_DENIED'}}));
  await expect(create()).rejects.toThrow('access denied');
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('account switch during token lookup prevents sending a stale request', async () => {
  Object.assign(auth, {currentUser: {uid: 'A', getIdToken: async () => {Object.assign(auth, {currentUser: {uid: 'B'}}); return 'synthetic-token';}}});
  await expect(create()).rejects.toThrow('Account changed');
  expect(fetch).not.toHaveBeenCalled();
});

test('account switch after commit prevents confirmation under B', async () => {
  (fetch as jest.Mock).mockImplementationOnce(async () => {Object.assign(auth, {currentUser: {uid: 'B'}}); return response(true, 200);});
  await expect(create()).rejects.toThrow('Account changed');
  expect(fetch).toHaveBeenCalledTimes(1);
});
