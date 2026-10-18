import React from 'react';
import { render, screen } from '@testing-library/react';
import LegacyImport from '../LegacyImport';
import { IMPORT_CONFIG_MARKER, LEGACY_KEY, isLegacyImportEnabled } from '../import-legacy';
jest.mock('../firebase-import', () => ({ firebaseImport: {} }));

// The release-build proof (scripts/security/release-import-config.js) greps the shipped JS for
// this exact literal. Keep it tied to the same flag the enable check reads.
test('IMPORT_CONFIG_MARKER mirrors the build-time flag the enable check reads (.env.test opts in)', () => {
  expect(isLegacyImportEnabled()).toBe(true);
  expect(IMPORT_CONFIG_MARKER).toBe('coachcore:import-config=true');
});

test('the import section carries the marker as data-import-config, in both the offer and the disabled state', () => {
  localStorage.clear();
  localStorage.setItem(LEGACY_KEY, JSON.stringify([{ id: 'p1', name: 'Mesh', phase: 'offense', type: 'pass', players: [], routes: [] }]));
  const owner = { uid: 'marker-owner', teamId: 't1', teamName: 'Team' };
  const view = render(<LegacyImport {...owner} backend={{ copy: jest.fn(), read: jest.fn() }} />);
  expect(screen.getByRole('region', { name: 'Import device plays' })).toHaveAttribute('data-import-config', 'coachcore:import-config=true');
  view.unmount();
  const flag = process.env.REACT_APP_ENABLE_LEGACY_IMPORT;
  process.env.REACT_APP_ENABLE_LEGACY_IMPORT = 'false';
  try {
    render(<LegacyImport {...owner} backend={{ copy: jest.fn(), read: jest.fn() }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('disabled in this build');
    // The module-level marker was evaluated at load time (as in a real build); the section still exposes it.
    expect(screen.getByRole('region', { name: 'Import device plays' })).toHaveAttribute('data-import-config', IMPORT_CONFIG_MARKER);
  } finally { process.env.REACT_APP_ENABLE_LEGACY_IMPORT = flag; }
});
