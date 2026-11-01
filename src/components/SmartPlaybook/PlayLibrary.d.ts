import React from 'react';

interface PlayLibraryProps {
  savedPlays: any[];
  onLoadPlay: (play: any) => void;
  onDeletePlay: (playId: string) => void;
  onClose?: () => void;
}

declare const PlayLibrary: React.FC<PlayLibraryProps>;
export default PlayLibrary;
