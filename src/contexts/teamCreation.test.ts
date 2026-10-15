import {TeamCreation, TeamCreationOperation} from './teamCreation';
import type {Team} from './TeamContext';

const operation: TeamCreationOperation = {uid: 'A', id: 'abcdefghijklmnopqrst', name: 'Owls', code: 'ABCDEFGH', startedAt: 1000};
const team: Team = {...operation, ownerId: 'A', memberIds: ['A'], memberDetails: [], createdAt: new Date(), updatedAt: new Date()};
const key = 'coachcore:v1:demo:A:team-create';
const never = (_op: TeamCreationOperation, _signal: AbortSignal) => new Promise<Team>(() => {});
function setup(create: jest.Mock = jest.fn(never)) {
  const allocate = jest.fn(() => ({...operation}));
  const manager = new TeamCreation('A', key, localStorage, {create}, allocate);
  return {manager, create, allocate};
}
beforeEach(() => {localStorage.clear(); jest.useFakeTimers();});
afterEach(() => {jest.useRealTimers();});

test('journals stable identity before sending, coalesces duplicate submissions, never treats an unresolved write as saved', async () => {
  const create = jest.fn(async () => {
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual(operation);
    return never(operation, new AbortController().signal);
  });
  const {manager, allocate} = setup(create);
  const first = manager.start('Owls');
  expect(manager.start('Owls')).toBe(first);
  expect(create).toHaveBeenCalledTimes(1);
  expect(allocate).toHaveBeenCalledTimes(1);
  expect(manager.state.phase).toBe('saving');
  manager.confirm(team);
  await expect(first).resolves.toBe(operation.id);
  expect(manager.state.phase).toBe('confirmed');
});

test('lost acknowledgement surfaces after ten seconds; explicit retry reuses the same operation even if the first request never settles', async () => {
  const {manager, create, allocate} = setup();
  const first = manager.start('Owls');
  const rejection = expect(first).rejects.toThrow('Still saving');
  jest.advanceTimersByTime(10_000);
  await rejection;
  expect(manager.state.phase).toBe('unconfirmed');
  expect(localStorage.getItem(key)).not.toBeNull();
  expect(create.mock.calls[0][1].aborted).toBe(true);
  create.mockImplementationOnce(async () => team);
  await expect(manager.start('Owls')).resolves.toBe(operation.id);
  expect(allocate).toHaveBeenCalledTimes(1);
  expect(create.mock.calls.map(c => c[0].id)).toEqual([operation.id, operation.id]);
});

test('navigation/provider remount restores pending work and blocks another team operation', async () => {
  localStorage.setItem(key, JSON.stringify(operation));
  const {manager, allocate} = setup(jest.fn(async () => team));
  expect(manager.state.operation).toEqual(operation);
  await expect(manager.start('Different team')).rejects.toThrow('Finish the pending');
  await expect(manager.start('Owls')).resolves.toBe(operation.id);
  expect(allocate).not.toHaveBeenCalled();
});

test('B never loads A operation; returning A restores it', () => {
  localStorage.setItem(key, JSON.stringify(operation));
  const other = new TeamCreation('B', 'coachcore:v1:demo:B:team-create', localStorage, {create: jest.fn(never)}, jest.fn());
  expect(other.state.operation).toBeNull();
  expect(setup().manager.state.operation).toEqual(operation);
});

test('late completion after sign-out cannot confirm or erase the retained operation', async () => {
  let resolve!: (t: Team) => void;
  const {manager} = setup(jest.fn(() => new Promise<Team>(r => {resolve = r;})));
  const attempt = manager.start('Owls');
  const rejection = expect(attempt).rejects.toThrow('Account changed');
  manager.dispose();
  await rejection;
  resolve(team);
  await Promise.resolve();
  expect(manager.state.phase).not.toBe('confirmed');
  expect(JSON.parse(localStorage.getItem(key)!)).toEqual(operation);
});

test('local/wrong-account/wrong-operation data cannot acknowledge a creation', async () => {
  const {manager} = setup();
  const attempt = manager.start('Owls');
  manager.confirm({...team, ownerId: 'B'});
  manager.confirm({...team, id: 'other'});
  manager.confirm({...team, code: 'DIFFERENT'});
  expect(manager.state.phase).toBe('saving');
  manager.confirm(team);
  await attempt;
});

test('network or authorization failure preserves the pending identity instead of allocating another', async () => {
  const {manager, create, allocate} = setup(jest.fn(async () => {throw new Error('denied');}));
  await expect(manager.start('Owls')).rejects.toThrow('denied');
  await expect(manager.start('Owls')).rejects.toThrow('denied');
  expect(manager.state.phase).toBe('unconfirmed');
  expect(create).toHaveBeenCalledTimes(2);
  expect(allocate).toHaveBeenCalledTimes(1);
});

test('unreadable pending journal fails closed without deleting it or sending', async () => {
  localStorage.setItem(key, '{broken');
  const {manager, create} = setup();
  await expect(manager.start('Owls')).rejects.toThrow('cannot be read safely');
  expect(create).not.toHaveBeenCalled();
  expect(localStorage.getItem(key)).toBe('{broken');
});

test('storage failure blocks the first request, preserving retry identity is required', async () => {
  const create = jest.fn(never);
  const storage = {getItem: () => null, setItem: () => {throw new Error('quota');}} as unknown as Storage;
  const manager = new TeamCreation('A', key, storage, {create}, () => operation);
  await expect(manager.start('Owls')).rejects.toThrow('No team was submitted');
  expect(create).not.toHaveBeenCalled();
});

test('a previously mounted controller rechecks a journal written by another instance before allocating', async () => {
  const {manager, allocate} = setup(jest.fn(async () => team));
  localStorage.setItem(key, JSON.stringify(operation));
  await expect(manager.start('Different team')).rejects.toThrow('Finish the pending');
  await expect(manager.start('Owls')).resolves.toBe(operation.id);
  expect(allocate).not.toHaveBeenCalled();
});

test('confirming this operation never removes a different pending journal', async () => {
  const {manager} = setup();
  const attempt = manager.start('Owls');
  const other = {...operation, id: 'ABCDEFGHIJKLMNOPQRST', name: 'Other team'};
  localStorage.setItem(key, JSON.stringify(other));
  manager.confirm(team);
  await attempt;
  expect(JSON.parse(localStorage.getItem(key)!)).toEqual(other);
});
