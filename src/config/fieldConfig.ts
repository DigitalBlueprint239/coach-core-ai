/**
 * fieldConfig.ts — Football field dimensions and constants
 * All values in yards unless otherwise noted.
 */

/** Standard football field width in yards */
export const FIELD_WIDTH_YARDS = 53 + 1 / 3; // 53.333...

/** Standard football field length in yards (end zone to end zone) */
export const FIELD_LENGTH_YARDS = 100;

/** End zone depth in yards */
export const END_ZONE_DEPTH_YARDS = 10;

/** Canvas pixel dimensions used by SmartPlaybook */
export const CANVAS_WIDTH_PX = 600;
export const CANVAS_HEIGHT_PX = 300;

/** Conversion helpers */
export function yardsToPixelsX(yards: number): number {
  return (yards / FIELD_WIDTH_YARDS) * CANVAS_WIDTH_PX;
}

export function yardsToPixelsY(yards: number): number {
  return (yards / FIELD_LENGTH_YARDS) * CANVAS_HEIGHT_PX;
}

export function pixelsToYardsX(px: number): number {
  return (px / CANVAS_WIDTH_PX) * FIELD_WIDTH_YARDS;
}

export function pixelsToYardsY(px: number): number {
  return (px / CANVAS_HEIGHT_PX) * FIELD_LENGTH_YARDS;
}
