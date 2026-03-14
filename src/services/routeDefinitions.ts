import { RouteDefinition } from '../types/playbook';

/**
 * 18 football route definitions.
 * Each route includes coaching cues, timing, depth, and default waypoints.
 * Waypoints are relative offsets in yards from the player's start position
 * (dx = lateral, dy = downfield).
 */
export const routeDefinitions: RouteDefinition[] = [
  // ---- Route Tree Core (1–9) ----
  {
    id: 'flat',
    name: 'Flat',
    depth: 1,
    routeTreeNumber: 1,
    family: 'horizontal',
    coachingCue: 'Release toward sideline, stay at 1 yard depth — get width fast',
    timing: '3-step',
    defaultWaypoints: [{ dx: 8, dy: 1 }],
  },
  {
    id: 'slant',
    name: 'Slant',
    depth: 5,
    routeTreeNumber: 2,
    family: 'breaking',
    coachingCue: 'Three hard steps vertical, break inside at 45 degrees — eyes to QB immediately',
    timing: '3-step',
    defaultWaypoints: [
      { dx: 0, dy: 3 },
      { dx: -5, dy: 8 },
    ],
  },
  {
    id: 'drag',
    name: 'Drag / Shallow Cross',
    depth: 3,
    routeTreeNumber: undefined,
    family: 'horizontal',
    coachingCue: 'Settle at 3 yards and cross the formation underneath linebackers',
    timing: '3-step',
    defaultWaypoints: [
      { dx: 0, dy: 3 },
      { dx: -15, dy: 3 },
    ],
  },
  {
    id: 'hitch',
    name: 'Hitch',
    depth: 6,
    routeTreeNumber: 3,
    family: 'breaking',
    coachingCue: 'Sell vertical, stop on a dime at 6 yards, present hands to QB',
    timing: '3-step',
    defaultWaypoints: [
      { dx: 0, dy: 6 },
    ],
  },
  {
    id: 'out',
    name: 'Out',
    depth: 10,
    routeTreeNumber: 4,
    family: 'breaking',
    coachingCue: 'Sell vertical, plant hard at 10 yards and break to sideline — sharp 90-degree cut',
    timing: '5-step',
    defaultWaypoints: [
      { dx: 0, dy: 10 },
      { dx: 6, dy: 10 },
    ],
  },
  {
    id: 'curl',
    name: 'Curl / Comeback',
    depth: 12,
    routeTreeNumber: 5,
    family: 'breaking',
    coachingCue: 'Push vertical to 12, spin back toward the QB, settle in the soft spot',
    timing: '5-step',
    defaultWaypoints: [
      { dx: 0, dy: 12 },
      { dx: 0, dy: 10 },
    ],
  },
  {
    id: 'in',
    name: 'In / Dig',
    depth: 12,
    routeTreeNumber: 6,
    family: 'breaking',
    coachingCue: 'Push vertical to 12, snap inside on the dig — find the window between linebackers',
    timing: '5-step',
    defaultWaypoints: [
      { dx: 0, dy: 12 },
      { dx: -8, dy: 12 },
    ],
  },
  {
    id: 'corner',
    name: 'Corner',
    depth: 15,
    routeTreeNumber: 7,
    family: 'vertical',
    coachingCue: 'Stem vertical to 12, break toward the pylon at 45 degrees — sell the post first',
    timing: '5-step',
    defaultWaypoints: [
      { dx: 0, dy: 12 },
      { dx: 6, dy: 18 },
    ],
  },
  {
    id: 'post',
    name: 'Post',
    depth: 15,
    routeTreeNumber: 8,
    family: 'vertical',
    coachingCue: 'Push vertical to 12, break inside toward the post — attack the safety',
    timing: '5-step',
    defaultWaypoints: [
      { dx: 0, dy: 12 },
      { dx: -6, dy: 18 },
    ],
  },
  {
    id: 'go',
    name: 'Go / Streak',
    depth: 30,
    routeTreeNumber: 9,
    family: 'vertical',
    coachingCue: 'Vertical release, stack the DB, run past the coverage — speed kills',
    timing: '5-step',
    defaultWaypoints: [{ dx: 0, dy: 30 }],
  },

  // ---- Additional Routes ----
  {
    id: 'dig',
    name: 'Dig',
    depth: 14,
    family: 'breaking',
    coachingCue: 'Push vertical to 14, break inside sharply — deeper than an in route, attacks Cover 3 hole',
    timing: '5-step',
    defaultWaypoints: [
      { dx: 0, dy: 14 },
      { dx: -10, dy: 14 },
    ],
  },
  {
    id: 'wheel',
    name: 'Wheel',
    depth: 20,
    family: 'vertical',
    coachingCue: 'Start toward flat, then wheel vertical up the sideline — sell the flat to the LB',
    timing: '5-step',
    defaultWaypoints: [
      { dx: 5, dy: 0 },
      { dx: 5, dy: 20 },
    ],
  },
  {
    id: 'comeback',
    name: 'Comeback',
    depth: 16,
    family: 'breaking',
    coachingCue: 'Push vertical to 16, plant hard and drive back toward the sideline at 14 — sell the go',
    timing: '7-step',
    defaultWaypoints: [
      { dx: 0, dy: 16 },
      { dx: 3, dy: 14 },
    ],
  },

  // ---- Session 9 Additions (5 routes) ----
  {
    id: 'seam',
    name: 'Seam',
    depth: 14,
    family: 'vertical',
    coachingCue: 'Find the window, throttle down at 12 if safety rotates — attack the void between LB and safety',
    timing: '5-step',
    defaultWaypoints: [{ dx: 0, dy: 14 }],
  },
  {
    id: 'shallow_cross',
    name: 'Shallow Cross',
    depth: 2,
    family: 'horizontal',
    coachingCue: 'Get across quickly under the linebackers, accelerate through at 1–3 yard depth',
    timing: '3-step',
    defaultWaypoints: [
      { dx: 0, dy: 2 },
      { dx: -15, dy: 2 },
    ],
  },
  {
    id: 'option',
    name: 'Option Route',
    depth: 7,
    family: 'breaking',
    coachingCue: 'Read the leverage — man means break away, zone means find grass at 6–8 yards',
    timing: '5-step',
    defaultWaypoints: [
      { dx: 0, dy: 7 },
      { dx: 4, dy: 7 },
    ],
  },
  {
    id: 'bubble_screen',
    name: 'Bubble Screen',
    depth: 0,
    family: 'horizontal',
    coachingCue: 'Catch it on the move, get outside the block — lateral motion toward sideline at or behind LOS',
    timing: 'quick',
    defaultWaypoints: [{ dx: 6, dy: -1 }],
  },
  {
    id: 'streak',
    name: 'Streak',
    depth: 30,
    family: 'vertical',
    coachingCue: 'Pure speed vertical — inside release between hash and numbers, attack the seam at full speed',
    timing: '5-step',
    defaultWaypoints: [{ dx: 0, dy: 30 }],
  },
];

export function getRouteById(id: string): RouteDefinition | undefined {
  return routeDefinitions.find((r) => r.id === id);
}

export function getAllRoutes(): RouteDefinition[] {
  return routeDefinitions;
}
