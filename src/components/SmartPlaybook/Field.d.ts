import React from 'react';

interface FieldProps {
  players?: Array<{ id: string; x: number; y: number; position: string; number: number; selected?: boolean }>;
  routes?: Array<{ id: string; playerId: string; points: Array<{ x: number; y: number }>; type: string; color?: string }>;
  onCanvasEvent?: (event: React.MouseEvent | React.TouchEvent) => void;
  onPlayerDrag?: (playerId: string, x: number, y: number) => void;
  onRouteSelect?: (routeId: string) => void;
  selectedRouteId?: string | null;
  width?: number;
  height?: number;
  mode?: string;
  debug?: boolean;
  className?: string;
  'data-testid'?: string;
}

declare const Field: React.ForwardRefExoticComponent<FieldProps & React.RefAttributes<HTMLCanvasElement>>;
export default Field;
