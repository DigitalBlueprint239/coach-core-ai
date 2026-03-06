import React from 'react';

export interface ToolbarProps {
  mode?: string;
  onModeChange: React.Dispatch<React.SetStateAction<string>>;
  onUndo: () => void;
  onRedo: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  undoStack?: unknown[];
  onClear: () => void;
  onShowHelp: () => void;
}

declare const Toolbar: React.MemoExoticComponent<(props: ToolbarProps) => React.ReactElement>;
export default Toolbar;
