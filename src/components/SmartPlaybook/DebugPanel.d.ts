import { FC } from 'react';
declare const DebugPanel: FC<{
  results: unknown[];
  onRunAll: () => void;
  onTogglePassed: () => void;
  showPassed: boolean;
}>;
export default DebugPanel;
