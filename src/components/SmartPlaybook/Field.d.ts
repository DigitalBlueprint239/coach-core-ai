import React from 'react';
declare const Field: React.ForwardRefExoticComponent<
  {
    players?: unknown[];
    routes?: unknown[];
    onCanvasEvent?: (e: React.MouseEvent | React.TouchEvent) => void;
    onPlayerDrag?: (id: string, x: number, y: number) => void;
  } & React.RefAttributes<HTMLCanvasElement>
>;
export default Field;
