import React from 'react';

export interface SaveLoadPanelProps {
  currentPlayName: string;
  currentPlayPhase: string;
  currentPlayType: string;
  onPlayNameChange: React.Dispatch<React.SetStateAction<string>>;
  onPlayPhaseChange: React.Dispatch<React.SetStateAction<string>>;
  onPlayTypeChange: React.Dispatch<React.SetStateAction<string>>;
  onSave: () => void;
  onLoad: () => void;
  canSave?: boolean;
}

declare const SaveLoadPanel: React.MemoExoticComponent<(props: SaveLoadPanelProps) => React.ReactElement>;
export default SaveLoadPanel;
