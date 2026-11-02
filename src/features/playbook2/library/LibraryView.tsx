import React from 'react';
import type { Library } from '../../../football-core';
import type { PlayV2, TeamPlaybookSettings } from '../playModel';

export type LibraryViewProps = {
  settings: TeamPlaybookSettings;
  teamId: string;
  onUse(play: PlayV2): void;
  onClose(): void;
  library?: Library;
};

export const LibraryView: React.FC<LibraryViewProps> = ({ onClose }) => (
  <section aria-label="Library">
    <button type="button" onClick={onClose}>
      Back to the play
    </button>
  </section>
);
