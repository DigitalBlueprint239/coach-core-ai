import React from 'react';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import LegacyImport from '../LegacyImport';
import {CLAIM_KEY, LEGACY_KEY, decisionKey, pendingKey, importLegacy, LegacyPlay} from '../import-legacy';
jest.mock('../firebase-import', () => ({firebaseImport: {}}));
const owner = {uid: 'A', teamId: 'original-alpha', teamName: 'Alpha'};
const replacement = {...owner, teamId: 'replacement-beta', teamName: 'Beta'};
const other = {uid: 'B', teamId: 'bravo', teamName: 'Bravo'};
const play: LegacyPlay = {id: 'p1', name: 'Mesh', phase: 'offense', type: 'pass', players: [], routes: []};
const original = JSON.stringify([play]);
beforeEach(() => {localStorage.clear(); localStorage.setItem(LEGACY_KEY, original);});
afterEach(() => expect(localStorage.getItem(LEGACY_KEY)).toBe(original));

test('R3 fresh Not now remains declined after remount and team switch, with no writes', async () => {
  const backend = {copy: jest.fn(), read: jest.fn()};
  const view = render(<LegacyImport {...owner} backend={backend}/>);
  fireEvent.click(screen.getByRole('button', {name: 'Not now'}));
  const decision = localStorage.getItem(decisionKey('A'));
  expect(JSON.parse(decision!)).toEqual({decision: 'declined'});
  view.unmount();
  const reopened = render(<LegacyImport {...owner} backend={backend}/>);
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
  reopened.rerender(<LegacyImport {...replacement} backend={backend}/>);
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
  expect(await importLegacy(localStorage, replacement, () => true, backend)).toEqual([]);
  expect(localStorage.getItem(decisionKey('A'))).toBe(decision);
  expect(localStorage.getItem(CLAIM_KEY)).toBeNull();
  expect(backend.copy).not.toHaveBeenCalled();
});

test('R3 decision is account-wide, not tied to legacy contents; replacing the library does not re-offer it', () => {
  const backend = {copy: jest.fn(), read: jest.fn()};
  const view = render(<LegacyImport {...owner} backend={backend}/>);
  fireEvent.click(screen.getByRole('button', {name: 'Not now'}));
  view.unmount();
  const changed = JSON.stringify([{...play, id: 'new-library-play'}]);
  localStorage.setItem(LEGACY_KEY, changed);
  render(<LegacyImport {...owner} backend={backend}/>);
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
  expect(backend.copy).not.toHaveBeenCalled();
  expect(localStorage.getItem(LEGACY_KEY)).toBe(changed);
  // Restore synthetic fixture for the preservation anchor; no app code removes data.
  localStorage.setItem(LEGACY_KEY, original);
});

test('R1c absent original team leaves owner on replacement and coach B blocked; restoring original access permits verified resume', async () => {
  const claim = JSON.stringify({...owner, status: 'pending'});
  const pending = JSON.stringify({teamId: owner.teamId, teamName: owner.teamName});
  localStorage.setItem(CLAIM_KEY, claim); localStorage.setItem(pendingKey('A'), pending);
  const copies = new Map<string, LegacyPlay>([['copy-p1', play]]);
  const backend = {copy: jest.fn(async () => 'copy-p1'), read: jest.fn(async () => copies.get('copy-p1')!)};
  const view = render(<LegacyImport {...replacement} backend={backend}/>);
  expect(screen.getByRole('alert')).toHaveTextContent('Switch to Alpha');
  expect(screen.queryByRole('button', {name: 'Import plays'})).not.toBeInTheDocument();
  await expect(importLegacy(localStorage, replacement, () => true, backend)).rejects.toThrow('Alpha');
  view.rerender(<LegacyImport {...other} backend={backend}/>);
  expect(screen.getByRole('alert')).toHaveTextContent('another account');
  await expect(importLegacy(localStorage, other, () => true, backend)).rejects.toThrow('another account');
  expect(backend.copy).not.toHaveBeenCalled();
  expect(localStorage.getItem(CLAIM_KEY)).toBe(claim);
  expect(localStorage.getItem(pendingKey('A'))).toBe(pending);
  expect(localStorage.getItem(decisionKey('A'))).toBeNull();
  // Simulate restored authorized access, not deletion/reassignment/unblocking.
  view.rerender(<LegacyImport {...owner} backend={backend}/>);
  fireEvent.click(screen.getByRole('button', {name: 'Import plays'}));
  await waitFor(() => expect(localStorage.getItem(decisionKey('A'))).not.toBeNull());
  expect(backend.read).toHaveBeenCalledTimes(1);
  expect(copies.size).toBe(1);
  expect(JSON.parse(localStorage.getItem(decisionKey('A'))!)).toEqual({decision: 'imported', teamId: owner.teamId, ids: ['copy-p1']});
});


test('R1c legacy status-less claim plus pending marker remains recoverable after a prior decline', async () => {
  // 8dcf9a7 wrote a status-less claim before the decision and pending cleanup.
  localStorage.setItem(CLAIM_KEY, JSON.stringify({...owner, ids: ['copy-p1'], at: '2026-10-13T00:00:00.000Z'}));
  localStorage.setItem(pendingKey('A'), JSON.stringify({teamId: owner.teamId, teamName: owner.teamName}));
  localStorage.setItem(decisionKey('A'), JSON.stringify({decision: 'declined'}));
  const backend = {copy: jest.fn(async () => 'copy-p1'), read: jest.fn(async () => play)};
  render(<LegacyImport {...owner} backend={backend}/>);
  fireEvent.click(screen.getByRole('button', {name: 'Import plays'}));
  await waitFor(() => expect(JSON.parse(localStorage.getItem(decisionKey('A'))!).decision).toBe('imported'));
  expect(backend.copy).toHaveBeenCalledTimes(1);
  expect(backend.read).toHaveBeenCalledTimes(1);
});


test.each(['different-account', 'different-team', 'imported', 'no-pending', 'conflicting-marker'])(
  'R1c legacy fallback does not reopen unsafe or terminal state: %s', async scenario => {
    localStorage.setItem(CLAIM_KEY, JSON.stringify({...owner, ...(scenario === 'imported' ? {status: 'imported'} : {})}));
    localStorage.setItem(decisionKey('A'), JSON.stringify({decision: 'declined'}));
    if (scenario !== 'no-pending') localStorage.setItem(pendingKey('A'), JSON.stringify({teamId: scenario === 'conflicting-marker' ? replacement.teamId : owner.teamId}));
    const session = scenario === 'different-account' ? other :
      scenario === 'different-team' || scenario === 'conflicting-marker' ? replacement : owner;
    const backend = {copy: jest.fn(), read: jest.fn()};
    const claimBefore = localStorage.getItem(CLAIM_KEY);
    if (scenario === 'different-account' || scenario === 'different-team') {
      await expect(importLegacy(localStorage, session, () => true, backend)).rejects.toThrow();
    } else expect(await importLegacy(localStorage, session, () => true, backend)).toEqual([]);
    render(<LegacyImport {...session} backend={backend}/>);
    expect(screen.queryByRole('button', {name: 'Import plays'})).not.toBeInTheDocument();
    expect(backend.copy).not.toHaveBeenCalled();
    expect(localStorage.getItem(CLAIM_KEY)).toBe(claimBefore);
  },
);
