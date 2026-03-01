import { FC } from 'react';
declare const SaveLoadPanel: FC<{
  currentPlayName: string;
  currentPlayPhase: string;
  currentPlayType: string;
  onPlayNameChange: (name: string) => void;
  onPlayPhaseChange: (phase: string) => void;
  onPlayTypeChange: (type: string) => void;
  onSave: () => void;
  onLoad: () => void;
  canSave: boolean;
}>;
export default SaveLoadPanel;
