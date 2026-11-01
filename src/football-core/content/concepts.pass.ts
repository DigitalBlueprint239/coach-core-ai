// Pass concepts for the first content slice. Verified items cite their sources (./sources); drafts
// wait in the owner's review queue. Change assignments and reads only with sources.
import { GLAZIER_SMASH, ITP_COVER_3, USAF_EAGLES_MESH, WWTP_MESH, WWTP_SMASH, YFO_BEAT_COVER_3, YFO_CURL_FLAT, YFO_FLOOD_TRIPS } from './sources';
import type { Concept } from '../types';


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
    verification: { status: 'draft', sources: [YFO_FLOOD_TRIPS, YFO_BEAT_COVER_3], note: 'Routes and flat-defender read confirmed by one reliable publisher only; a second publisher is needed.' },
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
    verification: { status: 'draft', sources: [YFO_CURL_FLAT], note: 'Confirmed by one reliable publisher only; the backside curl (no weak-side flat) is our simplification and is unconfirmed.' },
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
    verification: { status: 'draft', sources: [YFO_BEAT_COVER_3, ITP_COVER_3], note: 'Routes confirmed by two publishers, but the middle-safety read was only found in sources that do not qualify.' },
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
    verification: { status: 'verified', sources: [GLAZIER_SMASH, WWTP_SMASH] },
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
    verification: { status: 'draft', sources: [YFO_BEAT_COVER_3], note: 'Sources disagree on which receiver runs the stick and which the flat (USA Football/Pruitt has #2 flat, #3 stick); the owner should decide.' },
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
    verification: { status: 'draft', sources: [], note: 'Only blogs and fan sites found so far; no qualifying publisher yet.' },
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
    verification: { status: 'draft', sources: [USAF_EAGLES_MESH, WWTP_MESH], note: 'Two publishers describe mesh, but with different route details than these assignments (corner and go outside).' },
  },
];
