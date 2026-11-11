import React from 'react';

interface SelectedPlayer {
  id: string;
  position: string;
  number: number;
}

interface RouteControlsProps {
  selectedPlayer?: SelectedPlayer | null;
  isDrawingRoute: boolean;
  routeType: string;
  routeColor: string;
  onStartDrawing: (playerId: string) => void;
  onFinishDrawing: () => void;
  onCancelDrawing: () => void;
  onRouteTypeChange: (type: string) => void;
  onRouteColorChange: (color: string) => void;
}

declare const RouteControls: React.FC<RouteControlsProps>;
export default RouteControls;
