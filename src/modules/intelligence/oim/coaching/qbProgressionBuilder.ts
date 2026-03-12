import type { CanonicalPlay } from '../../domains/canonicalPlay';

export const buildQbProgression = (play: CanonicalPlay): string[] => {
  return play.routeDefinitions
    .slice()
    .sort((a, b) => a.breakDepth - b.breakDepth)
    .map((route, index) => `${index + 1}. ${route.entityId} ${route.routeType} @ ${route.breakDepth}y`);
};
