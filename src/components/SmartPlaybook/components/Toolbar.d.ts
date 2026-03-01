import { FC } from 'react';
declare const Toolbar: FC<{
  mode: string;
  onModeChange: (mode: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undoStack: unknown[];
  onClear: () => void;
  onShowHelp: () => void;
}>;
export default Toolbar;
