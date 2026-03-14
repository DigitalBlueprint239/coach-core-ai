import React from 'react';
import { render, screen } from '@testing-library/react';
import CoverageBeaterPanel from '../components/CoverageBeaterPanel';

const makeSavedPlays = () => [
  {
    id: 'play-1',
    name: 'Smash Right',
    phase: 'offense',
    type: 'pass',
    players: [
      { id: 'p1', x: 100, y: 150, position: 'WR', number: 1 },
      { id: 'p2', x: 400, y: 150, position: 'WR', number: 2 },
    ],
    routes: [
      { id: 'r1', playerId: 'p1', points: [{ x: 100, y: 150 }, { x: 130, y: 80 }], type: 'corner', color: '#f00' },
      { id: 'r2', playerId: 'p2', points: [{ x: 400, y: 150 }, { x: 400, y: 120 }], type: 'hitch', color: '#00f' },
    ],
  },
];

describe('CoverageBeaterPanel', () => {
  it('renders coverage dropdown with all 8 options', () => {
    render(<CoverageBeaterPanel savedPlays={makeSavedPlays()} />);
    const select = screen.getByTestId('coverage-select');
    expect(select).toBeInTheDocument();
    const options = select.querySelectorAll('option');
    expect(options).toHaveLength(8);
  });

  it('shows plays ranked by score when coverage selected', () => {
    render(<CoverageBeaterPanel savedPlays={makeSavedPlays()} />);
    // Default is Cover 2, Smash beats Cover 2
    expect(screen.getByText('Smash Right')).toBeInTheDocument();
    expect(screen.getByText('Smash')).toBeInTheDocument();
  });

  it('shows empty state when no plays beat selected coverage', () => {
    // No saved plays → nothing to rank
    render(<CoverageBeaterPanel savedPlays={[]} />);
    expect(screen.getByText(/No plays in your playbook/)).toBeInTheDocument();
  });
});
