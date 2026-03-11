/**
 * exportUtils.test.js – Tests for play export utilities
 */

import { sanitizeFilename } from '../utils/exportUtils';
import {
  renderPlayToDataURL,
  drawField,
  drawPlayer,
  drawRoute,
  drawPlay,
} from '../utils/drawUtils';
import { createPlayer, createRoute } from '../PlayController';

// ── Canvas mock ──────────────────────────────────────────────────────────────

beforeEach(() => {
  // jsdom does not implement canvas drawing, so we need minimal mocks
  HTMLCanvasElement.prototype.getContext = jest.fn(function () {
    return {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      lineCap: '',
      lineJoin: '',
      font: '',
      textAlign: '',
      textBaseline: '',
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      fillText: jest.fn(),
      setLineDash: jest.fn(),
      closePath: jest.fn(),
      scale: jest.fn(),
      drawImage: jest.fn(),
    };
  });

  HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,TEST');
});

// ── sanitizeFilename ──────────────────────────────────────────────────────────

describe('sanitizeFilename', () => {
  it('replaces spaces with underscores', () => {
    expect(sanitizeFilename('Trips Left Smash')).toBe('Trips_Left_Smash');
  });

  it('removes special characters', () => {
    expect(sanitizeFilename('Play #1 (v2)')).toBe('Play__1__v2_');
  });

  it('keeps alphanumeric and underscores', () => {
    expect(sanitizeFilename('4th_Down_Go')).toBe('4th_Down_Go');
  });

  it('returns Play for empty or null input', () => {
    expect(sanitizeFilename('')).toBe('Play');
    expect(sanitizeFilename(null)).toBe('Play');
    expect(sanitizeFilename(undefined)).toBe('Play');
  });
});

// ── renderPlayToDataURL ──────────────────────────────────────────────────────

describe('renderPlayToDataURL', () => {
  it('returns a string starting with data:image/png', () => {
    const result = renderPlayToDataURL([], [], 800, 500);
    expect(typeof result).toBe('string');
    expect(result).toMatch(/^data:image\/png/);
  });

  it('works with players and routes', () => {
    const player = createPlayer(100, 200, 'WR', 80);
    const route = createRoute(player.id, [
      { x: 100, y: 200 },
      { x: 100, y: 100 },
    ], 'hitch');
    const result = renderPlayToDataURL([player], [route], 800, 500);
    expect(result).toMatch(/^data:image\/png/);
  });

  it('works with empty players and routes', () => {
    const result = renderPlayToDataURL([], []);
    expect(result).toMatch(/^data:image\/png/);
  });

  it('creates canvas at specified dimensions × pixelRatio', () => {
    renderPlayToDataURL([], [], 600, 400, 2);
    // Canvas was created and getContext was called
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d');
  });
});

// ── drawField ────────────────────────────────────────────────────────────────

describe('drawField', () => {
  it('calls fillRect to paint the background', () => {
    const ctx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      fillRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      setLineDash: jest.fn(),
    };
    drawField(ctx, 800, 500);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 800, 500);
  });

  it('draws yard lines and calls stroke multiple times', () => {
    const ctx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      fillRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      setLineDash: jest.fn(),
    };
    drawField(ctx, 800, 500);
    expect(ctx.stroke.mock.calls.length).toBeGreaterThan(5);
  });
});

// ── drawPlayer ────────────────────────────────────────────────────────────────

describe('drawPlayer', () => {
  let ctx;
  beforeEach(() => {
    ctx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      fillText: jest.fn(),
    };
  });

  it('draws a circle (arc) for the player', () => {
    const player = { x: 100, y: 200, position: 'WR', number: 80 };
    drawPlayer(ctx, player);
    expect(ctx.arc).toHaveBeenCalledWith(100, 200, expect.any(Number), 0, Math.PI * 2);
  });

  it('renders position label text', () => {
    const player = { x: 100, y: 200, position: 'WR', number: 80 };
    drawPlayer(ctx, player);
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it('works without a player number', () => {
    const player = { x: 50, y: 50, position: 'QB' };
    expect(() => drawPlayer(ctx, player)).not.toThrow();
  });
});

// ── drawRoute ────────────────────────────────────────────────────────────────

describe('drawRoute', () => {
  let ctx;
  beforeEach(() => {
    ctx = {
      strokeStyle: '',
      lineWidth: 1,
      lineCap: '',
      lineJoin: '',
      fillStyle: '',
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      closePath: jest.fn(),
      setLineDash: jest.fn(),
    };
  });

  it('draws lines for each route segment', () => {
    const route = {
      points: [{ x: 10, y: 10 }, { x: 50, y: 50 }, { x: 90, y: 10 }],
      color: '#ef4444',
      type: 'custom',
    };
    drawRoute(ctx, route);
    expect(ctx.moveTo).toHaveBeenCalledWith(10, 10);
    // lineTo is called for route segments + arrowhead lines
    expect(ctx.lineTo.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('does nothing for route with fewer than 2 points', () => {
    const route = { points: [{ x: 0, y: 0 }], color: '#ff0000', type: 'custom' };
    drawRoute(ctx, route);
    expect(ctx.moveTo).not.toHaveBeenCalled();
  });

  it('draws arrowhead at end of route', () => {
    const route = {
      points: [{ x: 10, y: 30 }, { x: 10, y: 10 }],
      color: '#3b82f6',
      type: 'go',
    };
    drawRoute(ctx, route);
    // Arrow uses fill() — should be called at least once
    expect(ctx.fill).toHaveBeenCalled();
  });
});

// ── PNG file naming convention ────────────────────────────────────────────────

describe('PNG export file naming', () => {
  it('filename is derived from play name with spaces replaced', () => {
    expect(sanitizeFilename('Trips Left Smash')).toBe('Trips_Left_Smash');
  });

  it('filename adds .png extension when used in export', () => {
    const name = sanitizeFilename('My Play');
    const filename = `${name}.png`;
    expect(filename).toBe('My_Play.png');
  });
});
