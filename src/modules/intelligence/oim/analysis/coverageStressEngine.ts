import type { CanonicalPlay } from '../../domains/canonicalPlay';

export interface CoverageStressSignal {
  stressScore: number;
  pressurePoints: string[];
}

export const evaluateCoverageStress = (_play: CanonicalPlay): CoverageStressSignal => {
  return {
    stressScore: 0,
    pressurePoints: [],
  };
};
