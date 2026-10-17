import React from 'react';
import { render, screen } from '@testing-library/react';
import LegacyImport from '../LegacyImport';
import { CLAIM_KEY, LEGACY_KEY, decisionKey, pendingKey, importLegacy, declineImport, isLegacyImportEnabled } from '../import-legacy';
jest.mock('../firebase-import', () => ({ firebaseImport: {} }));

const owner = { uid: 'config-owner', teamId: 'original-team', teamName: 'Original Team' };
const originalFlag = process.env.REACT_APP_ENABLE_LEGACY_IMPORT;
const snapshot = () => Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)]));
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(LEGACY_KEY, JSON.stringify([{ id: 'p1', name: 'Mesh', phase: 'offense', type: 'pass', players: [], routes: [] }]));
  localStorage.setItem(CLAIM_KEY, JSON.stringify({ ...owner })); // legacy status-less owner claim
  localStorage.setItem(pendingKey(owner.uid), JSON.stringify({ teamId: owner.teamId, teamName: owner.teamName }));
  localStorage.setItem(decisionKey(owner.uid), JSON.stringify({ decision: 'declined' }));
});
afterEach(() => {
  if (originalFlag === undefined) delete process.env.REACT_APP_ENABLE_LEGACY_IMPORT;
  else process.env.REACT_APP_ENABLE_LEGACY_IMPORT = originalFlag;
});

test.each([undefined, '', 'false', 'TRUE', '1'])('configuration %s fails closed without changing originals, decisions, claims or pending recovery', async flag => {
  if (flag === undefined) delete process.env.REACT_APP_ENABLE_LEGACY_IMPORT;
  else process.env.REACT_APP_ENABLE_LEGACY_IMPORT = flag;
  const before = snapshot();
  const backend = { copy: jest.fn(), read: jest.fn() };
  expect(isLegacyImportEnabled()).toBe(false);
  render(<LegacyImport {...owner} backend={backend} />);
  expect(screen.getByRole('alert')).toHaveTextContent('disabled in this build');
  expect(screen.queryByRole('button', { name: 'Import plays' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Not now' })).not.toBeInTheDocument();
  await expect(importLegacy(localStorage, owner, () => true, backend)).rejects.toThrow('disabled in this build');
  expect(() => declineImport(localStorage, owner)).toThrow('disabled in this build');
  expect(backend.copy).not.toHaveBeenCalled(); expect(backend.read).not.toHaveBeenCalled();
  expect(snapshot()).toEqual(before);
});

test('explicit opt-in restores the original owner offer, but does not consent, transfer ownership or copy anything', () => {
  delete process.env.REACT_APP_ENABLE_LEGACY_IMPORT;
  const before = snapshot(); const backend = { copy: jest.fn(), read: jest.fn() };
  const view = render(<LegacyImport {...owner} backend={backend} />);
  process.env.REACT_APP_ENABLE_LEGACY_IMPORT = 'true';
  view.rerender(<LegacyImport {...owner} backend={backend} />);
  expect(screen.getByRole('button', { name: 'Import plays' })).toBeVisible();
  expect(snapshot()).toEqual(before); expect(backend.copy).not.toHaveBeenCalled();
  view.rerender(<LegacyImport {...owner} teamId="replacement-team" backend={backend} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Switch to Original Team');
  expect(screen.getByText(/Recovery requires verified account and team ownership/)).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Import plays' })).not.toBeInTheDocument();
  expect(snapshot()).toEqual(before); expect(backend.copy).not.toHaveBeenCalled();
});

test('disabled build without a device library adds no import screen or actions', () => {
  delete process.env.REACT_APP_ENABLE_LEGACY_IMPORT; localStorage.removeItem(LEGACY_KEY);
  const before = snapshot(); render(<LegacyImport {...owner} backend={{ copy: jest.fn(), read: jest.fn() }} />);
  expect(screen.queryByRole('region', { name: 'Import device plays' })).not.toBeInTheDocument();
  expect(snapshot()).toEqual(before);
});
