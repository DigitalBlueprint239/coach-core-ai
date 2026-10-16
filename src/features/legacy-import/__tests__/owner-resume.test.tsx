import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LegacyImport from '../LegacyImport';
import { CLAIM_KEY, LEGACY_KEY, decisionKey, pendingKey, declineImport, importLegacy, importNotice, ImportBackend, LegacyPlay } from '../import-legacy';
jest.mock('../firebase-import', () => ({ firebaseImport: {} }));
const owner = { uid: 'A', teamId: 'alpha', teamName: 'Alpha' };
const other = { uid: 'B', teamId: 'beta', teamName: 'Beta' };
const play: LegacyPlay = { id: 'p1', name: 'Mesh', phase: 'offense', type: 'pass', players: [], routes: [] };
const original = JSON.stringify([play]);
const claim = JSON.stringify({ ...owner, status: 'pending' });
const pending = JSON.stringify({ teamId: 'alpha', teamName: 'Alpha' });
beforeEach(() => {
  localStorage.clear(); localStorage.setItem(LEGACY_KEY, original);
  localStorage.setItem(CLAIM_KEY, claim); localStorage.setItem(pendingKey('A'), pending);
});
afterEach(() => expect(localStorage.getItem(LEGACY_KEY)).toBe(original));

test('Not now postpones unfinished import, preserves ownership and offers immediate and remounted recovery', () => {
  const backend = { copy: jest.fn(), read: jest.fn() };
  const view = render(<LegacyImport {...owner} backend={backend} />);
  fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
  expect(localStorage.getItem(decisionKey('A'))).toBeNull();
  expect(localStorage.getItem(CLAIM_KEY)).toBe(claim);
  expect(localStorage.getItem(pendingKey('A'))).toBe(pending);
  fireEvent.click(screen.getByRole('button', { name: 'Resume import' }));
  expect(screen.getByRole('button', { name: 'Import plays' })).toBeVisible();
  view.unmount(); render(<LegacyImport {...owner} backend={backend} />);
  expect(screen.getByRole('button', { name: 'Import plays' })).toBeVisible();
  expect(backend.copy).not.toHaveBeenCalled();
  expect(importNotice(localStorage, other)).toMatch(/another account/);
});

test.each([true, false])('pre-repair declined unfinished owner resumes with readback (device claim=%s)', async deviceClaim => {
  if (!deviceClaim) localStorage.removeItem(CLAIM_KEY);
  localStorage.setItem(decisionKey('A'), JSON.stringify({ decision: 'declined' }));
  const copies = new Map<string, LegacyPlay>();
  const backend: ImportBackend = {
    copy: jest.fn(async (s, p) => { const id = `${s.uid}:${s.teamId}:${p.id}`; copies.set(id, p); return id; }),
    read: jest.fn(async (_s, id) => copies.get(id)!),
  };
  const onImported = jest.fn();
  render(<LegacyImport {...owner} backend={backend} onImported={onImported} />);
  fireEvent.click(screen.getByRole('button', { name: 'Import plays' }));
  await waitFor(() => expect(onImported).toHaveBeenCalledTimes(1));
  expect(backend.read).toHaveBeenCalledTimes(1);
  expect(copies.size).toBe(1);
  expect(await importLegacy(localStorage, owner, () => true, backend)).toEqual([]);
  expect(backend.copy).toHaveBeenCalledTimes(1);
});

test('postponed owner cannot record success on failed verification; B and other teams remain blocked', async () => {
  declineImport(localStorage, owner);
  const backend = { copy: jest.fn(async () => 'A:alpha:p1'), read: jest.fn(async () => { throw new Error('offline'); }) };
  await expect(importLegacy(localStorage, owner, () => true, backend)).rejects.toThrow('offline');
  expect(localStorage.getItem(decisionKey('A'))).toBeNull();
  await expect(importLegacy(localStorage, other, () => true, backend)).rejects.toThrow('another account');
  await expect(importLegacy(localStorage, { ...owner, teamId: 'missing' }, () => true, backend)).rejects.toThrow('Alpha');
  expect(backend.copy).toHaveBeenCalledTimes(1);
});

test('a fresh offer still declines permanently without writes', async () => {
  localStorage.removeItem(CLAIM_KEY); localStorage.removeItem(pendingKey('A'));
  declineImport(localStorage, owner);
  const backend = { copy: jest.fn(), read: jest.fn() };
  expect(await importLegacy(localStorage, owner, () => true, backend)).toEqual([]);
  render(<LegacyImport {...owner} backend={backend} />);
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
  expect(backend.copy).not.toHaveBeenCalled();
});

test('switching accounts or teams after postponement withdraws recovery without releasing ownership', () => {
  const backend = { copy: jest.fn(), read: jest.fn() };
  const view = render(<LegacyImport {...owner} backend={backend} />);
  fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
  view.rerender(<LegacyImport {...other} backend={backend} />);
  expect(screen.getByRole('alert')).toHaveTextContent('another account');
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  view.rerender(<LegacyImport {...owner} teamId="other-team" backend={backend} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Alpha');
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  view.rerender(<LegacyImport {...owner} backend={backend} />);
  expect(screen.getByRole('button', { name: 'Import plays' })).toBeVisible();
  expect(localStorage.getItem(CLAIM_KEY)).toBe(claim);
  expect(localStorage.getItem(pendingKey('A'))).toBe(pending);
  expect(backend.copy).not.toHaveBeenCalled();
});
