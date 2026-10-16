import React from 'react';
import { render, screen, act } from '@testing-library/react';
import LegacyImport from '../LegacyImport';
import { CLAIM_KEY, LEGACY_KEY, decisionKey, pendingKey, importLegacy, importNotice, ImportBackend, ImportSession, LegacyPlay } from '../import-legacy';
jest.mock('../firebase-import', () => ({ firebaseImport: {} }));
const owner = { uid: 'A', teamId: 'alpha', teamName: 'Alpha' };
const other = { uid: 'B', teamId: 'beta', teamName: 'Beta' };
const plays: LegacyPlay[] = [1, 2].map(i => ({ id: `p${i}`, name: `Play ${i}`, phase: 'offense', type: 'pass', players: [], routes: [] }));
const original = JSON.stringify(plays);
beforeEach(() => { localStorage.clear(); localStorage.setItem(LEGACY_KEY, original); });
afterEach(() => expect(localStorage.getItem(LEGACY_KEY)).toBe(original));

test('unfinished copy blocks B before offer or write, then A resumes and verifies every copy', async () => {
  let current = true;
  const copies = new Map<string, LegacyPlay>();
  const copy = jest.fn(async (_session: ImportSession, play: LegacyPlay) => {
    copies.set(play.id, play);
    if (play.id === 'p2') current = false;
    return play.id;
  });
  const backend: ImportBackend = { copy, read: async (_session, id) => copies.get(id)! };
  await expect(importLegacy(localStorage, owner, () => current, backend)).rejects.toThrow('Account or team changed');
  expect(localStorage.getItem(decisionKey('A'))).toBeNull();
  expect(importNotice(localStorage, other)).toMatch(/another account/);
  render(<LegacyImport {...other} backend={backend} />);
  expect(screen.getByRole('region', { name: 'Import device plays' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Import plays' })).not.toBeInTheDocument();
  await expect(importLegacy(localStorage, other, () => true, backend)).rejects.toThrow('another account');
  expect(copy).toHaveBeenCalledTimes(2);
  await expect(importLegacy(localStorage, { ...owner, teamId: 'beta' }, () => true, backend)).rejects.toThrow('Alpha');
  current = true;
  copy.mockImplementation(async (_session, play) => { copies.set(play.id, play); return play.id; });
  expect(await importLegacy(localStorage, owner, () => true, backend)).toEqual(['p1', 'p2']);
  expect(copies.size).toBe(2);
  expect(JSON.parse(localStorage.getItem(CLAIM_KEY)!)).toMatchObject({ uid: 'A', teamId: 'alpha', status: 'imported' });
});

test('device claim is durable before first cloud request; storage failure prevents writes', async () => {
  const backend: ImportBackend = { copy: jest.fn(async () => 'id'), read: jest.fn(async () => plays[0]) };
  const storage: Storage = {
    length: localStorage.length, clear: () => localStorage.clear(), key: n => localStorage.key(n),
    getItem: k => localStorage.getItem(k), removeItem: k => localStorage.removeItem(k),
    setItem: (k, value) => { if (k === CLAIM_KEY) throw new Error('Storage unavailable'); localStorage.setItem(k, value); },
  };
  await expect(importLegacy(storage, owner, () => true, backend)).rejects.toThrow('Storage unavailable');
  expect(backend.copy).not.toHaveBeenCalled();
});

test('failed readback retains pending device ownership without recording success', async () => {
  const backend: ImportBackend = { copy: jest.fn(async () => 'id'), read: jest.fn(async () => { throw new Error('offline'); }) };
  await expect(importLegacy(localStorage, owner, () => true, backend)).rejects.toThrow('offline');
  expect(JSON.parse(localStorage.getItem(CLAIM_KEY)!)).toMatchObject({ uid: 'A', status: 'pending' });
  expect(localStorage.getItem(decisionKey('A'))).toBeNull();
  expect(importNotice(localStorage, other)).toMatch(/another account/);
});

test('pre-repair unfinished markers also block other accounts without rewriting them', () => {
  const pending = JSON.stringify({ teamId: 'alpha', teamName: 'Alpha', startedAt: '2026-10-14T00:00:00.000Z' });
  localStorage.setItem(pendingKey('A'), pending);
  expect(importNotice(localStorage, other)).toMatch(/another account/);
  expect(importNotice(localStorage, owner)).toBe('');
  expect(importNotice(localStorage, { ...owner, teamId: 'beta' })).toContain('Alpha');
  expect(localStorage.getItem(pendingKey('A'))).toBe(pending);
});

test.each(['{broken', '{}', '{"uid":"A","status":"unknown","teamId":"alpha"}'])('unrecognized claim fails closed: %s', claim => {
  localStorage.setItem(CLAIM_KEY, claim);
  expect(() => importNotice(localStorage, owner)).toThrow();
  expect(localStorage.getItem(CLAIM_KEY)).toBe(claim);
});

test('an already-open B tab withdraws its offer when another tab starts A import', () => {
  render(<LegacyImport {...other} backend={{ copy: jest.fn(), read: jest.fn() }} />);
  expect(screen.getByRole('button', { name: 'Import plays' })).toBeInTheDocument();
  act(() => {
    localStorage.setItem(CLAIM_KEY, JSON.stringify({ ...owner, status: 'pending' }));
    window.dispatchEvent(new StorageEvent('storage', { key: CLAIM_KEY, storageArea: localStorage }));
  });
  expect(screen.queryByRole('button', { name: 'Import plays' })).not.toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('another account');
});
