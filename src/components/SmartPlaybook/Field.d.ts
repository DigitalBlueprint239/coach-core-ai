import React from 'react';

export interface FieldProps {
  players?: unknown[];
  routes?: unknown[];
  onCanvasEvent?: (e: MouseEvent | TouchEvent) => void;
  onPlayerDrag?: (id: string, x: number, y: number) => void;
  [key: string]: unknown;
}

declare const Field: React.ForwardRefExoticComponent<FieldProps & React.RefAttributes<HTMLCanvasElement>>;
export default Field;
