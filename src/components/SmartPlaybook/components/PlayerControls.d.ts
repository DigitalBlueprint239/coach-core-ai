import React from 'react';

interface Player {
  id: string;
  position: string;
  number: number;
  x: number;
  y: number;
}

interface PlayerControlsProps {
  selectedPlayer?: Player | null;
  players: Player[];
  onUpdatePlayer: (updates: Partial<Pick<Player, 'position' | 'number'>>) => void;
  onDeletePlayer: () => void;
}

declare const PlayerControls: React.FC<PlayerControlsProps>;
export default PlayerControls;
