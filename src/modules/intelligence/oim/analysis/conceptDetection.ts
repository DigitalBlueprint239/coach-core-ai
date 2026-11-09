import type { CanonicalPlay } from '../../domains/canonicalPlay';

const conceptMatchers: Array<{ concept: string; routes: string[] }> = [
  { concept: 'mesh', routes: ['drag', 'drag'] },
  { concept: 'smash', routes: ['hitch', 'corner'] },
  { concept: 'flood', routes: ['flat', 'out', 'go'] },
  { concept: 'verts', routes: ['go', 'go', 'go', 'go'] },
  { concept: 'stick', routes: ['stick', 'flat', 'seam'] },
];

export const detectConcepts = (play: CanonicalPlay): string[] => {
  const routeTypes = play.routeDefinitions.map((route) => route.routeType.toLowerCase());

  return conceptMatchers
    .filter(({ routes }) => routes.every((routeType) => routeTypes.includes(routeType)))
    .map(({ concept }) => concept);
};
