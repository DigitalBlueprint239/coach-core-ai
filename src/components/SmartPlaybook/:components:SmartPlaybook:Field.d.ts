import React from 'react';

export interface FieldProps {
  players?: unknown[];
  routes?: unknown[];
  onCanvasEvent?: (e: MouseEvent | TouchEvent) => void;
  onPlayerDrag?: (id: string, x: number, y: number) => void;
  onRouteSelect?: (id: unknown) => void;
  selectedRouteId?: string | null;
  width?: number;
  height?: number;
  mode?: string;
  debug?: boolean;
  className?: string;
  'data-testid'?: string;
  ref?: React.Ref<HTMLCanvasElement>;
  [key: string]: unknown;
}

declare const Field: React.MemoExoticComponent<(props: FieldProps) => React.ReactElement>;
export default Field;
