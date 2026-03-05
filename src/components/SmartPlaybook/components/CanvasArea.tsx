import React from 'react';
import Field from '../Field';

interface CanvasAreaProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  players: any[];
  routes: any[];
  onCanvasEvent: (e: any) => void;
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
