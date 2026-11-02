import React from 'react';
import type { CoverageId, Level, Library, Terminology } from '../../../football-core';

export type AssistantCardProps = {
  level: Level;
  playbookConceptIds: string[];
  terminology: Terminology;
  onAdd(conceptId: string): void;
  library?: Library;
  /** The coverage the opponent plays most, so the sheet can draw it. */
  onTopCoverage?(coverage: CoverageId | undefined): void;
};

export const AssistantCard: React.FC<AssistantCardProps> = () => <section aria-label="Coaching assistant" />;
