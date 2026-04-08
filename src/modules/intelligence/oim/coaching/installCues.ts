import type { CanonicalPlay } from '../../domains/canonicalPlay';

export const buildInstallCues = (play: CanonicalPlay): string[] => {
  const cues = [`Formation: ${play.formation.family} ${play.formation.variation}`];

  if (play.motion.type !== 'none') {
    cues.push(`Motion timing: ${play.motion.type} before snap`);
  }

  return cues;
};
