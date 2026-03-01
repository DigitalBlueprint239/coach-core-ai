import { FC } from 'react';
declare const RouteControls: FC<{
  selectedPlayer: unknown;
  isDrawingRoute: boolean;
  routeType: string;
  routeColor: string;
  onStartDrawing: (playerId: string) => void;
  onFinishDrawing: () => void;
  onCancelDrawing: () => void;
  onRouteTypeChange: (type: string) => void;
  onRouteColorChange: (color: string) => void;
}>;
export default RouteControls;
