import React from 'react';

interface DebugPanelProps {
  results?: any[];
  onRunAll?: () => void;
  onTogglePassed?: () => void;
  showPassed?: boolean;
  className?: string;
  style?: React.CSSProperties;
  'data-testid'?: string;
}

declare const DebugPanel: React.MemoExoticComponent<React.FC<DebugPanelProps>>;
export default DebugPanel;
