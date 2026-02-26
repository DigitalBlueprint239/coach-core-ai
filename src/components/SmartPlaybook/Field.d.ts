import React from 'react';

interface FieldProps {
  players?: any[];
  routes?: any[];
  onCanvasEvent?: (e: any) => void;
  onPlayerDrag?: (id: string, x: number, y: number) => void;
  onRouteSelect?: (id: string) => void;
  selectedRouteId?: string | null;
  width?: number;
  height?: number;
  mode?: string;
  debug?: boolean;
  className?: string;
  ref?: React.RefObject<HTMLCanvasElement | null>;
  'data-testid'?: string;
}

declare const Field: React.MemoExoticComponent<React.FC<FieldProps>>;
export default Field;
