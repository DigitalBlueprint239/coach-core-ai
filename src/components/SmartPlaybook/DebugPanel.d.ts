import React from 'react';

interface DebugResult {
  id?: string | number;
  name: string;
  passed: boolean;
  category: string;
  duration?: number;
}

interface DebugPanelProps {
  results?: DebugResult[];
  onRunAll: () => void;
  onTogglePassed: () => void;
  showPassed?: boolean;
  className?: string;
  style?: React.CSSProperties;
  'data-testid'?: string;
}

declare const DebugPanel: React.FC<DebugPanelProps>;
export default DebugPanel;
