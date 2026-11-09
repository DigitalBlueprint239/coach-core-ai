import React, { memo } from 'react';
import Field from '../Field';

interface CanvasAreaProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  players: any[];
  routes: any[];
  onCanvasEvent: (e: any) => void;
  onPlayerDrag: (id: string, x: number, y: number) => void;
  previewRoute?: any;
  selectedPlayerId?: string | null;
}

const CanvasArea: React.FC<CanvasAreaProps> = memo(({
  canvasRef,
  players,
  routes,
  onCanvasEvent,
  onPlayerDrag,
  previewRoute = null,
  selectedPlayerId = null
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <Field
        ref={canvasRef}
        players={players}
        routes={routes}
        onCanvasEvent={onCanvasEvent}
        onPlayerDrag={onPlayerDrag}
        previewRoute={previewRoute}
        selectedPlayerId={selectedPlayerId}
      />
    </div>
  );
});

CanvasArea.displayName = 'CanvasArea';

export default CanvasArea;
