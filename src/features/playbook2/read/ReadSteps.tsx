import React from 'react';
import type { ReadStep, Terminology } from '../../../football-core';

export type ReadStepsProps = { steps: ReadStep[]; terminology: Terminology; active: number; onSelect(index: number): void };

export const ReadSteps: React.FC<ReadStepsProps> = () => <ol aria-label="Read steps" />;
