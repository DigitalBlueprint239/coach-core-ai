import React from 'react';

interface PlayerData {
  id: string;
  x: number;
  y: number;
  position: string;
  number?: number;
  selected: boolean;
  createdAt: string;
}

interface RouteData {
  id: string;
  playerId: string;
  points: { x: number; y: number }[];
  type: string;
  color: string;
  createdAt: string;
}

// The Field component is a JS forwardRef module with canvas rendering
/* eslint-disable @typescript-eslint/no-var-requires */
const Field = require('../Field').default as React.ForwardRefExoticComponent<
  {
    players: PlayerData[];
    routes: RouteData[];
    onCanvasEvent: (e: React.MouseEvent | React.TouchEvent) => void;
    onPlayerDrag: (id: string, x: number, y: number) => void;
  } & React.RefAttributes<HTMLCanvasElement>
>;
/* eslint-enable @typescript-eslint/no-var-requires */

interface CanvasAreaProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  players: PlayerData[];
  routes: RouteData[];
  onCanvasEvent: (e: React.MouseEvent | React.TouchEvent) => void;
  onPlayerDrag: (id: string, x: number, y: number) => void;
}

const CanvasArea: React.FC<CanvasAreaProps> = ({
  canvasRef,
  players,
  routes,
  onCanvasEvent,
  onPlayerDrag
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <Field
        ref={canvasRef}
        players={players}
        routes={routes}
        onCanvasEvent={onCanvasEvent}
        onPlayerDrag={onPlayerDrag}
      />
    </div>
  );
};

export default CanvasArea;
