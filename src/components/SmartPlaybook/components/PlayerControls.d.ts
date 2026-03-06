import React from 'react';

export interface PlayerControlsProps {
  selectedPlayer?: {
    id: string;
    x: number;
    y: number;
    position: string;
    number: number;
    selected?: boolean;
    [key: string]: unknown;
  };
  players: unknown[];
  onUpdatePlayer: (updates: Record<string, unknown>) => void;
  onDeletePlayer: () => void;
}

declare const PlayerControls: React.MemoExoticComponent<(props: PlayerControlsProps) => React.ReactElement>;
export default PlayerControls;
