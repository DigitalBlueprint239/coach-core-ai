import React from 'react';
import { render, screen } from '@testing-library/react';
import { MigrationBanner } from '../MigrationBanner';
jest.mock('../../hooks/useFirestore', () => ({ useMigration: () => ({ hasLocalData: true, isMigrating: false, migrateData: jest.fn() }) }));
jest.mock('../../contexts/TeamContext', () => ({ useTeam: () => ({ currentTeam: { id: 'alpha', name: 'Alpha' } }) }));
jest.mock('../ToastManager', () => ({ useToast: () => ({ showToast: jest.fn() }) }));
test('obsolete destructive migration is never offered even with legacy data and an owned team', () => {
  render(<MigrationBanner />);
  expect(screen.queryByRole('button', { name: 'Migrate Now' })).not.toBeInTheDocument();
});
