import React from 'react';

export interface DebugResult {
  name: string;
  category: string;
  passed: boolean;
  duration: number;
}

export interface DebugPanelProps {
  results: DebugResult[];
  onRunAll: () => void;
  onTogglePassed: () => void;
  showPassed?: boolean;
}

declare const DebugPanel: React.MemoExoticComponent<(props: DebugPanelProps) => React.ReactElement>;
export default DebugPanel;
