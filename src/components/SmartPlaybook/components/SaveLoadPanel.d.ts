import React from 'react';

interface SaveLoadPanelProps {
  currentPlayName: string;
  currentPlayPhase: string;
  currentPlayType: string;
  onPlayNameChange: (name: string) => void;
  onPlayPhaseChange: (phase: string) => void;
  onPlayTypeChange: (type: string) => void;
  onSave: () => void;
  onLoad: () => void;
  onNewPlay?: () => void;
  canSave?: boolean;
}

declare const SaveLoadPanel: React.FC<SaveLoadPanelProps>;
export default SaveLoadPanel;
