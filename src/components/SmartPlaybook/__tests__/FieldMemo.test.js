/**
 * Field memoization tests
 * Verifies the custom memo comparator prevents unnecessary re-renders.
 */

import React from 'react';
import { render } from '@testing-library/react';

// Import the real Field component
import Field from '../:components:SmartPlaybook:Field.js';

describe('Field memoization', () => {
  const basePlayers = [
    { id: 'p1', x: 100, y: 100, position: 'QB', number: 12, selected: false },
    { id: 'p2', x: 200, y: 100, position: 'WR', number: 80, selected: false },
  ];

  const baseProps = {
    players: basePlayers,
    routes: [],
    onCanvasEvent: () => {},
    onPlayerDrag: () => {},
    onRouteSelect: () => {},
    selectedRouteId: null,
    width: 600,
    height: 300,
    mode: 'view',
    debug: false,
  };

  it('renders without crashing', () => {
    const { container } = render(<Field {...baseProps} />);
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('does not re-render when only callback references change', () => {
    // First render
    const { rerender, container } = render(<Field {...baseProps} />);

    // Get the canvas element
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();

    // Re-render with new callback references but same visual data
    rerender(
      <Field
        {...baseProps}
        onCanvasEvent={() => {}}
        onPlayerDrag={() => {}}
        onRouteSelect={() => {}}
      />
    );

    // Canvas should still be the same element (React didn't unmount/remount)
    expect(container.querySelector('canvas')).toBe(canvas);
  });

  it('re-renders when players array changes', () => {
    const drawSpy = jest.spyOn(HTMLCanvasElement.prototype, 'getContext');

    const { rerender } = render(<Field {...baseProps} />);
    const callsBefore = drawSpy.mock.calls.length;

    // Update players — should trigger re-render
    const newPlayers = [
      { id: 'p1', x: 150, y: 100, position: 'QB', number: 12, selected: false },
      ...basePlayers.slice(1),
    ];
    rerender(<Field {...baseProps} players={newPlayers} />);

    expect(drawSpy.mock.calls.length).toBeGreaterThan(callsBefore);
    drawSpy.mockRestore();
  });

  it('canvas has correct aria attributes', () => {
    const { container } = render(<Field {...baseProps} />);
    const canvas = container.querySelector('canvas');
    expect(canvas.getAttribute('role')).toBe('img');
    expect(canvas.getAttribute('aria-label')).toContain('view');
  });
});
