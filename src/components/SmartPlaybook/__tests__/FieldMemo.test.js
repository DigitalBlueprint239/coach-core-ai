/**
 * Field memoization tests
 * Verifies the custom memo comparator prevents unnecessary re-renders.
 */

import React from 'react';
import { render } from '@testing-library/react';

// Import the real Field component
import Field from '../Field';

describe('Field memoization', () => {
  let context;
  beforeEach(() => {
    context = Object.fromEntries(
      ['clearRect', 'fillRect', 'beginPath', 'moveTo', 'lineTo', 'stroke',
       'arc', 'fill', 'fillText', 'setLineDash', 'save', 'restore',
       'translate', 'rotate', 'closePath'].map(name => [name, jest.fn()])
    );
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  });
  afterEach(() => jest.restoreAllMocks());
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

    const drawsBefore = context.clearRect.mock.calls.length;
    expect(drawsBefore).toBeGreaterThan(0);
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
    expect(context.clearRect).toHaveBeenCalledTimes(drawsBefore);
  });

  it('re-renders when players array changes', () => {
    const { rerender } = render(<Field {...baseProps} />);
    const callsBefore = context.clearRect.mock.calls.length;

    // Update players — should trigger re-render
    const newPlayers = [
      { id: 'p1', x: 150, y: 100, position: 'QB', number: 12, selected: false },
      ...basePlayers.slice(1),
    ];
    rerender(<Field {...baseProps} players={newPlayers} />);

    expect(context.clearRect.mock.calls.length).toBeGreaterThan(callsBefore);
    expect(context.arc).toHaveBeenCalledWith(150, 100, expect.any(Number), 0, 2 * Math.PI);
  });

  it('canvas has correct aria attributes', () => {
    const { container } = render(<Field {...baseProps} />);
    const canvas = container.querySelector('canvas');
    expect(canvas.getAttribute('role')).toBe('img');
    expect(canvas.getAttribute('aria-label')).toContain('view');
  });
});
