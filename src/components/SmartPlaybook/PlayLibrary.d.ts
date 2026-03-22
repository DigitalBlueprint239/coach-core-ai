import React from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface PlayLibraryProps {
  savedPlays: any[];
  onLoadPlay: (play: any) => void;
  onDeletePlay: (playId: string) => void;
  onClose?: () => void;
}

declare const PlayLibrary: React.FC<PlayLibraryProps>;
export default PlayLibrary;
