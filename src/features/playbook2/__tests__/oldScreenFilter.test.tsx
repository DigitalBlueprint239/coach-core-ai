import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SmartPlaybook from '../../../components/SmartPlaybook/SmartPlaybook';

vi.mock('../../../components/SmartPlaybook/components/CanvasArea', () => ({ default: () => null }));
vi.mock('../../../components/SmartPlaybook/components/Onboarding', () => ({ default: () => null }));
vi.mock('../../../components/SmartPlaybook/components/SaveLoadPanel', () => ({
  default: ({ onLoad }: { onLoad: () => void }) => (
    <button type="button" onClick={onLoad}>
      Open library
    </button>
  ),
}));
vi.mock('../../../components/SmartPlaybook/PlayLibrary', () => ({
  default: ({ savedPlays }: { savedPlays: Array<{ id: string; name: string }> }) => (
    <ul>
      {savedPlays.map(p => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  ),
}));

beforeEach(() => {
  localStorage.clear();
});

describe('the old Smart Playbook', () => {
  it('never lists a version-2 play', async () => {
    localStorage.setItem(
      'smartPlaybook_plays',
      JSON.stringify([
        { id: 'a', name: 'Old Mesh', phase: 'offense', type: 'pass', players: [], routes: [], createdAt: '2026-10-01' },
        { id: 'b', name: 'New Smash', schemaVersion: 2, coordinateProfile: 'cc-yards-v1', teamId: 't1' },
      ]),
    );
    render(<SmartPlaybook />);
    await userEvent.click(screen.getByRole('button', { name: 'Open library' }));
    expect(screen.getByText('Old Mesh')).toBeInTheDocument();
    expect(screen.queryByText('New Smash')).not.toBeInTheDocument();
  });
});
