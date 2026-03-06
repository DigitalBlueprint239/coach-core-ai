import React from 'react';

export interface RouteControlsProps {
  selectedPlayer?: {
    id: string;
    x: number;
    y: number;
    position: string;
    number: number;
    selected?: boolean;
    [key: string]: unknown;
  };
  isDrawingRoute: boolean;
  routeType: string;
  routeColor: string;
  onStartDrawing: (playerId: string) => void;
  onFinishDrawing: () => void;
  onCancelDrawing: () => void;
  onRouteTypeChange: React.Dispatch<React.SetStateAction<string>>;
  onRouteColorChange: React.Dispatch<React.SetStateAction<string>>;
}

declare const RouteControls: React.MemoExoticComponent<(props: RouteControlsProps) => React.ReactElement>;
export default RouteControls;
