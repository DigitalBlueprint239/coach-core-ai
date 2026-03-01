import { FC } from 'react';
declare const RouteEditor: FC<{
  selectedRoute: unknown;
  players: unknown[];
  onUpdateRoute: (routeId: string, updates: Record<string, unknown>) => void;
  onDeleteRoute: (routeId: string) => void;
  onApplyPreset: (routeId: string, preset: { id: string; points: { x: number; y: number }[] }) => void;
  onClearSelection: () => void;
}>;
export default RouteEditor;
