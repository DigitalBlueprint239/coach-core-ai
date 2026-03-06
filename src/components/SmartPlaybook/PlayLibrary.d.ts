import React from 'react';
import { SavedPlay } from './PlayController';

export interface PlayLibraryProps {
  savedPlays: SavedPlay[];
  onLoadPlay: (play: SavedPlay) => void;
  onDeletePlay: (playId: string) => void;
  onClose?: () => void;
}

declare function PlayLibrary(props: PlayLibraryProps): React.ReactElement;
export default PlayLibrary;
