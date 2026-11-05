import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LegacyOfflineDataNotice } from '../LegacyOfflineDataNotice';

const mock = vi.hoisted(() => ({ present: false, discard: vi.fn() }));
vi.mock('../../services/firestore', () => ({
  hasQuarantinedLegacyOfflineOperations: () => mock.present,
  discardQuarantinedLegacyOfflineOperations: mock.discard,
}));

beforeEach(() => { vi.clearAllMocks(); mock.present = false; });

describe('LegacyOfflineDataNotice', () => {
  it('does not show a banner or remove data if there is nothing to clean', () => {
    render(<LegacyOfflineDataNotice />);
    expect(screen.queryByRole('region', { name: 'Legacy offline data privacy' })).not.toBeInTheDocument();
    expect(mock.discard).not.toHaveBeenCalled();
  });
  it('never removes historical data without a confirmed user decision', async () => {
    mock.present = true;
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<LegacyOfflineDataNotice />);
    expect(screen.getByText(/will never automatically sync/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Permanently discard old unsynced data' }));
    expect(mock.discard).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
  it('discards only when the user confirms, without revealing stored content', async () => {
    mock.present = true;
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<LegacyOfflineDataNotice />);
    await userEvent.click(screen.getByRole('button', { name: 'Permanently discard old unsynced data' }));
    expect(mock.discard).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('region', { name: 'Legacy offline data privacy' })).not.toBeInTheDocument();
    confirm.mockRestore();
  });
});
