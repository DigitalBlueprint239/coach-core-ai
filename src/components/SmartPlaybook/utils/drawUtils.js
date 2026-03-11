/**
 * drawUtils.js – Canvas rendering utilities for play diagrams
 * Pure drawing functions for field, players, and routes.
 * Used by both the export pipeline and live preview.
 */

const FIELD_COLOR = '#22c55e';
const YARD_LINE_COLOR = 'rgba(255,255,255,0.25)';
const PLAYER_FILL = '#1e3a5f';
const PLAYER_STROKE = '#ffffff';
const SCRIMMAGE_COLOR = 'rgba(255, 255, 255, 0.6)';

/**
 * Draw yard lines and field markings on a canvas context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 */
export function drawField(ctx, width, height) {
  // Background
  ctx.fillStyle = FIELD_COLOR;
  ctx.fillRect(0, 0, width, height);

  // Yard lines (every 10% of width)
  ctx.strokeStyle = YARD_LINE_COLOR;
  ctx.lineWidth = 1;
  for (let i = 1; i < 10; i++) {
    const x = (width / 10) * i;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Line of scrimmage (at 60% height — offense is below)
  const losY = height * 0.6;
  ctx.strokeStyle = SCRIMMAGE_COLOR;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 4]);
  ctx.beginPath();
  ctx.moveTo(0, losY);
  ctx.lineTo(width, losY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Hash marks
  ctx.strokeStyle = YARD_LINE_COLOR;
  ctx.lineWidth = 1;
  const hashLeft = width * 0.33;
  const hashRight = width * 0.67;
  for (let y = 20; y < height; y += 20) {
    ctx.beginPath();
    ctx.moveTo(hashLeft - 6, y);
    ctx.lineTo(hashLeft + 6, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hashRight - 6, y);
    ctx.lineTo(hashRight + 6, y);
    ctx.stroke();
  }
}

/**
 * Draw a single player circle with position label.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number, position: string, number?: number }} player
 * @param {number} radius
 */
export function drawPlayer(ctx, player, radius = 14) {
  const { x, y, position, number } = player;

  // Circle
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = PLAYER_FILL;
  ctx.fill();
  ctx.strokeStyle = PLAYER_STROKE;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Position label
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${radius * 0.85}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = number != null ? String(number) : position.slice(0, 2);
  ctx.fillText(label, x, y);

  // Position tag below
  ctx.font = `${radius * 0.65}px sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(position, x, y + radius + 9);
}

/**
 * Draw an arrowhead at the end of a route.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x1 - second-to-last x
 * @param {number} y1 - second-to-last y
 * @param {number} x2 - last x
 * @param {number} y2 - last y
 * @param {string} color
 * @param {number} size
 */
function drawArrow(ctx, x1, y1, x2, y2, color, size = 10) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - size * Math.cos(angle - Math.PI / 6),
    y2 - size * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - size * Math.cos(angle + Math.PI / 6),
    y2 - size * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw a route line with an arrowhead.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ points: Array<{x:number,y:number}>, color: string, type: string }} route
 */
export function drawRoute(ctx, route) {
  const { points, color = '#ef4444' } = route;
  if (!points || points.length < 2) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();

  // Arrow at end
  const n = points.length;
  if (n >= 2) {
    drawArrow(
      ctx,
      points[n - 2].x, points[n - 2].y,
      points[n - 1].x, points[n - 1].y,
      color
    );
  }
}

/**
 * Draw a complete play (field + all players + all routes) onto a canvas context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} players
 * @param {Array} routes
 * @param {number} width
 * @param {number} height
 */
export function drawPlay(ctx, players, routes, width, height) {
  drawField(ctx, width, height);
  (routes || []).forEach(route => drawRoute(ctx, route));
  (players || []).forEach(player => drawPlayer(ctx, player));
}

/**
 * Render a play to a data URL (PNG).
 * @param {Array} players
 * @param {Array} routes
 * @param {number} [width=800]
 * @param {number} [height=500]
 * @param {number} [pixelRatio=2]
 * @returns {string} PNG data URL
 */
export function renderPlayToDataURL(players, routes, width = 800, height = 500, pixelRatio = 2) {
  const canvas = document.createElement('canvas');
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.scale(pixelRatio, pixelRatio);
  drawPlay(ctx, players, routes, width, height);
  return canvas.toDataURL('image/png');
}
