// Pass concepts for the first content slice. Assignments and reads are candidates until Task 9
// verifies them against sources; change them only with sources.
import type { Concept, Verification } from '../types';

const AWAITING: Verification = { status: 'draft', sources: [], note: 'awaiting research (Task 9)' };

export const PASS_CONCEPTS: Concept[] = [
  {
    id: 'flood',
    name: 'Flood',
    minLevel: 'jv',
    assignments: [
      { slot: 'strong-1', kind: 'route', route: 'go' },
      { slot: 'strong-2', kind: 'route', route: 'sail' },
      { slot: 'strong-3', kind: 'route', route: 'flat' },
      { slot: 'weak-1', kind: 'route', route: 'dig' },
      { slot: 'back', kind: 'protect' },
    ],
    read: [
      { focus: 'SS', text: 'Eyes on the flat defender at the snap.' },
      { focus: 'H', text: 'He jumps the flat: throw the sail over him.' },
      { focus: 'Y', text: 'He sinks under the sail: hit the flat.' },
    ],
    verification: AWAITING,
  },
  {
    id: 'curl-flat',
    name: 'Curl-flat',
    minLevel: 'youth',
    assignments: [
      { slot: 'strong-1', kind: 'route', route: 'curl' },
      { slot: 'strong-2', kind: 'route', route: 'flat' },
      { slot: 'weak-1', kind: 'route', route: 'curl' },
      { slot: 'back', kind: 'protect' },
    ],
    read: [
      { focus: 'flat defender', text: 'Watch the flat defender on the curl side.' },
      { focus: 'curl', text: 'He widens to the flat: throw the curl.' },
      { focus: 'flat', text: 'He sits on the curl: throw the flat.' },
    ],
    verification: AWAITING,
  },
  {
    id: 'four-verticals',
    name: 'Four verticals',
    minLevel: 'varsity',
    assignments: [
      { slot: 'strong-1', kind: 'route', route: 'go' },
      { slot: 'strong-2', kind: 'route', route: 'seam' },
      { slot: 'weak-1', kind: 'route', route: 'go' },
      { slot: 'weak-2', kind: 'route', route: 'seam' },
      { slot: 'back', kind: 'protect' },
    ],
    read: [
      { focus: 'FS', text: 'Read the middle safety.' },
      { focus: 'seam', text: 'Throw the seam away from where he leans.' },
    ],
    verification: AWAITING,
  },
  {
    id: 'smash',
    name: 'Smash',
    minLevel: 'jv',
    assignments: [
      { slot: 'strong-1', kind: 'route', route: 'hitch' },
      { slot: 'strong-2', kind: 'route', route: 'corner' },
      { slot: 'weak-1', kind: 'route', route: 'hitch' },
      { slot: 'weak-2', kind: 'route', route: 'corner' },
      { slot: 'back', kind: 'protect' },
    ],
    read: [
      { focus: 'CB', text: 'Watch the cornerback.' },
      { focus: 'corner', text: 'He sits on the hitch: throw the corner.' },
      { focus: 'hitch', text: 'He drops with the corner: throw the hitch.' },
    ],
    verification: AWAITING,
  },
  {
    id: 'stick',
    name: 'Stick',
    minLevel: 'jv',
    assignments: [
      { slot: 'strong-1', kind: 'route', route: 'go' },
      { slot: 'strong-2', kind: 'route', route: 'stick' },
      { slot: 'strong-3', kind: 'route', route: 'flat' },
      { slot: 'weak-1', kind: 'route', route: 'hitch' },
      { slot: 'back', kind: 'protect' },
    ],
    read: [
      { focus: 'flat defender', text: 'Watch the flat defender.' },
      { focus: 'stick', text: 'He widens with the flat: throw the stick.' },
      { focus: 'flat', text: 'He sits on the stick: throw the flat.' },
    ],
    verification: AWAITING,
  },
  {
    id: 'snag',
    name: 'Snag',
    minLevel: 'jv',
    assignments: [
      { slot: 'strong-1', kind: 'route', route: 'corner' },
      { slot: 'strong-2', kind: 'route', route: 'snag' },
      { slot: 'back', kind: 'route', route: 'swing' },
      { slot: 'weak-1', kind: 'route', route: 'hitch' },
    ],
    read: [
      { focus: 'flat defender', text: 'Watch the flat defender.' },
      { focus: 'corner', text: 'He comes up: throw the corner behind him.' },
      { focus: 'snag', text: 'He widens with the swing: throw the snag.' },
    ],
    verification: AWAITING,
  },
  {
    id: 'mesh',
    name: 'Mesh',
    minLevel: 'varsity',
    assignments: [
      { slot: 'strong-1', kind: 'route', route: 'corner' },
      { slot: 'strong-2', kind: 'route', route: 'drag' },
      { slot: 'weak-2', kind: 'route', route: 'drag' },
      { slot: 'weak-1', kind: 'route', route: 'go' },
      { slot: 'back', kind: 'protect' },
    ],
    read: [
      { focus: 'drags', text: 'The two drags cross under the linebackers.' },
      { focus: 'drag', text: 'Throw to the drag that comes free of his man.' },
    ],
    verification: AWAITING,
  },
];
