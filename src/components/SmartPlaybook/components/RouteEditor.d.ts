import React from 'react';

interface RoutePoint {
  x: number;
  y: number;
}

interface RouteData {
  id: string;
  playerId: string;
  type: string;
  color?: string;
  points: RoutePoint[];
}

interface PresetRoute {
  id: string;
  name: string;
  points: RoutePoint[];
}

interface Player {
  id: string;
  position: string;
  number: number;
}

interface RouteEditorProps {
  selectedRoute?: RouteData | null;
  players: Player[];
  onUpdateRoute: (routeId: string, updates: Partial<Pick<RouteData, 'type' | 'color'>>) => void;
  onDeleteRoute: (routeId: string) => void;
  onApplyPreset: (routeId: string, preset: PresetRoute) => void;
  onClearSelection: () => void;
  onRouteHover?: (preset: PresetRoute) => void;
  onRouteLeave?: () => void;
}

declare const RouteEditor: React.FC<RouteEditorProps>;
export default RouteEditor;
