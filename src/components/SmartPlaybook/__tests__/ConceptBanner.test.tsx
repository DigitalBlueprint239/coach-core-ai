import React from 'react';
import { render, screen } from '@testing-library/react';
import ConceptBanner from '../components/ConceptBanner';

describe('ConceptBanner', () => {
  it('renders nothing when no concept is detected', () => {
    const { container } = render(
      <ConceptBanner
        players={[{ id: 'p1', x: 100, y: 150, position: 'WR', number: 1 }]}
        routes={[]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when no routes assigned', () => {
    const { container } = render(
      <ConceptBanner
        players={[
          { id: 'p1', x: 100, y: 150, position: 'WR', number: 1 },
          { id: 'p2', x: 200, y: 150, position: 'WR', number: 2 },
        ]}
        routes={[
          { id: 'r1', playerId: 'p1', points: [{ x: 100, y: 150 }], type: 'custom', color: '#f00' },
        ]}
      />,
    );
    // custom route type doesn't map to a football route, so no concept
    expect(container.firstChild).toBeNull();
  });

  it('renders concept name when Smash concept is detected (corner + hitch)', () => {
    render(
      <ConceptBanner
        players={[
          { id: 'p1', x: 100, y: 150, position: 'WR', number: 1 },
          { id: 'p2', x: 200, y: 150, position: 'WR', number: 2 },
        ]}
        routes={[
          { id: 'r1', playerId: 'p1', points: [{ x: 100, y: 150 }, { x: 130, y: 80 }], type: 'corner', color: '#f00' },
          { id: 'r2', playerId: 'p2', points: [{ x: 200, y: 150 }, { x: 200, y: 120 }], type: 'hitch', color: '#00f' },
        ]}
      />,
    );
    expect(screen.getByTestId('concept-banner')).toBeInTheDocument();
    expect(screen.getByText('Smash')).toBeInTheDocument();
  });

  it('renders nothing with empty players', () => {
    const { container } = render(<ConceptBanner players={[]} routes={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
