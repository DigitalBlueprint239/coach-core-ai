import React from 'react';

interface ToolbarProps {
  mode?: 'view' | 'player' | 'route' | 'delete';
  onModeChange: (mode: 'view' | 'player' | 'route' | 'delete') => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  undoStack?: unknown[];
  onClear: () => void;
  onShowHelp: () => void;
}

declare const Toolbar: React.FC<ToolbarProps>;
export default Toolbar;
