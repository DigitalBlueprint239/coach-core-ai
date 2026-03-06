import React from 'react';

export interface RouteEditorProps {
  selectedRoute?: {
    id: string;
    playerId: string;
    points: { x: number; y: number }[];
    type: string;
    color: string;
    [key: string]: unknown;
  };
  players: unknown[];
  onUpdateRoute: (routeId: string, updates: Record<string, unknown>) => void;
  onDeleteRoute: (routeId: string) => void;
  onApplyPreset: (routeId: string, preset: { id: string; points: { x: number; y: number }[] }) => void;
  onClearSelection: () => void;
}

declare const RouteEditor: React.MemoExoticComponent<(props: RouteEditorProps) => React.ReactElement>;
export default RouteEditor;
